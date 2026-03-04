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
| 모듈 구조 | ES6 모듈 기반 멀티 파일 (34개) |
| 폰트 | Galmuri11 픽셀 폰트 (Regular + Bold), SIL OFL 라이선스, woff2 로컬 번들링 |
| 렌더링 | HTML5 Canvas (Phaser 기본, pixelArt: true, antialias: false) |
| 데이터 저장 | localStorage (최고 기록, Diamond, 메타 업그레이드, 타워 해금, 머지 발견, 신규 발견, 통계, 게임 히스토리, 월드 진행 상태, 엔드리스 해금, 광고제거 구매 상태, 합성 튜토리얼 완료 플래그) -- 세이브 v8. 광고 일일 제한 카운터는 별도 키(`ftd_ad_daily_limit`), 언어 설정은 별도 키(`fantasy-td-lang`)에 저장 |
| 광고 SDK | `@capacitor-community/admob` v7.2.0 (Capacitor 7 호환, 네이티브 전용, 웹 Mock 모드) |
| 해상도 | 360x640 (모바일 세로, portrait) |
| 서버 요구 | Vite dev 서버 (`npm run dev`) |

## 핵심 파일

| 파일 | 용도 |
|---|---|
| `package.json` | Vite + Phaser + Capacitor 의존성, 빌드 스크립트 |
| `vite.config.js` | Vite 빌드 설정 |
| `capacitor.config.json` | Capacitor 앱 설정 (Android + iOS) |
| `index.html` | 진입점 (Vite용 간소화, CDN 제거) |
| `style.css` | 바디 배경, 터치 방지(`touch-action: none`), safe-area 패딩, Galmuri @font-face 선언 |
| `js/main.js` | Phaser.Game 인스턴스 생성 (npm import, 360x640, FIT + CENTER_BOTH, pixelArt: true), Android 뒤로가기 키(ESC) 내비게이션 핸들러 (오버레이 우선 처리: TowerInfoOverlay/pauseOverlay 열림 시 씬 전환 대신 오버레이 닫기) |
| `js/config.js` | 모든 게임 상수/밸런스 수치 집중 관리 (타워 10종, 적 8종, 웨이브 R1~R20, 메타 업그레이드 트리, 유틸리티 업그레이드, 저항 캡 0.55, 골드 싱크 상수, 머지 레시피 102종/스탯 102종 (T2 55종 + T3 30종 + T4 12종 + T5 5종), 별점 계산(calcStarRating), 캠페인 다이아몬드 보상(CAMPAIGN_DIAMOND_REWARDS), TOWER_UNLOCK_MAP(월드→타워 해금 매핑), 세이브 마이그레이션 v8, AdMob 광고 ID 6개/일일 제한 3개/보상 수치 4개/localStorage 키 1개, IAP_PRODUCT_REMOVE_ADS 상수, 밸런스 함수(calcHpScale/getBossHpMultiplier/calcWaveClearBonus), MAX_TOWER_COUNT=30, MERGE_COST 티어별 합성 비용, INITIAL_GOLD=160, 뽑기 비용 상수(DRAW_BASE_COST=80, DRAW_COST_INCREMENT=20) 및 calcDrawCost() 함수) |
| `js/scenes/BootScene.js` | 초기 설정, localStorage 로드, 세이브 마이그레이션 (stats 필드 포함), UI 에셋 56장 preload (아이콘 16장 포함), `async create()` + AdManager 초기화/registry 등록 + IAPManager 초기화/registry 등록 + adFree 상태 AdManager 동기화 + `await document.fonts.ready`로 Galmuri 폰트 로딩 대기 후 메뉴 전환 |
| `js/scenes/MenuScene.js` | 메뉴 화면, Diamond 표시, "Diamond 받기" 보상형 광고 버튼(일일 5회, Diamond +3, adFree시 무제한 ∞ 표시), CAMPAIGN/ENDLESS(endlessUnlocked 조건부 활성)/COLLECTION/STATISTICS 버튼(광고 진행 중 isBusy 가드), 광고제거 구매 버튼(Y=590+offsetY, 확인 다이얼로그, 구매완료 비활성화), 음소거 토글(centerX-48)/언어 토글(centerX+48) 버튼(Y=630+offsetY), 종료 확인 다이얼로그(_openExitDialog) |
| `js/scenes/GameScene.js` | 핵심 게임플레이 (맵/타워/적/투사체/웨이브/AoE/체인/빔/메타 업그레이드/ProjectilePool/delta 캡/통계 추적/사거리 프리뷰/골드 싱크/머지 드래그 핸들링/타워 드래그 이동(_onTowerMove)/Pause 오버레이 합성도감 버튼/wake 이벤트 처리/mapClear 이벤트→MapClearScene 전환(clearBoostActive 전달)/일시정지 시 BGM 정지·복원/소모품 아이콘+툴팁/일시정지·음소거 버튼 아이콘/게임오버 전면 광고/부활 처리(revived/startWave 플래그, HP 절반 설정, 웨이브 재개)/광고 골드 2배 부스트(goldBoostActive, 적 처치+웨이브 보너스에 AD_GOLD_BOOST_MULTIPLIER 적용)/타워 슬롯 제한(MAX_TOWER_COUNT=30)/합성 골드 비용(MERGE_COST)/HUD 타워 카운트 매 프레임 갱신/합성 발견 팝업(_showDiscoveryPopup, newDiscoveries 등록)/광고 보상 타워 무료 배치(_pendingAdTower 감지, cost=0, T2 applyMergeResult 적용)/합성 튜토리얼 오버레이(_showMergeTutorialIfNeeded, 신규 유저 1회 표시, isPaused로 웨이브 억제, BGM 계속 재생)) |
| `js/scenes/GameOverScene.js` | 결과 표시, Diamond 획득, 통계 저장, 게임 히스토리 관리, "광고 보고 부활" 보상형 광고 버튼(판당 1회, HP=maxHP/2로 해당 라운드 재개), RETRY/WORLD MAP(캠페인)/MENU 버튼(광고 진행 중 isBusy 가드, RETRY 시 mapData/gameMode 전달) |
| `js/scenes/MapClearScene.js` | 캠페인 맵 클리어 결과 씬 (별점 1~3성 애니메이션, 다이아몬드 차액 보상 실제 지급, clearBoostActive 시 보상 2배, 사후 "보상 2배" 광고 버튼(120x22px), 세이브 지연 패턴(_ensureSaved), worldProgress/campaignStats/endlessUnlocked 세이브 갱신, 월드 클리어 시 타워 자동 해금+알림 UI, NEXT MAP/RETRY/WORLD MAP 버튼(광고 진행 중 isBusy 가드, _ensureSaved 이전 배치)) |
| `js/scenes/WorldSelectScene.js` | 월드 선택 씬 (5개 월드 패널, 세이브 데이터 기반 해금/잠금, 별점 진행도, LevelSelectScene 이동) |
| `js/scenes/LevelSelectScene.js` | 레벨 선택 씬 (6개 맵 카드, 세이브 데이터 기반 별점/해금, 기둥 장식 안쪽 패딩 35px, 설명 wordWrap 160px, "2배 골드"/"보상 2배" 광고 버튼(70x18px), START/BACK 버튼(광고 진행 중 isBusy 가드) -> GameScene(goldBoostActive/clearBoostActive 플래그 전달)) |
| `js/scenes/EndlessMapSelectScene.js` | 엔드리스 맵 선택 씬 (6탭: 클래식+5월드, 맵 카드, 기둥 장식 안쪽 패딩 35px, 설명 wordWrap 160px, GameScene endless 모드 시작) |
| `js/scenes/CollectionScene.js` | 컬렉션 모드 -- 이중 탭: (1) 메타업그레이드 (타워 카드 그리드, 메타 업그레이드 트리, 유틸리티 업그레이드, 잠긴 타워 월드 클리어 조건 안내), (2) 합성도감 탭 클릭 시 MergeCodexScene으로 전환 + 신규 발견 빨간 점(newDiscoveries.length > 0 시 표시) |
| `js/scenes/MergeCodexScene.js` | 합성도감 전용 씬 -- T1~T5 서브탭, 도감 발견 시스템 적용(미발견 타워 실루엣+??? 표시, T3+ 재료 미발견 시 카드 숨김, 재료 발견 상태별 힌트 텍스트, 진행률 발견수/전체수), 카드 클릭 시 TowerInfoOverlay(codex 모드)로 상세 정보 표시, 미발견 카드 클릭 시 토스트, 신규 발견 빨간 점+클릭 시 제거, 드래그 스크롤(스크롤 시 visible 영역 밖 카드 interactive 비활성화), 상단 바 depth=10(카드 depth 6 / 서브탭 depth 8보다 상위), shutdown 핸들러로 리소스 정리. GameScene(Pause)과 CollectionScene 양쪽에서 진입 |
| `js/scenes/StatsScene.js` | 통계 표시 (스크롤 가능 UI, killsByType/killsByTower/goldEarned/damageDealt, 게임 히스토리) |
| `js/entities/Tower.js` | 타워 배치/공격/판매/사거리 표시/강화(+1~+10)/머지(tier, mergeId, applyMergeResult) |
| `js/entities/Enemy.js` | 적 이동/피격/슬로우/화상/독/방어력 감소/밀치기/분열/HP바 |
| `js/entities/Projectile.js` | 투사체 이동/충돌/스플래시/슬로우/도트/방어관통/풀 reset/deactivate |
| `js/managers/WaveManager.js` | 웨이브 스폰/진행/클리어/자동 스케일링 (R21+)/저항 캡/프리뷰/MAP_CLEAR 상태(totalWaves 도달 시 mapClear 이벤트 발행) |
| `js/managers/MapManager.js` | 맵 그리드 렌더링/좌표 변환/배치 검증/타워 이동(moveTower) (동적 mapData 파라미터, 테마 색상 지원) |
| `js/data/maps.js` | MapData/MapTheme 타입 정의, CLASSIC_MAP, mapRegistry(getMapById, registerMap), validateMapData() |
| `js/data/worlds.js` | 5개 월드 정의 (id, nameKey, theme, mapIds, requiredStars), getWorldById(), getWorldByMapId(), getNextMapId() |
| `js/data/maps/forest.js` | 숲 월드 6개 맵 (totalWaves 8~12) |
| `js/data/maps/desert.js` | 사막 월드 6개 맵 (totalWaves 10~15, 전부 완성) |
| `js/data/maps/tundra.js` | 설원 월드 6개 맵 (totalWaves 12~18, 전부 완성) |
| `js/data/maps/volcano.js` | 화산 월드 6개 맵 (totalWaves 15~20, 전부 완성) |
| `js/data/maps/shadow.js` | 그림자 월드 6개 맵 (totalWaves 18~25, 전부 완성) |
| `js/managers/GoldManager.js` | Gold 획득/소비/잔액 관리 |
| `js/managers/ProjectilePool.js` | 오브젝트 풀 (투사체 30개 사전 할당, acquire/release) |
| `js/managers/IAPManager.js` | IAP 관리자 클래스 (Mock/Native 이중 구현). 광고제거 구매(purchaseRemoveAds), 구매 복원(restorePurchases), 상태 확인(isAdFree). BootScene에서 초기화, registry에 `'iapManager'` 키로 등록 |
| `js/managers/AdManager.js` | AdMob 플러그인 래핑 클래스. 네이티브 환경에서 실제 광고, 웹에서 Mock 모드. 전면/보상형 광고 생명주기 관리, 일일 제한 카운터(localStorage), isBusy 플래그(광고 진행 중 씬 네비게이션 차단), adFree 상태(광고 스킵 + 일일 제한 해제) |
| `js/managers/SoundManager.js` | Web Audio API 프로시저럴 SFX/BGM, 백그라운드 전환 시 BGM 자동 일시정지/재개 |
| `js/i18n.js` | 다국어 지원 (한국어/영어), 모든 UI 텍스트 번역 키 관리 (ko 497키, en 497키), SUPPORTED_LOCALES export, localStorage 언어 저장/복원 |
| `js/ui/HUD.js` | 상단 HUD (Wave/Gold/HP, HP 위험 깜빡임, 웨이브 카운트다운, 적 프리뷰, 캠페인 Wave X/Y 표시, 타워 카운트 N/30 표시) |
| `js/ui/TowerPanel.js` | 하단 2행 패널. 1행: 뽑기 버튼(X=95, 150x44, 랜덤 T1 타워 선택)+무료뽑기 버튼(X=265, 150x44, 광고 시청 후 T1 90%/T2 10% 타워 3개 모달 선택, 무료 배치). 2행: 배속(X=40)+소모품3종+HP회복. 강화/드래그&드롭 머지+이동 UI/머지 프리뷰(드래그 하이라이트+호버 말풍선+합성 비용 표시)/3단 속도(아이콘, 1x/2x/3x). 뽑기 비용 표시/골드 부족 비활성화/롱프레스 풀 팝업. 드래그 시 빈 셀 하이라이트+이동/합성/취소 통합 분기. 타워 상세 모달은 TowerInfoOverlay로 위임 |
| `js/ui/TowerInfoOverlay.js` | 공용 타워 정보 오버레이 (game/codex 모드). NineSlice 동적 패널, T1 스탯 패널, T2+ Y자 합성 트리, 상위 조합 드래그 스크롤, 드릴다운, game 모드 강화/판매 버튼, enhanceLevel 기반 baseH 동적 계산, handleBack() 공개 래퍼(ESC 키 외부 호출용), 미발견 타워 ??? 표시 + 드릴다운 차단 (상위 조합/재료 노드) |
| `tools/balance-simulator.mjs` | Node.js 밸런스 시뮬레이터 (Phaser 의존성 없음). 5개 AI 전략 시나리오, CLI 지원 (`--scenarios`, `--rounds`, `--compare`, `--override`) |

