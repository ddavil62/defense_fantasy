# Fantasy Tower Defense 프로젝트 기획서

## 개요

Phaser.js 3 기반 판타지 타워 디펜스 게임. 도형 기반 프로토타입 그래픽과 판타지 다크 테마를 적용한다. Phase 1~6을 거쳐 핵심 게임 루프, 콘텐츠 확장, 메타 화폐/컬렉션, Lv.3 업그레이드, 사운드/보스 강화, 모바일 패키징/통계를 구현했다. 이후 데이터 기반 면역 시스템, 골드 싱크 시스템(타워 강화/HP 회복/소모품 능력), 머지 타워 시스템(102종 합성), 월드/맵 시스템(5개 월드, 30개 캠페인 맵, 별점/보상)을 추가했다.

## 기술 스택

| 항목 | 내용 |
|---|---|
| 게임 엔진 | Phaser.js 3 (npm) |
| 언어 | JavaScript ES6+ (바닐라, 프레임워크 없음) |
| 빌드 도구 | Vite (dev 서버, 번들링) |
| 모바일 패키징 | Capacitor (Android + iOS) |
| 모듈 구조 | ES6 모듈 기반 멀티 파일 (30개) |
| 렌더링 | HTML5 Canvas (Phaser 기본) |
| 데이터 저장 | localStorage (최고 기록, Diamond, 메타 업그레이드, 타워 해금, 머지 발견, 통계, 게임 히스토리, 월드 진행 상태, 엔드리스 해금) -- 세이브 v4 |
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
| `js/config.js` | 모든 게임 상수/밸런스 수치 집중 관리 (타워 10종, 적 8종, 웨이브 R1~R20, 메타 업그레이드 트리, 유틸리티 업그레이드, 저항 캡 0.55, 골드 싱크 상수, 머지 레시피 102종/스탯 102종 (T2 55종 + T3 30종 + T4 12종 + T5 5종), 별점 계산(calcStarRating), 캠페인 다이아몬드 보상(CAMPAIGN_DIAMOND_REWARDS), TOWER_UNLOCK_MAP(월드→타워 해금 매핑), 세이브 마이그레이션 v4) |
| `js/scenes/BootScene.js` | 초기 설정, localStorage 로드, 세이브 마이그레이션 (stats 필드 포함), 메뉴 전환 |
| `js/scenes/MenuScene.js` | 메뉴 화면, Diamond 표시, CAMPAIGN/ENDLESS(endlessUnlocked 조건부 활성)/COLLECTION/STATISTICS 버튼 |
| `js/scenes/GameScene.js` | 핵심 게임플레이 (맵/타워/적/투사체/웨이브/AoE/체인/빔/메타 업그레이드/ProjectilePool/delta 캡/통계 추적/사거리 프리뷰/골드 싱크/머지 드래그 핸들링/Pause 오버레이 합성도감 버튼/wake 이벤트 처리/mapClear 이벤트→MapClearScene 전환) |
| `js/scenes/GameOverScene.js` | 결과 표시, Diamond 획득, 통계 저장, 게임 히스토리 관리, RETRY/WORLD MAP(캠페인)/MENU 버튼 (RETRY 시 mapData/gameMode 전달) |
| `js/scenes/MapClearScene.js` | 캠페인 맵 클리어 결과 씬 (별점 1~3성 애니메이션, 다이아몬드 차액 보상 실제 지급, worldProgress/campaignStats/endlessUnlocked 세이브 갱신, 월드 클리어 시 타워 자동 해금+알림 UI, NEXT MAP(다음 맵 또는 월드 클리어)/RETRY/WORLD MAP 버튼) |
| `js/scenes/WorldSelectScene.js` | 월드 선택 씬 (5개 월드 패널, 세이브 데이터 기반 해금/잠금, 별점 진행도, LevelSelectScene 이동) |
| `js/scenes/LevelSelectScene.js` | 레벨 선택 씬 (6개 맵 카드, 세이브 데이터 기반 별점/해금, START -> GameScene) |
| `js/scenes/EndlessMapSelectScene.js` | 엔드리스 맵 선택 씬 (6탭: 클래식+5월드, 맵 카드, GameScene endless 모드 시작) |
| `js/scenes/CollectionScene.js` | 컬렉션 모드 -- 이중 탭: (1) 메타업그레이드 (타워 카드 그리드, 메타 업그레이드 트리, 유틸리티 업그레이드, 잠긴 타워 월드 클리어 조건 안내), (2) 합성도감 탭 클릭 시 MergeCodexScene으로 전환 |
| `js/scenes/MergeCodexScene.js` | 합성도감 전용 씬 -- T1~T5 서브탭, 전체 112종 타워 카드(발견 여부 무관 전부 공개), 카드 클릭 시 TowerInfoOverlay(codex 모드)로 상세 정보 표시, 드래그 스크롤, shutdown 핸들러로 리소스 정리. GameScene(Pause)과 CollectionScene 양쪽에서 진입 |
| `js/scenes/StatsScene.js` | 통계 표시 (스크롤 가능 UI, killsByType/killsByTower/goldEarned/damageDealt, 게임 히스토리) |
| `js/entities/Tower.js` | 타워 배치/공격/판매/사거리 표시/강화(+1~+10)/머지(tier, mergeId, applyMergeResult) |
| `js/entities/Enemy.js` | 적 이동/피격/슬로우/화상/독/방어력 감소/밀치기/분열/HP바 |
| `js/entities/Projectile.js` | 투사체 이동/충돌/스플래시/슬로우/도트/방어관통/풀 reset/deactivate |
| `js/managers/WaveManager.js` | 웨이브 스폰/진행/클리어/자동 스케일링 (R21+)/저항 캡/프리뷰/MAP_CLEAR 상태(totalWaves 도달 시 mapClear 이벤트 발행) |
| `js/managers/MapManager.js` | 맵 그리드 렌더링/좌표 변환/배치 검증 (동적 mapData 파라미터, 테마 색상 지원) |
| `js/data/maps.js` | MapData/MapTheme 타입 정의, CLASSIC_MAP, mapRegistry(getMapById, registerMap), validateMapData() |
| `js/data/worlds.js` | 5개 월드 정의 (id, nameKey, theme, mapIds, requiredStars), getWorldById(), getWorldByMapId(), getNextMapId() |
| `js/data/maps/forest.js` | 숲 월드 6개 맵 (totalWaves 8~12) |
| `js/data/maps/desert.js` | 사막 월드 6개 맵 (totalWaves 10~15, 전부 완성) |
| `js/data/maps/tundra.js` | 설원 월드 6개 맵 (totalWaves 12~18, 전부 완성) |
| `js/data/maps/volcano.js` | 화산 월드 6개 맵 (totalWaves 15~20, 전부 완성) |
| `js/data/maps/shadow.js` | 그림자 월드 6개 맵 (totalWaves 18~25, 전부 완성) |
| `js/managers/GoldManager.js` | Gold 획득/소비/잔액 관리 |
| `js/managers/ProjectilePool.js` | 오브젝트 풀 (투사체 30개 사전 할당, acquire/release) |
| `js/managers/SoundManager.js` | Web Audio API 프로시저럴 SFX/BGM |
| `js/i18n.js` | 다국어 지원 (한국어/영어), 모든 UI 텍스트 번역 키 관리 |
| `js/ui/HUD.js` | 상단 HUD (Wave/Gold/HP, HP 위험 깜빡임, 웨이브 카운트다운, 적 프리뷰, 캠페인 Wave X/Y 표시) |
| `js/ui/TowerPanel.js` | 하단 타워 선택(2줄 5열)/판매/강화/드래그&드롭 머지 UI/머지 프리뷰(드래그 하이라이트+호버 말풍선)/3단 속도(1x/2x/3x) 패널. 타워 상세 모달은 TowerInfoOverlay로 위임 |
| `js/ui/TowerInfoOverlay.js` | 공용 타워 정보 오버레이 (game/codex 모드). T1 스탯 패널, T2+ Y자 합성 트리, 상위 조합 드래그 스크롤, 드릴다운, game 모드 강화/판매 버튼 |

