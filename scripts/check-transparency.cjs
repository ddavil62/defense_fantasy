/**
 * @fileoverview 타워/몬스터 에셋의 투명 배경 비율을 검사하는 스크립트.
 * 게임에서 사용되는 스프라이트는 배경이 투명해야 하므로,
 * 투명 픽셀 비율이 낮은 파일을 이상치로 보고한다.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function checkTransparency(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let transparentPixels = 0;
  let semiTransparentPixels = 0;

  // RGBA → 4바이트씩 읽기, alpha는 [3], [7], [11]...
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparentPixels++;
    else if (data[i] < 255) semiTransparentPixels++;
  }

  const transparentRatio = transparentPixels / totalPixels;
  const opaquePixels = totalPixels - transparentPixels - semiTransparentPixels;
  const opaqueRatio = opaquePixels / totalPixels;

  // 모서리 4곳 검사 (배경이 투명해야 함)
  const cornerPositions = [
    0,                                    // 좌상단
    (info.width - 1) * 4,               // 우상단
    (info.height - 1) * info.width * 4,  // 좌하단
    ((info.height - 1) * info.width + info.width - 1) * 4, // 우하단
  ];

  let opaqueCorners = 0;
  for (const pos of cornerPositions) {
    if (data[pos + 3] > 128) opaqueCorners++;
  }

  return {
    totalPixels,
    transparentPixels,
    transparentRatio,
    opaqueRatio,
    opaqueCorners,
  };
}

async function main() {
  const dirs = [
    { dir: path.resolve(__dirname, '../public/assets/tower'), label: '타워' },
    { dir: path.resolve(__dirname, '../public/assets/enemy'), label: '몬스터' },
  ];

  for (const { dir, label } of dirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
    console.log(`\n=== ${label} (${files.length}개) ===`);

    const results = [];

    for (const f of files) {
      const info = await checkTransparency(path.join(dir, f));
      results.push({ name: f, ...info });
    }

    // 투명 비율 기준 정렬 (낮은 순 = 문제 가능성 높은 순)
    results.sort((a, b) => a.transparentRatio - b.transparentRatio);

    // 이슈 보고: 투명 비율이 낮거나 모서리가 불투명한 파일
    const issues = results.filter(r => r.transparentRatio < 0.25 || r.opaqueCorners >= 3);
    const warnings = results.filter(r =>
      r.transparentRatio >= 0.25 && r.transparentRatio < 0.40 && r.opaqueCorners < 3
    );

    if (issues.length > 0) {
      console.log(`\n  ❌ 배경 투명도 부족 (투명<25% 또는 모서리 불투명):`);
      for (const r of issues) {
        console.log(`    ${r.name}: 투명 ${(r.transparentRatio * 100).toFixed(1)}% | 모서리 불투명 ${r.opaqueCorners}/4`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\n  ⚠️  경고 (투명 25~40%):`);
      for (const r of warnings) {
        console.log(`    ${r.name}: 투명 ${(r.transparentRatio * 100).toFixed(1)}% | 모서리 불투명 ${r.opaqueCorners}/4`);
      }
    }

    // 전체 통계
    const avgTransparency = results.reduce((s, r) => s + r.transparentRatio, 0) / results.length;
    console.log(`\n  📊 평균 투명 비율: ${(avgTransparency * 100).toFixed(1)}%`);
    console.log(`  이슈: ${issues.length}개 | 경고: ${warnings.length}개 | 정상: ${results.length - issues.length - warnings.length}개`);
  }
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
