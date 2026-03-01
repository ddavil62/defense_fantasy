/**
 * @fileoverview UI 이미지 에셋 일괄 생성 스크립트.
 * 스펙 문서(2026-03-01-ui-image-assets.md)에 정의된 46장의 UI 에셋을
 * OpenAI gpt-image-1.5 API로 생성한다.
 *
 * 사용법:
 *   node scripts/generate-ui-assets.cjs                  # 미생성 에셋만 생성
 *   node scripts/generate-ui-assets.cjs --force           # 전체 재생성
 *   node scripts/generate-ui-assets.cjs --category buttons # 버튼만
 *   node scripts/generate-ui-assets.cjs --dry-run         # 프롬프트 확인만
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const sharp = require('sharp');

// ── 설정 ──────────────────────────────────────────────────────────

const CONFIG = {
  model: 'gpt-image-1.5',
  quality: 'medium',
  concurrency: 1,
  requestDelay: 13000,   // 매 요청 사이 대기(ms) — 레이트 리밋 대응
  retryCount: 5,
  retryDelay: 15000,
  outBaseDir: path.resolve(__dirname, '../public/assets/ui'),
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 공통 스타일 프롬프트 ──────────────────────────────────────────

/** 모든 UI 에셋에 적용되는 기본 픽셀아트 스타일 지시 */
const PIXEL_STYLE = [
  'Pixel art game UI element for a dark fantasy tower defense game.',
  'Clean pixel art with stepped edges, no anti-aliasing, no blur, no smooth gradients.',
  'Dark medieval fantasy aesthetic with muted, rich tones.',
  'Single element centered on transparent background.',
  'No text, no letters, no words, no numbers on the element.',
  'No duplicate elements. One single UI piece only.',
].join(' ');

// ── 에셋 정의 (46장) ─────────────────────────────────────────────