**총 32개 JS 파일** (+ 맵 데이터 5개 파일)

## Phaser 씬 구조

```
BootScene -> MenuScene
               |  \  \
               |   \  \
               |    \  +-> CollectionScene <-> MergeCodexScene
               |     +---> StatsScene
               |
               +-> [CAMPAIGN] -> WorldSelectScene
               |                   |
               |                   +-> LevelSelectScene
               |                         |
               |                         +-> [START] -> GameScene
               |                                         |    \
               |                                         |     +-> MapClearScene
               |                                         |     |    +-> [NEXT MAP] -> GameScene (next map)
               |                                         |     |    +-> [RETRY] -> GameScene (same map)
               |                                         |     |    +-> [WORLD MAP] -> WorldSelectScene
               |                                         |     |    +-> [world complete] -> WorldSelectScene
               |                                         |     |
               |                                         |     +-> (sleep/wake) MergeCodexScene
               |                                         |
               |                                         +-> GameOverScene
               |                                              +-> [RETRY] -> GameScene (same map)
               |                                              +-> [WORLD MAP] -> WorldSelectScene (campaign)
               |                                              +-> [MENU] -> MenuScene
               |
               +-> [ENDLESS] -> EndlessMapSelectScene (endlessUnlocked 조건)
                                   |
                                   +-> [맵 선택] -> GameScene (endless)
                                   +-> [뒤로] -> MenuScene
```

