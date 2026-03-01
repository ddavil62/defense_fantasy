/**
 * @fileoverview AI 이미지 일괄 생성 스크립트.
 * ART_STYLE_GUIDE.md와 monster-art-guide.md에서 프롬프트를 파싱하여
 * OpenAI gpt-image-1 API로 이미지를 생성하고, 리사이즈 후 저장한다.
 *
 * 사용법:
 *   node scripts/generate-assets.js                  # 미생성 에셋만 생성
 *   node scripts/generate-assets.js --force           # 전체 재생성
 *   node scripts/generate-assets.js --type tower      # 타워만
 *   node scripts/generate-assets.js --type bg         # 배경만
 *   node scripts/generate-assets.js --type enemy      # 몬스터만
 *   node scripts/generate-assets.js --dry-run         # 프롬프트 파싱만 (API 호출 안 함)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const sharp = require('sharp');

// ── 설정 ──────────────────────────────────────────────────────────

const CONFIG = {
  model: 'gpt-image-1',
  quality: 'medium',
  tower: {
    size: '1024x1024',
    storeWidth: 128,
    storeHeight: 128,
    outDir: path.resolve(__dirname, '../public/assets/tower'),
  },
  bg: {
    size: '1024x1536',
    storeWidth: 360,
    storeHeight: 520,
    outDir: path.resolve(__dirname, '../public/assets/bg'),
  },
  enemy: {
    size: '1024x1024',
    storeWidth: 128,
    storeHeight: 128,
    outDir: path.resolve(__dirname, '../public/assets/enemy'),
  },
  concurrency: 1,       // 동시 API 호출 수 (레이트 리밋 대응)
  requestDelay: 13000,   // 매 요청 사이 대기(ms) — 분당 5장 제한 대응
  retryCount: 5,         // 실패 시 재시도 횟수
  retryDelay: 15000,     // 재시도 대기(ms)
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 프롬프트 파싱 ─────────────────────────────────────────────────

/**
 * ART_STYLE_GUIDE.md에서 타워 프롬프트를 파싱한다.
 * @returns {{ filename: string, prompt: string, type: string }[]}
 */
function parseTowerPrompts() {
  const mdPath = path.resolve(__dirname, '../docs/ART_STYLE_GUIDE.md');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const results = [];

  // T1 타워: "#### Archer" ~ "#### Dragon" 패턴
  // T2~T5 타워: "##### Name (한국어)" 패턴
  // 코드블록 안의 프롬프트를 추출
  const regex = /#{4,5}\s+(.+?)\r?\n```\r?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const header = match[1].trim();
    const prompt = match[2].trim();

    // 배경 프롬프트는 제외 (배경은 별도 파싱)
    if (header.includes('Forest') && prompt.includes('game background')) continue;
    if (header.includes('Desert') && prompt.includes('game background')) continue;
    if (header.includes('Tundra') && prompt.includes('game background')) continue;
    if (header.includes('Volcano') && prompt.includes('game background')) continue;
    if (header.includes('Shadow') && prompt.includes('game background')) continue;

    // 기본 프롬프트 구조 템플릿도 제외
    if (prompt.includes('[타워 설명]') || prompt.includes('[월드 지형 묘사]')) continue;

    // 파일명 결정: T1은 "1. Archer (궁수)" 또는 "Archer" 패턴
    // T2~T5는 "Rapid Archer (연속 사격수)" 패턴 → ID로 변환
    let filename;
    const t1Match = header.match(/^\d+\.\s+(\w+)/);
    if (t1Match) {
      filename = t1Match[1] + '.png';
    } else {
      // T2~T5: 영어 이름에서 파일명 생성
      const nameMatch = header.match(/^([A-Za-z\s]+)/);
      if (nameMatch) {
        // "Rapid Archer" → "rapid_archer", "Void Maelstrom" → "void_maelstrom"
        filename = nameMatch[1].trim().toLowerCase().replace(/\s+/g, '_') + '.png';
      } else {
        continue;
      }
    }

    // T1은 이미 존재하므로 제외
    const t1Names = ['Archer', 'Mage', 'Ice', 'Lightning', 'Flame', 'Rock', 'Poison', 'Wind', 'Light', 'Dragon'];
    const baseName = path.basename(filename, '.png');
    const isT1 = t1Names.some(n => n.toLowerCase() === baseName.toLowerCase());
    if (isT1) continue;

    results.push({ filename, prompt, type: 'tower' });
  }

  return results;
}

