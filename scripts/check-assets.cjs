/**
 * @fileoverview 생성된 에셋 파일의 해상도, 포맷, 파일 크기 일관성을 검증하는 스크립트.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function checkAll() {
  const dirs = [
    { dir: path.resolve(__dirname, '../public/assets/tower'), expectedW: 128, expectedH: 128, label: '타워' },
    { dir: path.resolve(__dirname, '../public/assets/bg'), expectedW: 360, expectedH: 520, label: '배경' },
    { dir: path.resolve(__dirname, '../public/assets/enemy'), expectedW: 128, expectedH: 128, label: '몬스터' },
  ];

  const issues = [];
  const stats = { total: 0, ok: 0 };

  for (const { dir, expectedW, expectedH, label } of dirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    console.log(`\n--- ${label} (${files.length}개) ---`);

    const sizes = [];

    for (const f of files) {
      stats.total++;
      const filePath = path.join(dir, f);
      const fileSize = fs.statSync(filePath).size;
      sizes.push({ name: f, size: fileSize });

      try {
        const meta = await sharp(filePath).metadata();

        // 해상도 검증
        if (meta.width !== expectedW || meta.height !== expectedH) {
          issues.push(`${label}/${f}: ${meta.width}x${meta.height} (기대: ${expectedW}x${expectedH})`);
          continue;
        }

        // 포맷 검증
        if (meta.format !== 'png') {
          issues.push(`${label}/${f}: format=${meta.format} (기대: png)`);
          continue;
        }

        // 파일 크기가 너무 작으면 (1KB 미만) 깨진 이미지일 가능성
        if (fileSize < 1024) {
          issues.push(`${label}/${f}: 파일 크기 ${fileSize}B — 너무 작음 (깨진 이미지 가능)`);
          continue;
        }

        stats.ok++;
      } catch (e) {
        issues.push(`${label}/${f}: 읽기 실패 — ${e.message}`);
      }
    }

    // 파일 크기 통계
    if (sizes.length > 0) {
      sizes.sort((a, b) => a.size - b.size);
      const min = sizes[0];
      const max = sizes[sizes.length - 1];
      const avg = Math.round(sizes.reduce((s, x) => s + x.size, 0) / sizes.length);
      const median = sizes[Math.floor(sizes.length / 2)];
      console.log(`  크기 범위: ${(min.size / 1024).toFixed(1)}KB ~ ${(max.size / 1024).toFixed(1)}KB`);
      console.log(`  평균: ${(avg / 1024).toFixed(1)}KB | 중앙값: ${(median.size / 1024).toFixed(1)}KB`);
      console.log(`  최소: ${min.name} (${(min.size / 1024).toFixed(1)}KB)`);
      console.log(`  최대: ${max.name} (${(max.size / 1024).toFixed(1)}KB)`);

      // 이상치 탐지: 평균에서 크게 벗어나는 파일
      const stdDev = Math.sqrt(sizes.reduce((s, x) => s + Math.pow(x.size - avg, 2), 0) / sizes.length);
      const outliers = sizes.filter(x => Math.abs(x.size - avg) > 2 * stdDev);
      if (outliers.length > 0) {
        console.log(`  ⚠️  이상치 (±2σ): ${outliers.map(o => `${o.name}(${(o.size/1024).toFixed(1)}KB)`).join(', ')}`);
      }
    }
  }

  console.log('\n══════════════════════════════════════');
  console.log(`총 검사: ${stats.total}개 | 정상: ${stats.ok}개 | 이슈: ${issues.length}개`);
  console.log('══════════════════════════════════════');

  if (issues.length === 0) {
    console.log('\n✅ 모든 에셋 검증 통과!');
  } else {
    console.log('\n⚠️  이슈 목록:');
    issues.forEach(i => console.log(`  - ${i}`));
  }
}

checkAll().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
