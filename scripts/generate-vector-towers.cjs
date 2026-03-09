/**
 * @fileoverview T1 타워 10종 글로우 벡터 SVG 생성 후 PNG 변환 스크립트.
 * SVG 코드를 프로그래밍 방식으로 생성하고, sharp 라이브러리로 128x128 RGBA PNG로 변환한다.
 * 글로우 벡터 스타일: 네온 발광(외부 글로우) + 코어(내부 샤프) 이중 필터 구조.
 *
 * 사용법:
 *   node scripts/generate-vector-towers.cjs
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ── 타워 정의 ──────────────────────────────────────────────────────

/**
 * T1 타워 10종 색상/형태 정의.
 * @type {Array<{type: string, name: string, coreColor: string, glowColor: string, accentColor: string}>}
 */
const TOWERS = [
  { type: 'archer',    name: 'Archer',    coreColor: '#7fff7f', glowColor: '#00ff00', accentColor: '#ffffff' },
  { type: 'mage',      name: 'Mage',      coreColor: '#bf7fff', glowColor: '#9900ff', accentColor: '#ffffff' },
  { type: 'ice',       name: 'Ice',       coreColor: '#7fffff', glowColor: '#00ffff', accentColor: '#ffffff' },
  { type: 'lightning', name: 'Lightning', coreColor: '#ffff7f', glowColor: '#ffff00', accentColor: '#ffffff' },
  { type: 'flame',     name: 'Flame',     coreColor: '#ff9f3f', glowColor: '#ff6600', accentColor: '#ffff00' },
  { type: 'rock',      name: 'Rock',      coreColor: '#bf9f7f', glowColor: '#996633', accentColor: '#ffffff' },
  { type: 'poison',    name: 'Poison',    coreColor: '#7fff3f', glowColor: '#33cc00', accentColor: '#ffff00' },
  { type: 'wind',      name: 'Wind',      coreColor: '#7fffff', glowColor: '#00ccff', accentColor: '#ffffff' },
  { type: 'light',     name: 'Light',     coreColor: '#ffff7f', glowColor: '#ffcc00', accentColor: '#ffffff' },
  { type: 'dragon',    name: 'Dragon',    coreColor: '#ff7f7f', glowColor: '#ff0000', accentColor: '#ffff00' },
];

/** PNG 출력 디렉토리 */
const OUT_DIR = path.resolve(__dirname, '../public/assets/tower');

// ── SVG 필터 생성 ──────────────────────────────────────────────────

/**
 * 글로우 벡터 표준 SVG 필터를 생성한다.
 * - glow: 외부 발광 (stdDeviation=4, feMerge x3으로 누적 발광)
 * - core: 내부 코어 (stdDeviation=2, feMerge x2로 샤프한 발광)
 * @param {string} glowColor - 글로우 색상 (hex)
 * @returns {string} SVG <defs> 요소 문자열
 */
function buildFilters(glowColor) {
  return `
  <defs>
    <!-- 외부 글로우 필터: 가우시안 블러 stdDeviation=4, 3겹 누적 -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
      </feMerge>
    </filter>
    <!-- 내부 코어 필터: 가우시안 블러 stdDeviation=2, 2겹 누적 -->
    <filter id="core" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
      </feMerge>
    </filter>
  </defs>`;
}

// ── 타워별 SVG 형태 생성 ───────────────────────────────────────────