**총 34개 JS 파일** (+ 맵 데이터 5개 파일 + 도구 1개)

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
               |                                              +-> [REVIVE] -> GameScene (same map, revived, HP=50%)
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
- LevelSelectScene -> GameScene: START 버튼 (mapData, gameMode: campaign, goldBoostActive, clearBoostActive, fadeOut 200ms)
- GameScene -> GameOverScene: 기지 HP 0 → `_gameOver()` → 전면 광고(AdManager.showInterstitial()) → GameOverScene 전환. AdManager 미등록 시 0.5초 딜레이 폴백
- GameScene -> MapClearScene: 캠페인 맵 클리어 시 전환 (mapClear 이벤트, 1초 딜레이, 전면 광고 없음)
- MapClearScene -> GameScene: NEXT MAP (다음 맵) / RETRY (동일 맵) (fadeOut 200ms)
- MapClearScene -> WorldSelectScene: WORLD MAP 버튼 / 월드 마지막 맵 클리어 시 (fadeOut 200ms)
- GameOverScene -> GameScene: 부활 버튼 (revived: true, startWave: round, HP=maxHP/2, fadeOut 200ms)
- GameOverScene -> WorldSelectScene: WORLD MAP 버튼 (캠페인 모드 전용, fadeOut 200ms)
- GameScene -> MergeCodexScene: Pause 오버레이 합성도감 버튼 (scene.launch + sleep/wake)
- CollectionScene -> MergeCodexScene: 합성도감 탭 클릭 (scene.start)
- EndlessMapSelectScene -> GameScene: 맵 선택 START 버튼 (mapData, gameMode: endless, fadeOut 200ms)
- 모든 씬 진입 시 fadeIn 적용 (MenuScene 400ms, 나머지 300ms)

