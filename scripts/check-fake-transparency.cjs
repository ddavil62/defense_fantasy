/**
 * @fileoverview 가짜 투명 배경(체커보드 패턴) 탐지 스크립트.
 * AI 이미지 생성기가 실제 alpha=0 대신 회색/흰색 체커보드를 그리는 경우를 감지한다.
 *
 * 검사 항목:
 * 1. 모서리 16px 영역의 alpha 값 분석
 * 2. 체커보드 패턴(회/백 교차) 탐지
 * 3. 실제 투명 픽셀(alpha=0) vs 반투명(0<alpha<255) vs 불투명(alpha=255) 비율
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 이미지의 투명도를 정밀 분석한다.
 * @param {string} filePath
 */
async function analyzeTransparency(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const total = w * h;

  // 전체 alpha 분포
  let fullyTransparent = 0;   // alpha === 0
  let semiTransparent = 0;    // 0 < alpha < 255
  let fullyOpaque = 0;        // alpha === 255

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) fullyTransparent++;
    else if (data[i] === 255) fullyOpaque++;
    else semiTransparent++;
  }

  // 모서리 영역(각 코너 8x8 = 64px) alpha 분석
  const cornerSize = 8;
  const corners = [
    { name: '좌상', sx: 0, sy: 0 },
    { name: '우상', sx: w - cornerSize, sy: 0 },
    { name: '좌하', sx: 0, sy: h - cornerSize },
    { name: '우하', sx: w - cornerSize, sy: h - cornerSize },
  ];

  const cornerResults = [];
  for (const c of corners) {
    let transparent = 0;
    let opaque = 0;
    let semi = 0;
    const rgbValues = [];

    for (let y = c.sy; y < c.sy + cornerSize; y++) {
      for (let x = c.sx; x < c.sx + cornerSize; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];

        if (a === 0) transparent++;
        else if (a === 255) {
          opaque++;
          rgbValues.push({ r, g, b });
        }
        else semi++;
      }
    }

    // 체커보드 패턴 탐지: 불투명 픽셀이 회색~흰색 계열이 교차하는지
    let checkerboardScore = 0;
    if (rgbValues.length > 10) {
      const grays = rgbValues.filter(v =>
        Math.abs(v.r - v.g) < 15 && Math.abs(v.g - v.b) < 15
      );
      const grayRatio = grays.length / rgbValues.length;

      // 회색 계열이 80% 이상이면 체커보드 의심
      if (grayRatio > 0.8) {
        // 밝기 분산 체크: 체커보드면 2가지 밝기가 교차
        const brightnesses = grays.map(v => (v.r + v.g + v.b) / 3);
        const uniqueBright = new Set(brightnesses.map(b => Math.round(b / 10) * 10));
        if (uniqueBright.size >= 2 && uniqueBright.size <= 4) {
          checkerboardScore = grayRatio;
        }
      }
    }

    cornerResults.push({
      name: c.name,
      transparent,
      opaque,
      semi,
      total: cornerSize * cornerSize,
      checkerboardScore,
    });
  }

  // 가장자리 1px 테두리 alpha 분석
  let borderTransparent = 0;
  let borderTotal = 0;
  for (let x = 0; x < w; x++) {
    // 상단
    if (data[(x) * 4 + 3] === 0) borderTransparent++;
    borderTotal++;
    // 하단
    if (data[((h - 1) * w + x) * 4 + 3] === 0) borderTransparent++;
    borderTotal++;
  }
  for (let y = 1; y < h - 1; y++) {
    // 좌측
    if (data[(y * w) * 4 + 3] === 0) borderTransparent++;
    borderTotal++;
    // 우측
    if (data[(y * w + w - 1) * 4 + 3] === 0) borderTransparent++;
    borderTotal++;
  }

  return {
    fullyTransparent,
    semiTransparent,
    fullyOpaque,
    total,
    transparentRatio: fullyTransparent / total,
    borderTransparentRatio: borderTransparent / borderTotal,
    corners: cornerResults,
    hasCheckerboard: cornerResults.some(c => c.checkerboardScore > 0.5),
    hasFakeTransparency: cornerResults.every(c => c.transparent === 0) && fullyTransparent === 0,
  };
}

async function main() {
  const dirs = [
    { dir: path.resolve(__dirname, '../public/assets/tower'), label: '타워' },
    { dir: path.resolve(__dirname, '../public/assets/enemy'), label: '몬스터' },
  ];

  const allIssues = [];

  for (const { dir, label } of dirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${label} (${files.length}개) — 가짜 투명 배경 검사`);
    console.log(`${'='.repeat(60)}`);

    let fakeCount = 0;
    let checkerCount = 0;
    let noBorderTransCount = 0;

    for (const f of files) {
      const result = await analyzeTransparency(path.join(dir, f));

      const issues = [];

      // 1) 투명 픽셀이 아예 없음 = 완전 불투명 이미지
      if (result.fullyTransparent === 0) {
        issues.push('❌ 투명 픽셀 0개 (완전 불투명)');
        fakeCount++;
      }

      // 2) 체커보드 패턴 감지
      if (result.hasCheckerboard) {
        issues.push('🏁 체커보드 패턴 감지');
        checkerCount++;
      }

      // 3) 테두리가 전혀 투명하지 않음
      if (result.borderTransparentRatio < 0.1 && result.fullyTransparent > 0) {
        issues.push(`⚠️  테두리 투명 ${(result.borderTransparentRatio * 100).toFixed(1)}%`);
        noBorderTransCount++;
      }

      // 4) 모서리 4곳 모두 불투명
      const allCornersOpaque = result.corners.every(c => c.transparent === 0);
      if (allCornersOpaque && result.fullyTransparent > 0) {
        issues.push('⚠️  모서리 전부 불투명');
      }

      if (issues.length > 0) {
        console.log(`\n  📄 ${f}`);
        console.log(`     투명: ${(result.transparentRatio * 100).toFixed(1)}% | ` +
          `테두리 투명: ${(result.borderTransparentRatio * 100).toFixed(1)}% | ` +
          `alpha분포: 0=${result.fullyTransparent}, 중간=${result.semiTransparent}, 255=${result.fullyOpaque}`);
        for (const issue of issues) {
          console.log(`     ${issue}`);
        }
        allIssues.push({ file: `${label}/${f}`, issues });
      }
    }

    console.log(`\n  📊 요약: 완전불투명=${fakeCount} | 체커보드=${checkerCount} | 테두리불투명=${noBorderTransCount} | 정상=${files.length - fakeCount}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  종합 결과`);
  console.log(`${'='.repeat(60)}`);

  if (allIssues.length === 0) {
    console.log('\n  ✅ 가짜 투명 배경 없음! 모든 에셋이 실제 alpha 투명도를 사용합니다.');
  } else {
    console.log(`\n  총 ${allIssues.length}개 파일에서 이슈 발견:`);
    for (const i of allIssues) {
      console.log(`    - ${i.file}: ${i.issues.join(' | ')}`);
    }
  }
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
