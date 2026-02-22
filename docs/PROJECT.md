# Fantasy Tower Defense 프로젝트 기획서

## 개요

Phaser.js 3 기반 판타지 타워 디펜스 게임. 도형 기반 프로토타입 그래픽과 판타지 다크 테마를 적용한다. Phase 1~6을 거쳐 핵심 게임 루프, 콘텐츠 확장, 메타 화폐/컬렉션, Lv.3 업그레이드, 사운드/보스 강화, 모바일 패키징/통계를 구현했다.

## 기술 스택

| 항목 | 내용 |
|---|---|
| 게임 엔진 | Phaser.js 3 (npm) |
| 언어 | JavaScript ES6+ (바닐라, 프레임워크 없음) |
| 빌드 도구 | Vite (dev 서버, 번들링) |
| 모바일 패키징 | Capacitor (Android + iOS) |
| 모듈 구조 | ES6 모듈 기반 멀티 파일 (22개) |
| 렌더링 | HTML5 Canvas (Phaser 기본) |
| 데이터 저장 | localStorage (최고 기록, Diamond, 메타 업그레이드, 드래곤 해금, 통계, 게임 히스토리) |
| 해상도 | 360x640 (모바일 세로, portrait) |
| 서버 요구 | Vite dev 서버 (`npm run dev`) |

## 핵심 파일

| 파일 | 용도 |
|---|---|
| `package.json` | Vite + Phaser + Capacitor 의존성, 빌드 스크립트 |
| `vite.config.js` | Vite 빌드 설정 |
| `capacitor.config.json` | Capacitor 앱 설정 (Android + iOS) |
| `index.html` | 진입점 (Vite용 간소화, CDN 제거) |
| `style.css` | 바디 배경, 터치 방지(`touch-action: none`), safe-area 패딩 |
| `js/main.js` | Phaser.Game 인스턴스 생성 (npm import, 360x640, FIT + CENTER_BOTH) |
| `js/config.js` | 모든 게임 상수/밸런스 수치 집중 관리 (타워 10종, 적 8종, 웨이브 R1~R20, 메타 업그레이드 트리, 유틸리티 업그레이드, 저항 캡 0.55) |
| `js/scenes/BootScene.js` | 초기 설정, localStorage 로드, 세이브 마이그레이션 (stats 필드 포함), 메뉴 전환 |
| `js/scenes/MenuScene.js` | 메뉴 화면, Diamond 표시, GAME START/COLLECTION/STATISTICS 버튼 |
| `js/scenes/GameScene.js` | 핵심 게임플레이 (맵/타워/적/투사체/웨이브/AoE/체인/빔/메타 업그레이드/ProjectilePool/delta 캡/통계 추적/사거리 프리뷰) |
| `js/scenes/GameOverScene.js` | 결과 표시, Diamond 획득, 통계 저장, 게임 히스토리 관리, RETRY/MENU 버튼 |
| `js/scenes/CollectionScene.js` | 컬렉션 모드 (타워 카드 그리드, 메타 업그레이드 트리, 유틸리티 업그레이드, 드래곤 해금) |
| `js/scenes/StatsScene.js` | 통계 표시 (스크롤 가능 UI, killsByType/killsByTower/goldEarned/damageDealt, 게임 히스토리) |
| `js/entities/Tower.js` | 타워 배치/공격/업그레이드(A/B 분기)/판매/사거리 표시 |
| `js/entities/Enemy.js` | 적 이동/피격/슬로우/화상/독/방어력 감소/밀치기/분열/HP바 |
| `js/entities/Projectile.js` | 투사체 이동/충돌/스플래시/슬로우/도트/방어관통/풀 reset/deactivate |
| `js/managers/WaveManager.js` | 웨이브 스폰/진행/클리어/자동 스케일링 (R21+)/저항 캡/프리뷰 |
| `js/managers/MapManager.js` | 맵 그리드 렌더링/좌표 변환/배치 검증 |
| `js/managers/GoldManager.js` | Gold 획득/소비/잔액 관리 |
| `js/managers/ProjectilePool.js` | 오브젝트 풀 (투사체 30개 사전 할당, acquire/release) |
| `js/managers/SoundManager.js` | Web Audio API 프로시저럴 SFX/BGM |
| `js/ui/HUD.js` | 상단 HUD (Wave/Gold/HP, HP 위험 깜빡임, 웨이브 카운트다운, 적 프리뷰) |
| `js/ui/TowerPanel.js` | 하단 타워 선택(2줄 5열)/정보/A-B 분기 업그레이드/판매/3단 속도(1x/2x/3x) 패널 |

**총 22개 파일**

## Phaser 씬 구조