const UI_ASSETS = [

  // ═════════════════════════════════════════════════════════════════
  // 대형 버튼 (160×44) — 9장
  // ═════════════════════════════════════════════════════════════════

  // Primary (Gold)
  {
    filename: 'btn_large_primary_normal.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame for main action. Golden amber and brass color palette (#c0a030). Ornate fantasy border with subtle carved rune engravings along edges. 1-2px dark outline. Bright gold highlight along top and left inner edges for raised bevel effect. Darker bronze shadow along bottom and right inner edges. Stone-metal hybrid texture fill. Beveled corners with 1px inward cuts. Idle/normal state. Approximately 4 times wider than tall.`,
  },
  {
    filename: 'btn_large_primary_pressed.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame in pressed/clicked state. Golden amber and brass, slightly darker overall than normal. Inverted bevel: dark shadow on top and left inner edges, subtle highlight on bottom and right. Surface appears pushed inward by 1 pixel. Same ornate rune border pattern. Approximately 4 times wider than tall.`,
  },

  // Meta (Purple)
  {
    filename: 'btn_large_meta_normal.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame. Deep royal purple and amethyst color (#6c3483). Ornate fantasy border with mystical crystal and arcane patterns. 1-2px dark outline. Bright purple highlight top/left edges (bevel up). Darker violet shadow bottom/right. Enchanted gemstone interior texture. Beveled corners. Normal/idle state. Approximately 4 times wider than tall.`,
  },
  {
    filename: 'btn_large_meta_pressed.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame, pressed state. Deep purple and amethyst, slightly darker. Inverted bevel: shadow top/left, highlight bottom/right. Same mystical crystal border. Approximately 4 times wider than tall.`,
  },

  // Back (Teal)
  {
    filename: 'btn_large_back_normal.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame. Dark emerald teal and jade color (#1a6b5e). Fantasy border with nature vine and leaf patterns carved into stone. 1-2px dark outline. Bright teal highlight top/left (bevel up). Darker green shadow bottom/right. Jade stone texture fill. Beveled corners. Normal/idle state. Approximately 4 times wider than tall.`,
  },
  {
    filename: 'btn_large_back_pressed.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame, pressed state. Dark teal and jade, slightly darker. Inverted bevel: shadow top/left, highlight bottom/right. Same vine border. Approximately 4 times wider than tall.`,
  },

  // Danger (Red)
  {
    filename: 'btn_large_danger_normal.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame. Dark crimson red and ruby color (#8b1a2e). Fantasy border with thorny barbed iron patterns. 1-2px dark outline. Bright red highlight top/left (bevel up). Darker blood red shadow bottom/right. Rough iron texture fill. Beveled corners. Normal/idle state. Approximately 4 times wider than tall.`,
  },
  {
    filename: 'btn_large_danger_pressed.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame, pressed state. Dark crimson, slightly darker. Inverted bevel: shadow top/left, highlight bottom/right. Same thorny iron border. Approximately 4 times wider than tall.`,
  },

  // Disabled (Gray)
  {
    filename: 'btn_large_disabled.png',
    dir: 'buttons', w: 160, h: 44,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame. Muted stone gray and faded iron (#4a4a5a). Worn-out, weathered fantasy border. Very subtle bevel with low contrast. Dull lifeless stone texture. Beveled corners. Disabled/inactive appearance. Approximately 4 times wider than tall.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 중형 버튼 (160×36) — 9장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'btn_medium_primary_normal.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide rectangular button frame, compact/slim height. Golden amber and brass (#c0a030). Ornate fantasy border with carved rune patterns, thinner decoration than large button. Gold highlight top/left, bronze shadow bottom/right. Stone-metal texture. Beveled corners. Normal state. Approximately 4.5 times wider than tall, very slim.`,
  },
  {
    filename: 'btn_medium_primary_pressed.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame, pressed state. Golden amber, slightly darker. Inverted bevel. Same rune border. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_back_normal.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame. Dark teal and jade (#1a6b5e). Nature vine border. Teal highlight top/left, dark shadow bottom/right. Jade texture. Normal state. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_back_pressed.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame, pressed state. Dark teal, slightly darker. Inverted bevel. Vine border. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_danger_normal.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame. Dark crimson and ruby (#8b1a2e). Thorny border pattern. Red highlight top/left, dark shadow bottom/right. Iron texture. Normal state. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_danger_pressed.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame, pressed state. Dark crimson, slightly darker. Inverted bevel. Thorny border. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_meta_normal.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame. Deep purple and amethyst (#6c3483). Crystal pattern border. Purple highlight top/left, violet shadow bottom/right. Gemstone texture. Normal state. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_meta_pressed.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame, pressed state. Deep purple, slightly darker. Inverted bevel. Crystal border. Approximately 4.5 times wider than tall.`,
  },
  {
    filename: 'btn_medium_disabled.png',
    dir: 'buttons', w: 160, h: 36,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide slim rectangular button frame. Muted gray, faded iron (#4a4a5a). Worn-out border, low contrast. Dull stone texture. Disabled state. Approximately 4.5 times wider than tall.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 소형 버튼 (80×26) — 5장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'btn_small_primary_normal.png',
    dir: 'buttons', w: 80, h: 26,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Small compact rectangular button frame. Golden amber and brass (#c0a030). Simple fantasy border with subtle carved detail. Gold highlight top/left, bronze shadow bottom/right. Beveled corners. Normal state. About 3 times wider than tall, small and compact.`,
  },
  {
    filename: 'btn_small_primary_pressed.png',
    dir: 'buttons', w: 80, h: 26,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Small compact rectangular button frame, pressed state. Golden amber, slightly darker. Inverted bevel. Simple border. About 3 times wider than tall.`,
  },
  {
    filename: 'btn_small_back_normal.png',
    dir: 'buttons', w: 80, h: 26,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Small compact rectangular button frame. Dark teal and jade (#1a6b5e). Simple vine border. Teal highlight top/left, shadow bottom/right. Normal state. About 3 times wider than tall.`,
  },
  {
    filename: 'btn_small_back_pressed.png',
    dir: 'buttons', w: 80, h: 26,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Small compact rectangular button frame, pressed state. Dark teal, slightly darker. Inverted bevel. About 3 times wider than tall.`,
  },
  {
    filename: 'btn_small_disabled.png',
    dir: 'buttons', w: 80, h: 26,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Small compact rectangular button frame. Muted gray (#4a4a5a). Worn border, low contrast. Disabled state. About 3 times wider than tall.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 패널 배경 — 5장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'panel_result.png',
    dir: 'panels', w: 280, h: 420,
    genSize: '1024x1536',
    prompt: `${PIXEL_STYLE} Large vertical rectangular panel/dialog frame for displaying game results. Very dark navy-purple background (#0a0820). Ornate golden border frame with decorative corner pieces featuring fantasy rune symbols. 2-3px thick golden border lines. Interior has subtle dark stone texture. Tall portrait orientation, about 1.5 times taller than wide. Medieval scroll inspired but dark themed.`,
  },
  {
    filename: 'panel_pause.png',
    dir: 'panels', w: 220, h: 260,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Medium rectangular panel/dialog frame for pause menu. Very dark navy background (#05050f). Ornate golden border frame with decorative corner pieces. 2px golden border. Interior dark stone texture. Slightly taller than wide, close to square. Medieval dark fantasy style.`,
  },
  {
    filename: 'panel_world_card.png',
    dir: 'panels', w: 320, h: 88,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide horizontal card panel for world selection. Dark navy background (#0a0820). Golden ornate border frame with subtle corner decorations. Clean interior with subtle texture for text overlay. Approximately 3.5 times wider than tall. Fantasy map card style.`,
  },
  {
    filename: 'panel_level_card.png',
    dir: 'panels', w: 320, h: 86,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide horizontal card panel for level selection. Dark navy background (#0a0820). Slightly thinner golden border than world card. Clean interior with subtle parchment-like texture. Approximately 3.7 times wider than tall. Fantasy quest card style.`,
  },
  {
    filename: 'panel_info_overlay.png',
    dir: 'panels', w: 300, h: 360,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Tall vertical panel/overlay frame for tower information display. Dark navy-purple background (#1a1040). Golden ornate border with decorative top header area. 2px golden border lines. Interior dark with subtle grid/codex texture. Slightly taller than wide. Medieval codex book page inspired.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // HUD / 타워패널 프레임 — 7장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'hud_bar_bg.png',
    dir: 'hud', w: 360, h: 40,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Very wide thin horizontal bar frame for game HUD at top of screen. Very dark navy purple (#12122a). Subtle metallic border on bottom edge. Slight vertical gradient darker at top. Ornate thin decorative golden line along bottom edge. Extremely wide and very short, about 9 times wider than tall. Dark fantasy metal panel.`,
  },
  {
    filename: 'tower_panel_bg.png',
    dir: 'hud', w: 360, h: 120,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Wide horizontal panel frame for tower selection toolbar at bottom of screen. Dark navy-purple (#1a1040). Ornate golden decorative line along top edge. Subtle stone texture interior. About 3 times wider than tall. Dark fantasy command toolbar aesthetic.`,
  },
  {
    filename: 'tower_slot_normal.png',
    dir: 'hud', w: 40, h: 40,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small square slot/socket frame for placing tower icons. Dark stone-metal frame with subtle inner bevel. Dark navy interior (#0a0820). 1px lighter highlight on top and left edges, darker shadow on bottom and right. Simple but elegant square frame. Perfect square proportions.`,
  },
  {
    filename: 'tower_slot_selected.png',
    dir: 'hud', w: 40, h: 40,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small square slot/socket frame, selected/active state. Bright golden border glow (#c0a030, #ffd700). Slightly brighter interior than normal. Prominent golden selection highlight around all edges. Magical energy glow effect. Perfect square.`,
  },
  {
    filename: 'tower_slot_locked.png',
    dir: 'hud', w: 40, h: 40,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small square slot/socket frame, locked/unavailable state. Dark muted gray frame (#4a4a5a). Very dark interior. Faded weathered appearance. Cracked worn stone texture suggesting locked/unavailable. Low contrast. Perfect square.`,
  },
  {
    filename: 'slot_action_normal.png',
    dir: 'hud', w: 32, h: 32,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small square action button frame. Dark stone with subtle metallic edge. Simple 1px bevel (highlight top/left, shadow bottom/right). Clean dark interior for icon overlay. Compact and minimal. Perfect square.`,
  },
  {
    filename: 'slot_action_pressed.png',
    dir: 'hud', w: 32, h: 32,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small square action button frame, pressed state. Dark stone, slightly darker overall. Inverted bevel (shadow top/left, highlight bottom/right). Pushed inward appearance. Compact. Perfect square.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 미니 슬롯 — 2장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'slot_mini_normal.png',
    dir: 'hud', w: 24, h: 24,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Tiny square slot frame for consumable ability button. Dark purple-tinted frame (#6c3483). Very simple 1px border with subtle bevel. Dark interior. Miniature, very compact. Perfect square. Magical mystical feel with faint arcane glow.`,
  },
  {
    filename: 'slot_mini_pressed.png',
    dir: 'hud', w: 24, h: 24,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Tiny square slot frame for consumable, pressed state. Dark purple, slightly darker. Inverted bevel. Pushed inward. Very compact. Perfect square.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 장식 요소 — 3장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'divider_gold.png',
    dir: 'decorations', w: 280, h: 8,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Horizontal decorative divider/separator line. Golden ornate line with small diamond shapes at center and ends. Fantasy rune flourishes. Very thin, about 3-4 pixels tall conceptually. Extremely wide. Dark fantasy golden separator. Only the line itself, no background panel.`,
  },
  {
    filename: 'divider_header.png',
    dir: 'decorations', w: 360, h: 4,
    genSize: '1536x1024',
    prompt: `${PIXEL_STYLE} Very thin horizontal header separator line. Golden color with subtle glow, brighter at center fading to edges. 1-2 pixels tall conceptually. Extremely wide. Simple elegant golden dividing line. Minimal decoration.`,
  },
  {
    filename: 'corner_deco.png',
    dir: 'decorations', w: 16, h: 16,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small corner decoration piece for panel frames. Golden fantasy ornamental corner flourish. L-shaped decorative element for top-left corner of rectangular panel. Intricate tiny scroll or Celtic knot design in gold. Small and detailed. Square image with the decoration in the top-left corner area.`,
  },

  // ═════════════════════════════════════════════════════════════════
  // 아이콘 — 6장
  // ═════════════════════════════════════════════════════════════════

  {
    filename: 'icon_diamond.png',
    dir: 'icons', w: 16, h: 16,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art diamond gemstone icon. Brilliant purple amethyst gem (#9b59b6). Classic diamond/rhombus shape with faceted crystal facets showing light reflections. Clear gem silhouette against transparent background. 16x16 pixel concept, large zoomed-in pixels visible. Single small gemstone.`,
  },
  {
    filename: 'icon_heart.png',
    dir: 'icons', w: 16, h: 16,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art heart icon for HP/health. Bright red heart shape (#e74c3c). Classic heart silhouette with subtle shading: brighter highlight top-left, darker shadow bottom-right. 16x16 pixel concept with large visible pixels. Single heart.`,
  },
  {
    filename: 'icon_sword.png',
    dir: 'icons', w: 16, h: 16,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art crossed swords icon for battle/wave indicator. Two silver/steel swords crossed in X pattern. Fantasy medieval sword design with metallic blade and golden hilt/crossguard. 16x16 pixel concept. Single icon of two crossed swords.`,
  },
  {
    filename: 'icon_star_filled.png',
    dir: 'icons', w: 20, h: 20,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art filled star icon. Bright golden yellow 5-pointed star, fully solid/filled. Subtle shading from bright center to slightly darker outer edges. Achievement/rating star for game UI. 20x20 pixel concept. Single golden star.`,
  },
  {
    filename: 'icon_star_empty.png',
    dir: 'icons', w: 20, h: 20,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art empty/outline star icon. Golden yellow 5-pointed star outline only. Hollow/unfilled center showing transparent background through the middle. 1-2px outline thickness. Rating placeholder star. 20x20 pixel concept. Single star outline.`,
  },
  {
    filename: 'icon_lock.png',
    dir: 'icons', w: 20, h: 20,
    genSize: '1024x1024',
    prompt: `${PIXEL_STYLE} Small pixel art padlock/lock icon. Gray iron padlock (#636e72). Classic lock shape with rectangular body and rounded shackle on top. Metallic texture with visible keyhole. Locked state. 20x20 pixel concept. Single padlock icon.`,
  },
];

// ── 이미지 생성 ───────────────────────────────────────────────────

/**
 * OpenAI API로 UI 이미지를 생성하고, 투명 영역 트림 후 리사이즈하여 저장한다.
 * @param {object} task - 에셋 정의 객체
 * @param {boolean} force - 기존 파일 덮어쓰기
 * @returns {Promise<object>} 결과 객체
 */
async function generateImage(task, force = false) {
  const outDir = path.join(CONFIG.outBaseDir, task.dir);
  const outPath = path.join(outDir, task.filename);

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
        size: task.genSize || '1024x1024',
        quality: CONFIG.quality,
        background: 'transparent',
        output_format: 'png',
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

      // 투명 영역 트림 후 리사이즈
      try {
        await sharp(buffer)
          .trim()
          .resize(task.w, task.h, {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3,
          })
          .png()
          .toFile(outPath);
      } catch (trimErr) {
        // trim 실패 시 트림 없이 리사이즈
        console.warn(`  ⚠️  ${task.filename} trim 실패, 직접 리사이즈: ${trimErr.message}`);
        await sharp(buffer)
          .resize(task.w, task.h, {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3,
          })
          .png()
          .toFile(outPath);
      }

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
 * @param {Array} tasks - 태스크 배열
 * @param {number} concurrency - 동시 실행 수
 * @param {Function} fn - 태스크 처리 함수
 */
async function batchRun(tasks, concurrency, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      const result = await fn(tasks[i]);
      results.push(result);

      const done = results.length;
      const total = tasks.length;
      const pct = Math.round((done / total) * 100);
      const icon = result.success ? (result.skipped ? '⏭️' : '✅') : '❌';
      console.log(`  ${icon} [${done}/${total} ${pct}%] ${tasks[i].dir}/${tasks[i].filename}${result.error ? ' — ' + result.error : ''}`);

      // 레이트 리밋 대응: 실제 API 호출 후에만 대기
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
  const catFilter = args.includes('--category')
    ? args[args.indexOf('--category') + 1]
    : null;

  console.log('🎨 Fantasy TD — UI 에셋 생성기');
  console.log(`   모델: ${CONFIG.model} | 품질: ${CONFIG.quality}`);
  console.log(`   강제 재생성: ${force} | 드라이런: ${dryRun}`);
  if (catFilter) console.log(`   카테고리 필터: ${catFilter}`);
  console.log('');

  // 카테고리 필터 적용
  let tasks = UI_ASSETS;
  if (catFilter) {
    tasks = tasks.filter(t => t.dir === catFilter);
  }

  // 카테고리별 수량 표시
  const categories = {};
  for (const t of tasks) {
    categories[t.dir] = (categories[t.dir] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`📦 ${cat}: ${count}장`);
  }
  console.log(`\n📊 총 ${tasks.length}장 대상\n`);

  if (dryRun) {
    console.log('── 드라이런 결과 (프롬프트 목록) ──\n');
    for (const t of tasks) {
      console.log(`[${t.dir}] ${t.filename} (${t.w}×${t.h})`);
      console.log(`  생성 크기: ${t.genSize || '1024x1024'}`);
      console.log(`  ${t.prompt.substring(0, 120)}...`);
      console.log('');
    }
    return;
  }

  if (tasks.length === 0) {
    console.log('생성할 에셋이 없습니다.');
    return;
  }

  // 출력 디렉토리 생성
  const dirs = new Set(tasks.map(t => path.join(CONFIG.outBaseDir, t.dir)));
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 디렉토리 생성: ${dir}`);
    }
  }

  // 스킵 예정 수 확인
  if (!force) {
    const existing = tasks.filter(t =>
      fs.existsSync(path.join(CONFIG.outBaseDir, t.dir, t.filename))
    );
    if (existing.length > 0) {
      console.log(`⏭️  이미 존재하는 파일 ${existing.length}개 스킵 예정`);
    }
  }

  // 예상 비용 계산
  const newCount = force
    ? tasks.length
    : tasks.filter(t => !fs.existsSync(path.join(CONFIG.outBaseDir, t.dir, t.filename))).length;
  const costPerImage = 0.027;  // gpt-image-1.5 medium 기준 근사 (20% 저렴)
  console.log(`💰 예상 비용: ~$${(newCount * costPerImage).toFixed(2)} (${newCount}장 × ~$${costPerImage})\n`);

  console.log('🚀 생성 시작...\n');
  const startTime = Date.now();

  const results = await batchRun(tasks, CONFIG.concurrency, (task) => generateImage(task, force));

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