- MenuScene -> WorldSelectScene: CAMPAIGN 버튼 (fadeOut 200ms)
- MenuScene -> EndlessMapSelectScene: ENDLESS 버튼 (endlessUnlocked === true, fadeOut 200ms)
- WorldSelectScene -> LevelSelectScene: 해금된 월드 패널 탭 (worldId 전달, fadeOut 200ms)
- LevelSelectScene -> GameScene: START 버튼 (mapData, gameMode: campaign, fadeOut 200ms)
- GameScene -> MapClearScene: 캠페인 맵 클리어 시 전환 (mapClear 이벤트, 1초 딜레이)
- MapClearScene -> GameScene: NEXT MAP (다음 맵) / RETRY (동일 맵) (fadeOut 200ms)
- MapClearScene -> WorldSelectScene: WORLD MAP 버튼 / 월드 마지막 맵 클리어 시 (fadeOut 200ms)
- GameOverScene -> WorldSelectScene: WORLD MAP 버튼 (캠페인 모드 전용, fadeOut 200ms)
- GameScene -> MergeCodexScene: Pause 오버레이 합성도감 버튼 (scene.launch + sleep/wake)
- CollectionScene -> MergeCodexScene: 합성도감 탭 클릭 (scene.start)
- EndlessMapSelectScene -> GameScene: 맵 선택 START 버튼 (mapData, gameMode: endless, fadeOut 200ms)
- 모든 씬 진입 시 fadeIn 적용 (MenuScene 400ms, 나머지 300ms)

## 맵 시스템

- 9x12 그리드 맵 (셀 크기 40x40px, 맵 영역 360x480px)
- 5종 셀 타입: 빈 타일(배치 가능), 경로, 기지, 스폰 지점, 배치 불가(벽)
- 동적 MapData 구조: id, worldId, grid, waypoints, spawnPos, basePos, totalWaves, waveOverrides, theme
- mapRegistry: Map 기반 레지스트리 (getMapById, registerMap)
- validateMapData(): 그리드 크기, 셀 타입, 스폰/기지 위치, 웨이포인트 인접성(상하좌우만) 검증

### 클래식 맵 (엔드리스 모드)
- S자 경로 맵 1개 (31개 웨이포인트), totalWaves=Infinity

### 월드/캠페인 맵 (5개 월드, 30개 맵)

| 월드 | ID | 해금 조건 | 맵 수 | totalWaves |
|---|---|---|---|---|
| 숲 (Forest) | forest | 0별 (항상) | 6 | 8~12 |
| 사막 (Desert) | desert | 9별 | 6 | 10~15 |
| 설원 (Tundra) | tundra | 24별 | 6 | 12~18 |
| 화산 (Volcano) | volcano | 42별 | 6 | 15~20 |
| 그림자 (Shadow) | shadow | 60별 | 6 | 18~25 |

30개 캠페인 맵 전부 고유 경로로 완성됨.