### Android 뒤로가기 키(ESC) 내비게이션

`main.js`에서 `document.addEventListener('keydown', handleBackButton)` 리스너로 구현. Capacitor Android WebView에서 하드웨어 뒤로가기 버튼은 ESC 키(keyCode 27)로 매핑된다. PC 브라우저에서도 ESC 키로 동일하게 동작한다.

| 씬 | 뒤로가기 동작 | 전환 방식 |
|---|---|---|
| MenuScene | 종료 확인 다이얼로그 표시 | `_openExitDialog()` 호출 |
| WorldSelectScene | MenuScene으로 이동 | fadeOut 200ms |
| LevelSelectScene | WorldSelectScene으로 이동 | fadeOut 200ms |
| EndlessMapSelectScene | MenuScene으로 이동 | fadeOut 200ms |
| CollectionScene | MenuScene으로 이동 | 즉시 scene.start |
| MergeCodexScene | 호출 씬으로 복귀 | fromScene='GameScene': stop+wake, 그 외: scene.start('CollectionScene') |
| StatsScene | MenuScene으로 이동 | 즉시 scene.start |
| GameScene | 일시정지 메뉴 열기 | `_pauseGame()` 호출 (isPaused/isGameOver 시 무시) |
| MapClearScene | WorldSelectScene으로 이동 | fadeOut 200ms |
| GameOverScene | MenuScene으로 이동 | fadeOut 200ms |
| BootScene | 무시 | - |