/**
 * ART_STYLE_GUIDE.md에서 배경 프롬프트를 파싱한다.
 * @returns {{ filename: string, prompt: string, type: string }[]}
 */
function parseBgPrompts() {
  const mdPath = path.resolve(__dirname, '../docs/ART_STYLE_GUIDE.md');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const results = [];

  // "#### Forest (숲)" 등 배경 프롬프트 섹션에서 코드블록 추출
  const bgSection = content.split('### 배경 프롬프트')[1];
  if (!bgSection) return results;

  const worldMap = {
    'Forest': 'bg_forest.png',
    'Desert': 'bg_desert.png',
    'Tundra': 'bg_tundra.png',
    'Volcano': 'bg_volcano.png',
    'Shadow': 'bg_shadow.png',
  };

  const regex = /####\s+(\w+)[^\n]*\r?\n```\r?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(bgSection)) !== null) {
    const worldName = match[1].trim();
    const prompt = match[2].trim();

    // 기본 구조 템플릿 제외
    if (prompt.includes('[월드 지형 묘사]')) continue;

    const filename = worldMap[worldName];
    if (filename) {
      results.push({ filename, prompt, type: 'bg' });
    }
  }

  return results;
}

/**
 * monster-art-guide.md에서 몬스터 프롬프트를 파싱한다.
 * @returns {{ filename: string, prompt: string, type: string }[]}
 */
function parseEnemyPrompts() {
  const mdPath = path.resolve(__dirname, '../docs/monster-art-guide.md');
  if (!fs.existsSync(mdPath)) {
    console.warn('⚠️  monster-art-guide.md 파일 없음, 몬스터 스킵');
    return [];
  }

  const content = fs.readFileSync(mdPath, 'utf-8');
  const results = [];

  // "### forest_goblin.png" + "> prompt" 패턴
  const regex = /###\s+(\w+\.png)\s*\r?\n>\s*([\s\S]*?)(?=\r?\n###|\r?\n---|\r?\n## |\n$)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const filename = match[1].trim();
    const prompt = match[2].trim();
    results.push({ filename, prompt, type: 'enemy' });
  }

  return results;
}

// ── 이미지 생성 ───────────────────────────────────────────────────

/**
 * OpenAI API로 이미지를 생성하고 리사이즈 후 저장한다.
 * @param {{ filename: string, prompt: string, type: string }} task
 * @param {boolean} force - 기존 파일 덮어쓰기
 * @returns {Promise<{ success: boolean, filename: string, error?: string }>}
 */