```
BootScene -> MenuScene -> GameScene -> GameOverScene
               ^    \  \                    |    |
               |     \  \                   |    |
               |      v  v                  |    |
               |  Collection  Stats         |    |
               |  Scene       Scene         |    |
               |      |         |           |    |
               |______| (BACK)  |           |    |
               |________________| (BACK)    |    |
               |____________________________|    |
               |       (RETRY)                   |
               |_________________________________|
                       (MENU)
```

## 맵 시스템

- 9x12 그리드 맵 (셀 크기 40x40px, 맵 영역 360x480px)
- 5종 셀 타입: 빈 타일(배치 가능), 경로, 기지, 스폰 지점, 배치 불가(벽)
- S자 경로 맵 1개 (31개 웨이포인트)
- 색상 기반 프로토타입 시각화 (경로 밝은 회색, 기지 주황빨강, 스폰 녹색)

## 데이터 구조

**localStorage 키: `fantasy-td-save`**

```json
{
  "bestRound": 15,
  "bestKills": 102,
  "totalGames": 5,
  "diamond": 42,
  "towerMetaUpgrades": {
    "archer": { "tier1": "a", "tier2": "b" },
    "mage": { "tier1": "a" }
  },
  "utilityUpgrades": {
    "baseHp": 2,
    "goldBoost": 1,
    "waveBonus": 0
  },
  "dragonUnlocked": false,
  "stats": {
    "totalKills": 512,
    "totalGoldEarned": 8420,
    "totalDamageDealt": 34200,
    "killsByType": { "normal": 200, "fast": 150, "tank": 80, "boss": 5, "swarm": 60, "splitter": 12, "armored": 5 },
    "killsByTower": { "archer": 120, "mage": 80, "ice": 50, "lightning": 60, "fire": 45, "rock": 30, "poison": 40, "wind": 35, "light": 32, "dragon": 20 }
  },
  "gameHistory": [
    {
      "round": 23,
      "kills": 102,
      "goldEarned": 1680,
      "damageDealt": 6840,
      "killsByType": { ... },
      "killsByTower": { ... },
      "timestamp": "2026-02-22T15:30:00.000Z"
    }
  ]
}
```

- `stats`: 전체 게임에 걸친 누적 통계 (킬 수, 골드, 데미지, 타입별/타워별 킬)
- `gameHistory`: 최근 20게임 기록 배열 (FIFO, 게임당 상세 통계 포함)

## 실행 방법

Vite dev 서버를 사용한다.

```bash
cd fantasydefence
npm install
npm run dev
```

모바일 빌드 (Capacitor):

```bash
cd fantasydefence
npm run build
npx cap sync
npx cap open android  # 또는 npx cap open ios
```

## 테스트

- Phase 1: Playwright 브라우저 테스트 11건 (전체 통과)
- Phase 2: Playwright 브라우저 테스트 26건 (전체 통과)
- Phase 3: 정적 코드 분석 QA PASS
- Phase 4: 정적 코드 분석 QA PASS
- Phase 5: 정적 코드 분석 QA PASS
- Phase 6: 정적 코드 분석 QA PASS (초기 CRITICAL 2건 수정 후 PASS)

## 시스템별 상세 문서

| 문서 | 내용 |
|---|---|
| [systems/tower.md](systems/tower.md) | 타워 10종, 공격타입 7종, Lv.1/2/3 업그레이드 |
| [systems/enemy.md](systems/enemy.md) | 적 8종, 스탯, 디버프 시스템, 면역 시스템 |
| [systems/wave.md](systems/wave.md) | R1~R20 정의, R21+ 스케일링, 보스 라운드 |
| [systems/economy.md](systems/economy.md) | Gold, Diamond, 메타 업그레이드, 컬렉션 |
| [systems/sound.md](systems/sound.md) | SFX 8종, BGM 3종, Web Audio API |
| [systems/ui.md](systems/ui.md) | HUD, TowerPanel, 일시정지, 게임속도, 모바일 |

## 향후 계획

| Phase | 목표 | 주요 작업 |
|---|---|---|
| ~~Phase 1~~ | ~~핵심 게임 루프~~ | ~~완료 (맵/타워/적/웨이브/UI)~~ |
| ~~Phase 2~~ | ~~콘텐츠 확장~~ | ~~완료 (타워 10종, 적 8종, R1~R20, 디버프)~~ |
| ~~Phase 3~~ | ~~메타 화폐 + 컬렉션~~ | ~~완료 (Diamond, 메타 업그레이드, 드래곤 해금)~~ |
| ~~Phase 4~~ | ~~게임플레이 완성~~ | ~~완료 (Lv.3 40종 + 일시정지)~~ |
| ~~Phase 5~~ | ~~보스 & 사운드~~ | ~~완료 (보스 강화 + 프로시저럴 SFX/BGM + 전투 연출)~~ |
| ~~Phase 6~~ | ~~패키징 & 최종~~ | ~~완료 (Vite 번들링 + Capacitor + 밸런스 + 퍼포먼스 + 통계)~~ |