- 종료 확인 다이얼로그: 반투명 오버레이(alpha 0.7) + 패널(240x140, 골드 테두리) + 확인(BTN_DANGER)/취소(BTN_BACK) 버튼
- 확인 시 앱 종료: `navigator.app.exitApp()` -> `window.close()` 폴백
- 오버레이 외부 클릭 시 취소 처리
- `window.__isExitDialogOpen` 플래그로 다이얼로그 중복 방지

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

**localStorage 키: `fantasy-td-save`** (세이브 v8)

```json
{
  "saveDataVersion": 8,
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
  "newDiscoveries": [],
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
  },
  "adFree": false,
  "mergeTutorialDone": false
}
```

- `saveDataVersion`: 세이브 스키마 버전 (현재 8)
- `unlockedTowers`: 해금된 타워 타입 배열 (월드 클리어 기반, v4에서 worldProgress 기반 재계산)
- `discoveredMerges`: 발견한 머지 결과 ID 배열 (v2 신규, v6에서 도감 표시에 활용)
- `newDiscoveries`: 아직 확인하지 않은 신규 발견 목록 (빨간 점 표시용, v6 신규). 카드 클릭 시 제거
- `stats`: 전체 게임에 걸친 누적 통계 (킬 수, 골드, 데미지, 타입별/타워별 킬)
- `gameHistory`: 최근 20게임 기록 배열 (FIFO, 게임당 상세 통계 포함)
- `worldProgress`: 맵 ID별 진행 상태 (v3 신규). 클리어하지 않은 맵은 키 없음
- `endlessUnlocked`: 엔드리스 모드 해금 여부 (v3 신규). 30개 맵 전부 클리어 시 true
- `campaignStats`: 캠페인 누적 통계 (v3 신규). totalStars=각 맵 최고 별점 합산, mapsCleared=클리어한 맵 수, worldsCleared=전부 클리어한 월드 수
- `adFree`: 광고제거 인앱 구매 상태 (v7 신규). true이면 광고 스킵 + 일일 제한 해제
- `mergeTutorialDone`: 합성 튜토리얼 완료 플래그 (v8 신규). 신규 유저는 false (첫 게임 시 튜토리얼 표시), 기존 유저는 마이그레이션 시 true (표시 생략)