### 월드 테마 색상

| 월드 | emptyTile | path | bg |
|---|---|---|---|
| 숲 | 0x1a2e1a | 0x2e3e1e | 0x0d1a0d |
| 사막 | 0x2e2a1a | 0x3e351e | 0x1a150d |
| 설원 | 0x1a2a2e | 0x1e3038 | 0x0d151a |
| 화산 | 0x2e1a1a | 0x381e1e | 0x1a0d0d |
| 그림자 | 0x221a2e | 0x2a1e38 | 0x120d1a |

### 별점 시스템
- `calcStarRating(currentHP, maxHP)`: HP 비율 >= 80% -> 3성, >= 40% -> 2성, > 0% -> 1성
- maxHP <= 0 일 때 안전하게 1성 반환
- `CAMPAIGN_DIAMOND_REWARDS = [0, 3, 5, 8]`: 별점 인덱스별 다이아몬드 보상

### MapClearScene
- 캠페인 맵 클리어 시 표시되는 결과 씬
- 별점 3개 순차 팝업 애니메이션 (Back.easeOut, 0.3초 간격)
- HP 잔량 비율에 따른 색상: >= 80% 골드, >= 40% 옅은 노랑, < 40% 빨강
- 다이아몬드 차액 보상 실제 지급: `CAMPAIGN_DIAMOND_REWARDS[stars] - CAMPAIGN_DIAMOND_REWARDS[prevStars]`
  - 첫 클리어(prevStars=0): 전체 지급 (1성=+3, 2성=+5, 3성=+8)
  - 재클리어: 이전 별점보다 높을 때만 차액 지급
  - 재클리어(동일 이상 별점): 0다이아 + "이미 최고 기록" 텍스트 표시
- 세이브 갱신: worldProgress(최고 별점 유지), campaignStats(totalStars/mapsCleared/worldsCleared), endlessUnlocked
- NEXT MAP / RETRY / WORLD MAP 3개 버튼 (fadeOut 200ms 후 전환)
  - NEXT MAP: 같은 월드 내 다음 맵 GameScene 이동 (`getNextMapId`), 마지막 맵이면 "월드 클리어!" 표시 + WorldSelectScene 이동
  - RETRY: 동일 mapData/gameMode로 GameScene 재시작
  - WORLD MAP: WorldSelectScene으로 이동

### 진행 규칙

#### 맵 해금
- 월드 내 첫 번째 맵(index 0): 항상 해금
- 이후 맵(index 1~5): 이전 맵의 stars >= 1

#### 월드 해금
- forest (requiredStars=0): 항상 해금
- desert: campaignStats.totalStars >= 9
- tundra: campaignStats.totalStars >= 24
- volcano: campaignStats.totalStars >= 42
- shadow: campaignStats.totalStars >= 60

#### 엔드리스 해금
- 30개 맵 전부 cleared === true -> endlessUnlocked = true

## 데이터 구조

**localStorage 키: `fantasy-td-save`** (세이브 v4)

```json
{
  "saveDataVersion": 4,
  "bestRound": 15,
  "bestKills": 102,
  "totalGames": 5,
  "diamond": 42,
  "totalDiamondEarned": 42,
  "towerUpgrades": {
    "archer": { "tier1": "a", "tier2": "b" },
    "mage": { "tier1": "a" }
  },
  "utilityUpgrades": {
    "baseHp": 2,
    "goldBoost": 1,
    "waveBonus": 0
  },
  "unlockedTowers": ["dragon"],
  "discoveredMerges": [],
  "stats": {
    "totalKills": 512,
    "totalGoldEarned": 8420,
    "totalDamageDealt": 34200,
    "killsByEnemyType": { "normal": 200, "fast": 150, "tank": 80, "boss": 5, "swarm": 60, "splitter": 12, "armored": 5 },
    "killsByTowerType": { "archer": 120, "mage": 80, "ice": 50, "lightning": 60, "fire": 45, "rock": 30, "poison": 40, "wind": 35, "light": 32, "dragon": 20 }
  },
  "gameHistory": [
    {
      "round": 23,
      "kills": 102,
      "goldEarned": 1680,
      "damageDealt": 6840,
      "killsByEnemyType": { ... },
      "killsByTowerType": { ... },
      "timestamp": "2026-02-22T15:30:00.000Z"
    }
  ],
  "worldProgress": {
    "f1_m1": { "cleared": true, "stars": 3 },
    "f1_m2": { "cleared": true, "stars": 2 }
  },
  "endlessUnlocked": false,
  "campaignStats": {
    "totalStars": 5,
    "mapsCleared": 2,
    "worldsCleared": 0
  }
}
```