/**
 * Archer 타워: 삼각형 화살 실루엣 + 시위 디테일.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawArcher(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="64,16 16,112 112,112" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="64,16 16,112 112,112" fill="${coreColor}" />
      <!-- 시위 디테일: 수평 선 3개 -->
      <line x1="32" y1="60" x2="96" y2="60" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <line x1="28" y1="75" x2="100" y2="75" stroke="${accentColor}" stroke-width="1.5" opacity="0.5"/>
      <line x1="24" y1="90" x2="104" y2="90" stroke="${accentColor}" stroke-width="1.5" opacity="0.4"/>
    </g>`;
}

/**
 * Mage 타워: 원형 오브 + 별 모양 보석 실루엣.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawMage(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  // 별 모양 (6각 스타) polygon 좌표 계산
  const starPoints = [];
  for (let i = 0; i < 6; i++) {
    const outerAngle = (Math.PI / 3) * i - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 6;
    starPoints.push(`${64 + 28 * Math.cos(outerAngle)},${64 + 28 * Math.sin(outerAngle)}`);
    starPoints.push(`${64 + 14 * Math.cos(innerAngle)},${64 + 14 * Math.sin(innerAngle)}`);
  }
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <circle cx="64" cy="64" r="44" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <circle cx="64" cy="64" r="44" fill="${coreColor}" />
      <!-- 스타형 보석 실루엣 -->
      <polygon points="${starPoints.join(' ')}" fill="${glowColor}" opacity="0.8"/>
      <!-- 중앙 보석 코어 -->
      <circle cx="64" cy="64" r="12" fill="${accentColor}" opacity="0.9"/>
    </g>`;
}

/**
 * Ice 타워: 다이아몬드 + 스노플레이크 대각선 디테일.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawIce(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="64,12 116,64 64,116 12,64" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="64,12 116,64 64,116 12,64" fill="${coreColor}" />
      <!-- 스노플레이크 대각선 4개 -->
      <line x1="64" y1="28" x2="64" y2="100" stroke="${accentColor}" stroke-width="1.5" opacity="0.6"/>
      <line x1="28" y1="64" x2="100" y2="64" stroke="${accentColor}" stroke-width="1.5" opacity="0.6"/>
      <line x1="38" y1="38" x2="90" y2="90" stroke="${accentColor}" stroke-width="1.2" opacity="0.4"/>
      <line x1="90" y1="38" x2="38" y2="90" stroke="${accentColor}" stroke-width="1.2" opacity="0.4"/>
      <!-- 중앙 결정 -->
      <circle cx="64" cy="64" r="8" fill="${accentColor}" opacity="0.7"/>
    </g>`;
}

/**
 * Lightning 타워: 지그재그 번개 볼트 형상.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawLightning(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="72,10 40,56 56,56 32,118 96,54 76,54 100,10" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="72,10 40,56 56,56 32,118 96,54 76,54 100,10" fill="${coreColor}" />
      <!-- 소형 번개 디테일 (좌측) -->
      <polyline points="48,30 38,52 46,52 36,72" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.5"/>
      <!-- 소형 번개 디테일 (우측) -->
      <polyline points="86,38 78,56 84,56 74,78" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.5"/>
    </g>`;
}

/**
 * Flame 타워: 타원형 화염 + 불꽃 상승 디테일.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawFlame(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <ellipse cx="64" cy="80" rx="32" ry="40" fill="${glowColor}" />
      <!-- 불꽃 상단 곡선 -->
      <path d="M48,50 Q54,18 64,14 Q74,18 80,50" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <ellipse cx="64" cy="80" rx="32" ry="40" fill="${coreColor}" />
      <path d="M48,50 Q54,18 64,14 Q74,18 80,50" fill="${coreColor}" />
      <!-- 내부 화염 코어 (밝은 액센트) -->
      <ellipse cx="64" cy="75" rx="16" ry="22" fill="${accentColor}" opacity="0.8"/>
      <path d="M56,56 Q60,34 64,30 Q68,34 72,56" fill="${accentColor}" opacity="0.7"/>
      <!-- 상승 디테일 삼각형 -->
      <polygon points="58,65 64,45 70,65" fill="${accentColor}" opacity="0.5"/>
    </g>`;
}

/**
 * Rock 타워: 불규칙 팔각형 바위 + 암석 텍스쳐 선.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawRock(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="35,20 65,15 95,25 108,55 100,90 65,110 30,95 20,60" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="35,20 65,15 95,25 108,55 100,90 65,110 30,95 20,60" fill="${coreColor}" />
      <!-- 암석 텍스쳐 — 내부 균열선 -->
      <line x1="45" y1="35" x2="70" y2="50" stroke="${accentColor}" stroke-width="1.2" opacity="0.4"/>
      <line x1="50" y1="55" x2="90" y2="65" stroke="${accentColor}" stroke-width="1.0" opacity="0.35"/>
      <line x1="35" y1="70" x2="65" y2="85" stroke="${accentColor}" stroke-width="1.0" opacity="0.3"/>
      <line x1="70" y1="40" x2="95" y2="55" stroke="${accentColor}" stroke-width="0.8" opacity="0.3"/>
      <line x1="55" y1="75" x2="80" y2="95" stroke="${accentColor}" stroke-width="0.8" opacity="0.25"/>
    </g>`;
}

/**
 * Poison 타워: 육각형 플라스크 + 독성 기포.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawPoison(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="64,14 100,35 100,79 64,100 28,79 28,35" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="64,14 100,35 100,79 64,100 28,79 28,35" fill="${coreColor}" />
      <!-- 독성 기포 -->
      <circle cx="52" cy="55" r="10" fill="${accentColor}" opacity="0.6"/>
      <circle cx="76" cy="50" r="7" fill="${accentColor}" opacity="0.5"/>
      <circle cx="64" cy="72" r="12" fill="${accentColor}" opacity="0.5"/>
      <circle cx="46" cy="74" r="5" fill="${accentColor}" opacity="0.4"/>
      <circle cx="80" cy="68" r="6" fill="${accentColor}" opacity="0.4"/>
    </g>`;
}

/**
 * Wind 타워: 곡선 소용돌이 (3중 나선 커브).
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawWind(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <!-- 소용돌이 3중 커브 -->
      <path d="M64,64 Q20,30 40,16 Q60,4 80,20 Q100,36 90,56" fill="none" stroke="${glowColor}" stroke-width="8" stroke-linecap="round"/>
      <path d="M64,64 Q108,30 108,64 Q108,98 80,108 Q52,118 40,96" fill="none" stroke="${glowColor}" stroke-width="8" stroke-linecap="round"/>
      <path d="M64,64 Q20,98 28,80 Q36,62 56,58" fill="none" stroke="${glowColor}" stroke-width="8" stroke-linecap="round"/>
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <path d="M64,64 Q20,30 40,16 Q60,4 80,20 Q100,36 90,56" fill="none" stroke="${coreColor}" stroke-width="5" stroke-linecap="round"/>
      <path d="M64,64 Q108,30 108,64 Q108,98 80,108 Q52,118 40,96" fill="none" stroke="${coreColor}" stroke-width="5" stroke-linecap="round"/>
      <path d="M64,64 Q20,98 28,80 Q36,62 56,58" fill="none" stroke="${coreColor}" stroke-width="5" stroke-linecap="round"/>
      <!-- 중앙 원 -->
      <circle cx="64" cy="64" r="6" fill="${accentColor}" opacity="0.8"/>
    </g>`;
}

/**
 * Light 타워: 8각 별 (팔릉성) + 중앙 헤일로.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawLight(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  // 8각 별 polygon 좌표 (외부 r=48, 내부 r=22)
  const starPoints = [];
  for (let i = 0; i < 8; i++) {
    const outerAngle = (Math.PI / 4) * i - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 8;
    starPoints.push(`${(64 + 48 * Math.cos(outerAngle)).toFixed(1)},${(64 + 48 * Math.sin(outerAngle)).toFixed(1)}`);
    starPoints.push(`${(64 + 22 * Math.cos(innerAngle)).toFixed(1)},${(64 + 22 * Math.sin(innerAngle)).toFixed(1)}`);
  }
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <polygon points="${starPoints.join(' ')}" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <polygon points="${starPoints.join(' ')}" fill="${coreColor}" />
      <!-- 중앙 헤일로 -->
      <circle cx="64" cy="64" r="15" fill="${accentColor}" opacity="0.85"/>
      <circle cx="64" cy="64" r="8" fill="${glowColor}" opacity="0.6"/>
    </g>`;
}

/**
 * Dragon 타워: 날개 달린 다이아몬드 + 드래곤 머리 음영.
 * @param {object} tower - 타워 정의 객체
 * @returns {string} SVG 요소 문자열
 */