### 세이브 마이그레이션

| 경로 | 처리 |
|---|---|
| v1 -> v2 | dragonUnlocked -> unlockedTowers, discoveredMerges 추가, saveDataVersion=2 |
| v2 -> v3 | worldProgress={}, endlessUnlocked=false, campaignStats 기본값, saveDataVersion=3 |
| v3 -> v4 | unlockedTowers를 worldProgress 기반으로 재계산 (TOWER_UNLOCK_MAP 참조, 각 월드 6맵 전부 cleared 시 해당 타워 해금), saveDataVersion=4 |
| v5 -> v6 | discoveredMerges 미존재 시 빈 배열 초기화, 기존 유저 T2 전체 발견 처리(tier===2인 MERGE_RECIPES 전부 추가), newDiscoveries=[] 추가, saveDataVersion=6 |
| v6 -> v7 | adFree=false 추가, saveDataVersion=7 |
| v7 -> v8 | mergeTutorialDone 추가 (기존 유저=true, 신규 유저=false), saveDataVersion=8 |
| v1 -> v2 -> ... -> v8 | 순차 실행 (각 블록에서 버전 고정하여 다음 블록 진입 보장) |

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
- BGM 백그라운드 자동 일시정지: Playwright 테스트 46개 (R1 27 + R2 19) + 정적 분석, QA PASS (R2, R1 이슈 2건 수정 후 PASS)
- UI 이미지 에셋 적용: Playwright 테스트 12개 + 시각적 검증 6건, QA PASS (R2, R1 크래시 버그 7건 + pixelArt 설정 수정 후 PASS)
- Galmuri 픽셀 폰트 적용: Playwright 테스트 13개 (정상 9 + 예외 4) + 시각적 검증 3건, QA PASS
- Android 뒤로가기 키 내비게이션: Playwright 테스트 20개 (정상 15 + 예외 5) + 시각적 검증 7건, QA PASS
- 유틸리티 카드 레이아웃 수직 재배치: Playwright 테스트 18개 (정상 7 + 시각 3 + 예외 5 + 안정성 3) + 시각적 검증 7건, QA PASS
- 소모품 버튼 UX 개선 (아이콘+툴팁): Playwright 테스트 39개 (정상 26 + 예외 13) + 시각적 검증 13건, QA PASS
- UI 아이콘 일괄 개선 (판매/배속/일시정지/음소거): Playwright 테스트 19개 (정상 10 + 예외 4 + 시각적 5) + 시각적 검증 8건, QA PASS
- AdMob 통합 Phase 1 (전면 광고 + AdManager 기반): Playwright 테스트 25개 (정상 9 + 예외 8 + 단위 6 + UI 2) + 시각적 검증 8건, QA PASS
- AdMob 통합 Phase 2 (보상형 광고: Diamond 지급 + 부활): Playwright 테스트 31개 (정상 12 + 예외/엣지케이스 11 + 회귀 4 + 기타 4) + 시각적 검증 10건, QA PASS
- AdMob 통합 Phase 3 (보상형 광고: Gold 2배 + 클리어 보상 2배): Playwright 테스트 39개 (정상 24 + 예외 9 + 회귀 4 + UI 안정성 3) + 시각적 검증 9건, QA PASS
- AdMob 통합 Phase 4 (일일 제한 검증 + 통합 QA): Playwright 테스트 48개 (일일 제한 8 + 전면 광고 2 + Diamond 3 + 부활 4 + Gold 2배 3 + 클리어 2배 3 + 교차 기능 3 + Mock 3 + 비기능 4 + 시각적 5 + 엣지케이스 7 + 회귀 3) + 시각적 검증 9건, QA PASS -- **AdMob 통합 전체 완료**
- 밸런스 전면 조정 (Balance Overhaul): Playwright 테스트 31개 (정상 27 + 예외 4, 29 PASS / 2 환경 제약 SKIP) + 정적 코드 분석, QA PASS (1차 FAIL 합성 실패 시 타워 투명화 버그 수정 후 PASS)
- 체인 공격 감쇠 공식 변경 (삼각수 지수 감쇠): Playwright 테스트 28개 (정상 16 + 예외 7 + 브라우저 5) + 수학적 검증 + 정적 코드 분석, QA PASS
- 합성도감 BACK 버튼 버그 수정: Playwright 테스트 27개 (정상 12 + 예외 8 + 시각적 3 + UI 안정성 3, 26 PASS / 1 환경 이슈 SKIP) + 시각적 검증 8건, QA PASS
- 광고 로딩/표시 중 네비게이션 버튼 Race Condition 방지: Playwright 테스트 26개 (정상 12 + 예외 14) + 시각적 검증 4건, QA PASS
- Sell 버튼 패널 하단 고정 배치: Playwright 테스트 23개 (정상 12 + 예외/엣지케이스 6 + 시각적 5) + 시각적 검증 5건, QA PASS
- 랜덤 뽑기 시스템 Phase 1: Playwright 테스트 29개 (정상 17 + 예외 8 + 시각적 4) + 시각적 검증 6건, QA PASS
- 랜덤 뽑기 시스템 Phase 2 (타워 드래그 이동): Playwright 테스트 30개 (정상 19 + 예외 8 + 시각적 3) + 시각적 검증 3건, QA PASS
- 랜덤 뽑기 시스템 Phase 3 (이코노미 리밸런스): Playwright 테스트 23개 (정상 15 + 예외 8) + 시각적 검증 3건, QA PASS
- i18n 하드코딩 텍스트 t() 전환: Playwright 테스트 27개 (1차 FAIL 수정 2 + 잔존 하드코딩 10 + 키 정합성 4 + 재스캔 5 + 브라우저 4 + 코드 품질 2) + 시각적 검증 4건, QA PASS (R2)
- 언어 전환 버튼 (Lang Toggle): Playwright 테스트 21개 (정상 10 + 예외 6 + UI 안정성 5) + 시각적 검증 10건, QA PASS
- 타워 수집 시스템 (도감 발견 메커니즘): 코드 리뷰 6개 파일 전체 PASS, vite build PASS, QA PASS
- 광고 보상 타워 뽑기: Playwright 테스트 28개 (정상 17 + 예외 7 + 시각적 3 + 안정성 1) + 시각적 검증 5건, QA PASS
- 광고제거 인앱 구매: Playwright 테스트 44건 (정상 22 + 예외 8 + 레이아웃 14), QA PASS (R2)
- 합성 튜토리얼: Playwright 테스트 24건 (정상 12 + 예외 5 + UI/시각 5 + i18n 2) + 시각적 검증 6건, QA PASS
- 하단 패널 UI 리디자인: Playwright 테스트 29건 (정상 18 + 예외/엣지케이스 4 + 시각적 4 + 안정성 3) + 시각적 검증 8건, QA PASS