- `saveDataVersion`: 세이브 스키마 버전 (현재 4)
- `unlockedTowers`: 해금된 타워 타입 배열 (월드 클리어 기반, v4에서 worldProgress 기반 재계산)
- `discoveredMerges`: 발견한 머지 결과 ID 배열 (v2 신규)
- `stats`: 전체 게임에 걸친 누적 통계 (킬 수, 골드, 데미지, 타입별/타워별 킬)
- `gameHistory`: 최근 20게임 기록 배열 (FIFO, 게임당 상세 통계 포함)
- `worldProgress`: 맵 ID별 진행 상태 (v3 신규). 클리어하지 않은 맵은 키 없음
- `endlessUnlocked`: 엔드리스 모드 해금 여부 (v3 신규). 30개 맵 전부 클리어 시 true
- `campaignStats`: 캠페인 누적 통계 (v3 신규). totalStars=각 맵 최고 별점 합산, mapsCleared=클리어한 맵 수, worldsCleared=전부 클리어한 월드 수

### 세이브 마이그레이션

| 경로 | 처리 |
|---|---|
| v1 -> v2 | dragonUnlocked -> unlockedTowers, discoveredMerges 추가, saveDataVersion=2 |
| v2 -> v3 | worldProgress={}, endlessUnlocked=false, campaignStats 기본값, saveDataVersion=3 |
| v3 -> v4 | unlockedTowers를 worldProgress 기반으로 재계산 (TOWER_UNLOCK_MAP 참조, 각 월드 6맵 전부 cleared 시 해당 타워 해금), saveDataVersion=4 |
| v1 -> v2 -> v3 -> v4 | 순차 실행 (각 블록에서 버전 고정하여 다음 블록 진입 보장) |

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
- 면역 시스템: 정적 코드 분석 + Playwright 17건 QA PASS
- 골드 싱크 시스템: 정적 코드 분석 QA PASS (1차 FAIL 버그 3건 수정 후 2차 PASS)
- 업그레이드 분기 UI: Playwright 17건 + 정적 분석 검증 스크립트 2건 QA PASS
- 머지 타워 시스템 Phase 1: 정적 코드 분석 14건 + Playwright 테스트 13건 작성, QA PASS (R3)
- 머지 타워 시스템 Phase 2: 정적 코드 분석 20건 (정상 8 + 예외 12) + Playwright 테스트 6건 작성, QA PASS (R2)
- 머지 타워 시스템 Phase 3: 정적 코드 분석 27건 (정상 19 + 예외 8), QA PASS
- 머지 타워 시스템 Phase 4-A: 정적 코드 분석 24건 (수용 기준 4 + 데이터 6 + 레시피 4 + 스탯 7 + 핸들러 1 + 예외 6 = 24건 전수 검증 중 일부 카테고리별), QA PASS
- 머지 타워 시스템 Phase 4-B: 정적 코드 분석 23건 (정상 15 + 예외 8) + Playwright 테스트 23개 작성, QA PASS (R2, 1차 FAIL BUG 4건 수정 후 PASS)
- 머지 프리뷰 UI: Playwright 테스트 49개 (정상 36 + 예외/엣지케이스 13) + 시각적 검증 2건, QA PASS
- 합성도감 전용 씬: Playwright 테스트 50개 (정상 36 + 예외 14) + 시각적 검증 13건 QA PASS (R2, 1차 ISSUE-1 수정 후 PASS)
- 합성도감 노드 트리 UI: Playwright 테스트 52개 (정상 30 + 예외 22) + 시각적 검증 11건 QA PASS
- 월드맵 Phase 1+2: Playwright 테스트 24개 + Node.js 맵 검증 스크립트 (31개 맵 전수 검증) + 시각적 검증 7건 QA PASS
- 월드맵 Phase 3: Playwright 테스트 56개 (정상 42 + 예외 14) + 시각적 검증 5건 QA PASS
- 월드맵 Phase 4: Playwright 테스트 40개 + 시각적 검증 6건, QA PASS (R1 BUG-1 수정 후 PASS)
- 월드맵 Phase 5: Playwright 테스트 30개 (R2 20 + 원본 10) + Node.js 맵 검증 30개 + 시각적 검증 2건, QA PASS (R2)
- 타워 정보 오버레이 통합: Playwright 테스트 65개 (R1 36 + R2 29) + 시각적 검증 11건, QA PASS (R2, R1 이벤트 리스너 누수 등 4건 수정 후 PASS)