function drawDragon(tower) {
  const { coreColor, glowColor, accentColor } = tower;
  return `
    <!-- 외부 글로우 레이어 -->
    <g filter="url(#glow)" opacity="0.6">
      <!-- 중심 다이아몬드 -->
      <polygon points="64,14 100,64 64,114 28,64" fill="${glowColor}" />
      <!-- 좌측 날개 -->
      <path d="M28,64 Q8,40 14,20 Q20,30 40,44" fill="${glowColor}" />
      <!-- 우측 날개 -->
      <path d="M100,64 Q120,40 114,20 Q108,30 88,44" fill="${glowColor}" />
    </g>
    <!-- 코어 레이어 -->
    <g filter="url(#core)" opacity="1.0">
      <!-- 중심 다이아몬드 -->
      <polygon points="64,14 100,64 64,114 28,64" fill="${coreColor}" />
      <!-- 좌측 날개 -->
      <path d="M28,64 Q8,40 14,20 Q20,30 40,44" fill="${coreColor}" />
      <!-- 우측 날개 -->
      <path d="M100,64 Q120,40 114,20 Q108,30 88,44" fill="${coreColor}" />
      <!-- 드래곤 머리 형태 음영 (상단 삼각) -->
      <polygon points="54,34 64,20 74,34" fill="${accentColor}" opacity="0.7"/>
      <!-- 중심 보석 (액센트) -->
      <circle cx="64" cy="64" r="12" fill="${accentColor}" opacity="0.85"/>
      <!-- 눈 디테일 -->
      <circle cx="56" cy="48" r="3" fill="${accentColor}" opacity="0.9"/>
      <circle cx="72" cy="48" r="3" fill="${accentColor}" opacity="0.9"/>
    </g>`;
}