## 시스템별 상세 문서

| 문서 | 내용 |
|---|---|
| [systems/tower.md](systems/tower.md) | 타워 10종(Lv.1), T2 합성 55종, T3 합성 30종, T4 합성 12종, T5 전설 5종, 공격타입 7종, 머지 시스템, 강화 시스템, 랜덤 뽑기 시스템, 타워 드래그 이동, 타워 수집/발견 시스템 |
| [systems/enemy.md](systems/enemy.md) | 적 8종, 스탯, 디버프 시스템, 면역 시스템 |
| [systems/wave.md](systems/wave.md) | R1~R20 정의, R21+ 스케일링, 보스 라운드 |
| [systems/economy.md](systems/economy.md) | Gold, Diamond, 메타 업그레이드, 컬렉션, 골드 싱크, 뽑기 비용, 광고 보상 타워(무료) |
| [systems/sound.md](systems/sound.md) | SFX 8종, BGM 3종, Web Audio API, 백그라운드 전환 BGM 자동 일시정지/재개 |
| [systems/ui.md](systems/ui.md) | HUD(캠페인 Wave X/Y), TowerPanel(2행 레이아웃: 1행 뽑기+무료뽑기 버튼/2행 배속+소모품3종+HP회복, 풀 팝업/광고 보상 타워 모달/드래그 이동+합성 통합), TowerInfoOverlay(타워 정보 오버레이, game/codex 모드, 미발견 타워 ???/드릴다운 차단), 머지 프리뷰, 합성 튜토리얼(신규 유저 1회 오버레이), 일시정지(합성도감 버튼 포함), 게임속도, 골드 싱크 UI(소모품 아이콘+툴팁), 컬렉션(이중 탭, 합성도감 빨간 점), MergeCodexScene(도감 발견 시스템: 실루엣/힌트/진행률/빨간 점), 발견 축하 팝업, MapClearScene(차액 보상/세이브 갱신), WorldSelectScene(세이브 기반 해금), LevelSelectScene(세이브 기반 해금), MenuScene(CAMPAIGN/ENDLESS 조건부 활성, 음소거/언어 토글, 종료 확인 다이얼로그), EndlessMapSelectScene(6탭 맵 선택), GameOverScene(캠페인 3버튼), 씬 전환 페이드(fadeIn/fadeOut), Android 뒤로가기 키(ESC) 내비게이션, UI 이미지 에셋(버튼 23장/패널 5장/HUD 9장/장식 3장/아이콘 16장), Galmuri 픽셀 폰트, i18n(언어 전환/localStorage 저장), 모바일 |
| [systems/ad.md](systems/ad.md) | AdMob 광고 시스템 (전면 광고, 보상형 광고 5종, 일일 제한, Mock 모드) |

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
| ~~AdMob Phase 1~~ | ~~AdManager 기반 + 전면 광고~~ | ~~완료 (AdManager 클래스, Mock 모드, 게임오버 전면 광고, 일일 제한 인프라)~~ |
| ~~AdMob Phase 2~~ | ~~보상형 광고: Diamond + 부활~~ | ~~완료 (MenuScene Diamond 받기 버튼(일일 5회, +3D), GameOverScene 부활 버튼(판당 1회, HP 절반, 웨이브 재개))~~ |
| ~~AdMob Phase 3~~ | ~~보상형 광고: Gold 2배 + 클리어 보상 2배~~ | ~~완료 (LevelSelectScene "2배 골드"/"보상 2배" 버튼(일일 3회씩), GameScene 골드 2배 부스트, MapClearScene 사후 "보상 2배" 광고 버튼, 세이브 지연 패턴)~~ |
| ~~AdMob Phase 4~~ | ~~통합 QA~~ | ~~완료 (일일 제한 시스템 전수 검증, Playwright 48건 통합 테스트 PASS, 코드 변경 없음)~~ |