## 시스템별 상세 문서

| 문서 | 내용 |
|---|---|
| [systems/tower.md](systems/tower.md) | 타워 10종(Lv.1), T2 합성 55종, T3 합성 30종, T4 합성 12종, T5 전설 5종, 공격타입 7종, 머지 시스템, 강화 시스템 |
| [systems/enemy.md](systems/enemy.md) | 적 8종, 스탯, 디버프 시스템, 면역 시스템 |
| [systems/wave.md](systems/wave.md) | R1~R20 정의, R21+ 스케일링, 보스 라운드 |
| [systems/economy.md](systems/economy.md) | Gold, Diamond, 메타 업그레이드, 컬렉션, 골드 싱크 |
| [systems/sound.md](systems/sound.md) | SFX 8종, BGM 3종, Web Audio API |
| [systems/ui.md](systems/ui.md) | HUD(캠페인 Wave X/Y), TowerPanel, TowerInfoOverlay(타워 정보 오버레이, game/codex 모드), 머지 프리뷰, 일시정지(합성도감 버튼 포함), 게임속도, 골드 싱크 UI, 컬렉션(이중 탭), MergeCodexScene(TowerInfoOverlay 연동), MapClearScene(차액 보상/세이브 갱신), WorldSelectScene(세이브 기반 해금), LevelSelectScene(세이브 기반 해금), MenuScene(CAMPAIGN/ENDLESS 조건부 활성), EndlessMapSelectScene(6탭 맵 선택), GameOverScene(캠페인 3버튼), 씬 전환 페이드(fadeIn/fadeOut), 모바일 |

## 향후 계획

| Phase | 목표 | 주요 작업 |
|---|---|---|
| ~~Phase 1~~ | ~~핵심 게임 루프~~ | ~~완료 (맵/타워/적/웨이브/UI)~~ |
| ~~Phase 2~~ | ~~콘텐츠 확장~~ | ~~완료 (타워 10종, 적 8종, R1~R20, 디버프)~~ |
| ~~Phase 3~~ | ~~메타 화폐 + 컬렉션~~ | ~~완료 (Diamond, 메타 업그레이드, 드래곤 해금)~~ |
| ~~Phase 4~~ | ~~게임플레이 완성~~ | ~~완료 (Lv.3 40종 + 일시정지)~~ |
| ~~Phase 5~~ | ~~보스 & 사운드~~ | ~~완료 (보스 강화 + 프로시저럴 SFX/BGM + 전투 연출)~~ |
| ~~Phase 6~~ | ~~패키징 & 최종~~ | ~~완료 (Vite 번들링 + Capacitor + 밸런스 + 퍼포먼스 + 통계)~~ |
| ~~월드맵 Phase 3~~ | ~~월드/레벨 선택 씬~~ | ~~완료 (WorldSelectScene, LevelSelectScene, HUD 캠페인 웨이브 표시, 캠페인 씬 플로우 완성)~~ |
| ~~월드맵 Phase 4~~ | ~~세이브 데이터 확장~~ | ~~완료 (세이브 v3, worldProgress/endlessUnlocked/campaignStats, 다이아몬드 차액 보상, 진행 규칙)~~ |
| ~~월드맵 Phase 5~~ | ~~맵 콘텐츠 + 엔드리스 맵 선택~~ | ~~완료 (19개 맵 고유 경로 완성, 씬 전환 페이드, EndlessMapSelectScene)~~ |