async function generateImage(task, force = false) {
  const cfg = CONFIG[task.type];
  const outPath = path.join(cfg.outDir, task.filename);

  // 이미 존재하면 스킵
  if (!force && fs.existsSync(outPath)) {
    return { success: true, filename: task.filename, skipped: true };
  }

  for (let attempt = 0; attempt <= CONFIG.retryCount; attempt++) {
    try {
      const response = await client.images.generate({
        model: CONFIG.model,
        prompt: task.prompt,
        n: 1,
        size: cfg.size,
        quality: CONFIG.quality,
      });

      // base64 또는 URL에서 이미지 데이터 가져오기
      const imageData = response.data[0];
      let buffer;

      if (imageData.b64_json) {
        buffer = Buffer.from(imageData.b64_json, 'base64');
      } else if (imageData.url) {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(imageData.url);
        buffer = Buffer.from(await res.arrayBuffer());
      } else {
        throw new Error('이미지 데이터 없음');
      }

      // 리사이즈 후 저장
      await sharp(buffer)
        .resize(cfg.storeWidth, cfg.storeHeight, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toFile(outPath);

      return { success: true, filename: task.filename };
    } catch (err) {
      const isLast = attempt === CONFIG.retryCount;
      if (isLast) {
        return { success: false, filename: task.filename, error: err.message };
      }
      console.warn(`  ⚠️  ${task.filename} 재시도 ${attempt + 1}/${CONFIG.retryCount}: ${err.message}`);
      await sleep(CONFIG.retryDelay);
    }
  }
}

// ── 유틸리티 ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 동시성 제한 배치 실행.
 * @param {Array} tasks
 * @param {number} concurrency
 * @param {Function} fn
 */
async function batchRun(tasks, concurrency, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      const result = await fn(tasks[i]);
      results.push(result);

      // 진행률 표시
      const done = results.length;
      const total = tasks.length;
      const pct = Math.round((done / total) * 100);
      const icon = result.success ? (result.skipped ? '⏭️' : '✅') : '❌';
      console.log(`  ${icon} [${done}/${total} ${pct}%] ${tasks[i].filename}${result.error ? ' — ' + result.error : ''}`);

      // 레이트 리밋 대응: 스킵이 아닌 실제 API 호출 후에만 대기
      if (!result.skipped && idx < tasks.length && CONFIG.requestDelay > 0) {
        await sleep(CONFIG.requestDelay);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── 메인 ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const typeFilter = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;

  console.log('🎨 Fantasy TD 에셋 일괄 생성기');
  console.log(`   모델: ${CONFIG.model} | 품질: ${CONFIG.quality}`);
  console.log(`   강제 재생성: ${force} | 드라이런: ${dryRun}`);
  if (typeFilter) console.log(`   필터: ${typeFilter}만`);
  console.log('');

  // 프롬프트 파싱
  let allTasks = [];

  if (!typeFilter || typeFilter === 'tower') {
    const towers = parseTowerPrompts();
    console.log(`📦 타워 T2~T5: ${towers.length}종 파싱 완료`);
    allTasks.push(...towers);
  }

  if (!typeFilter || typeFilter === 'bg') {
    const bgs = parseBgPrompts();
    console.log(`🏞️  배경: ${bgs.length}종 파싱 완료`);
    allTasks.push(...bgs);
  }

  if (!typeFilter || typeFilter === 'enemy') {
    const enemies = parseEnemyPrompts();
    console.log(`👾 몬스터: ${enemies.length}종 파싱 완료`);
    allTasks.push(...enemies);
  }

  console.log(`\n📊 총 ${allTasks.length}종 대상\n`);

  if (dryRun) {
    console.log('── 드라이런 결과 (프롬프트 목록) ──\n');
    for (const t of allTasks) {
      console.log(`[${t.type}] ${t.filename}`);
      console.log(`  ${t.prompt.substring(0, 100)}...`);
      console.log('');
    }
    return;
  }

  if (allTasks.length === 0) {
    console.log('생성할 에셋이 없습니다.');
    return;
  }

  // 출력 디렉토리 생성
  for (const type of ['tower', 'bg', 'enemy']) {
    const dir = CONFIG[type].outDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 디렉토리 생성: ${dir}`);
    }
  }

  // 스킵할 파일 수 미리 확인
  if (!force) {
    const existing = allTasks.filter(t => {
      const cfg = CONFIG[t.type];
      return fs.existsSync(path.join(cfg.outDir, t.filename));
    });
    if (existing.length > 0) {
      console.log(`⏭️  이미 존재하는 파일 ${existing.length}개 스킵 예정`);
    }
  }

  // 예상 비용 계산
  const newCount = force
    ? allTasks.length
    : allTasks.filter(t => !fs.existsSync(path.join(CONFIG[t.type].outDir, t.filename))).length;
  const estimatedCost = newCount * 0.034; // medium 기준 근사
  console.log(`💰 예상 비용: ~$${estimatedCost.toFixed(2)} (${newCount}장 × ~$0.034)\n`);

  console.log('🚀 생성 시작...\n');
  const startTime = Date.now();

  const results = await batchRun(allTasks, CONFIG.concurrency, (task) => generateImage(task, force));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const succeeded = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n══════════════════════════════════════');
  console.log(`✅ 성공: ${succeeded}장`);
  console.log(`⏭️  스킵: ${skipped}장`);
  console.log(`❌ 실패: ${failed}장`);
  console.log(`⏱️  소요: ${elapsed}초`);
  console.log('══════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ 실패 목록:');
    for (const r of results.filter(r => !r.success)) {
      console.log(`  - ${r.filename}: ${r.error}`);
    }
  }
}

main().catch(err => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});