// ── 타워 타입 -> 드로우 함수 매핑 ──────────────────────────────────

/**
 * 타워 타입별 SVG 형태 생성 함수 맵.
 * @type {Object<string, function(object): string>}
 */
const DRAW_MAP = {
  archer: drawArcher,
  mage: drawMage,
  ice: drawIce,
  lightning: drawLightning,
  flame: drawFlame,
  rock: drawRock,
  poison: drawPoison,
  wind: drawWind,
  light: drawLight,
  dragon: drawDragon,
};

// ── SVG 생성 ───────────────────────────────────────────────────────

/**
 * 타워 정의 객체로부터 완전한 SVG 문자열을 생성한다.
 * @param {object} tower - 타워 정의 객체 (type, name, coreColor, glowColor, accentColor)
 * @returns {string} SVG 문자열 (128x128 viewBox)
 */
function generateSVG(tower) {
  const filters = buildFilters(tower.glowColor);
  const shape = DRAW_MAP[tower.type](tower);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  ${filters}
  <!-- 투명 배경 -->
  <rect width="128" height="128" fill="none"/>
  ${shape}
</svg>`;
}

// ── 메인 실행 ──────────────────────────────────────────────────────

/**
 * 메인 함수. T1 타워 10종의 SVG를 생성하고 sharp로 PNG 128x128 RGBA로 변환한다.
 */
async function main() {
  console.log('--- T1 타워 글로우 벡터 PNG 생성 ---\n');

  // 출력 디렉토리 확인/생성
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`디렉토리 생성: ${OUT_DIR}`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const tower of TOWERS) {
    const svgString = generateSVG(tower);
    const outputPath = path.join(OUT_DIR, `${tower.name}.png`);

    try {
      // SVG 문자열 -> Buffer -> sharp PNG 변환
      await sharp(Buffer.from(svgString))
        .resize(128, 128)
        .png()
        .toFile(outputPath);

      console.log(`[OK] ${tower.name}.png (128x128)`);
      successCount++;
    } catch (err) {
      console.error(`[FAIL] ${tower.name}.png: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n--- 완료: 성공 ${successCount}종 / 실패 ${failCount}종 ---`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
