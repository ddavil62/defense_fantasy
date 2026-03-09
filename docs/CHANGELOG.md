# Fantasy Tower Defense 변경 이력

모든 주요 변경사항을 날짜순으로 기록한다.

---

## 2026-03-05 -- 맵 클리어 팡파레 사운드 추가

### 추가

- **`js/managers/SoundManager.js`** -- `_playSfxMapClearFanfare(ctx)` 메서드 추가. Web Audio API 5레이어 절차적 합성으로 승리 팡파레 생성. 구성: 멜로디(sine, C5->E5->G5->C6 아르페지오), 화음(triangle, E5+G5+C6), 베이스 타격(sine, C3), sparkle 1(triangle, C7->G6 하강), sparkle 2(triangle, E7->C7 하강). 전체 약 2.2초. `playSfx()` switch에 `sfx_map_clear_fanfare` 분기 추가
- **`js/scenes/MapClearScene.js`** -- `create()` 내 `fadeIn(300)` 직후에 `soundManager.playSfx('sfx_map_clear_fanfare')` 호출 삽입. 별점 구분 없이 항상 동일한 최대 팡파레 재생

### 참고

- 기존 `sfx_wave_clear`(GameScene 맵 클리어 직전)와 약 1초 간격으로 연속 재생되어 자연스러운 연출 형성
- `_sfxGain` 노드 경유로 SFX 볼륨/음소거 설정 반영. `_ensureContext()` 흐름 준수
- 외부 오디오 파일 없이 Web Audio API만 사용
- 스펙: `.claude/specs/2026-03-05-map-clear-sound.md`
- 리포트: `.claude/specs/2026-03-05-map-clear-sound-report.md`
- QA: `.claude/specs/2026-03-05-map-clear-sound-qa.md`

---

## 2026-03-05 -- 무료 뽑기 클릭 관통 버그 수정

### 수정

- **`js/ui/TowerPanel.js`** -- `_onAdTowerSelected()` 메서드에서 `isPaused = false` 직후 `_resumeCooldown` 100ms 쿨다운 추가 (line 699-702). 모달 "선택" 버튼의 pointerdown이 게임 씬까지 관통되어 버튼 아래 타일에 타워가 즉시 배치되는 버그 수정
- **`js/ui/TowerPanel.js`** -- `_showAdRewardModal()` 내부 취소 버튼 핸들러에서 `isPaused = false` 직후 동일한 `_resumeCooldown` 100ms 쿨다운 추가 (line 681-682). 취소 버튼 아래 타일에 의도치 않은 배치 방지

### 참고

- 기존 `_resumeGame()` (GameScene.js line 2168-2169)의 `_resumeCooldown` 패턴을 정확히 재사용. `GameScene._onPointerDown` (line 389)과 `_onPointerUp` (line 3083)이 쿨다운 중 조기 리턴하여 입력 차단
- 변경 범위: TowerPanel.js 2곳에 각 2줄 추가 (총 4줄). 다른 파일 변경 없음
- QA에서 합성 튜토리얼 확인 버튼(GameScene.js line 2129)에도 동일 패턴 미적용이 확인되었으나 현재 실질적 영향 없어 별도 이슈로 추적 권장
- 스펙: `.claude/specs/2026-03-05-gacha-click-fix.md`
- 리포트: `.claude/specs/2026-03-05-gacha-click-fix-report.md`
- QA: `.claude/specs/2026-03-05-gacha-click-fix-qa.md`

---

## 2026-03-05 -- IAP 실결제 Google Play Billing 연동

### 변경

- **`js/managers/IAPManager.js`** -- 네이티브 구매 로직 전면 재작성. `@capgo/native-purchases@^7.16.2` 플러그인을 동적 import로 로드하여 Google Play Billing에 직접 연동. 주요 메서드: `initialize()`(isBillingSupported + getProducts 프리로드), `purchaseRemoveAds()`(purchaseProduct 호출), `restorePurchases()`(getPurchases로 구매 이력 조회), `getLocalizedPrice()`(스토어 현지화 가격 반환, 폴백 $1.99), `isBillingSupportedSync()`(결제 지원 여부 동기 확인). 에러 처리: 사용자 취소(cancel/user 키워드 감지, 조용히 무시), 이미 구매됨(already/owned 키워드 감지, adFree 자동 적용), 네트워크 오류(실패 메시지 반환). 초기화 실패 시 Mock 모드로 자동 폴백
- **`js/scenes/MenuScene.js`** -- 광고제거 버튼 가격을 `iapManager.getLocalizedPrice()`로 동적 표시. `isBillingSupportedSync()` false 시 버튼 비활성화. 사용자 취소 시 에러 토스트 없이 조용히 닫기
- **`js/i18n.js`** -- `iap.removeAds.price` 폴백 가격을 ko/en 모두 `$1.99`로 통일 (기존 ko: `₩1,100`, en: `$0.99`). 신규 키 3개 추가: `iap.billingNotSupported`(결제 미지원 안내), `iap.restoreFailed`(복원 실패), `iap.restoreNotFound`(복원 대상 없음)
- **`fantasydefence/package.json`** -- `@capgo/native-purchases@^7.16.2` 의존성 추가
- **`android/app/src/main/AndroidManifest.xml`** -- `com.android.vending.BILLING` 권한 추가

### 참고

- 상품 ID: `remove_ads`, 비소모품, $1.99 USD
- 스펙에서 `restorePurchases()` API를 사용하도록 명시했으나, 해당 API가 `Promise<void>`를 반환하여 구매 목록 확인이 불가하므로 `getPurchases()`로 변경
- 스펙에서 `@capgo/native-purchases@7`(latest)을 명시했으나, v7.17.0이 `@capacitor/core>=8.0.0`을 요구하여 Capacitor 7과 호환되지 않으므로 v7.16.2로 고정
- 웹 환경에서는 기존과 동일한 Mock 모드로 동작 (즉시 성공 처리)
- Google Play Console에 `remove_ads` 인앱 상품 등록이 필요하며, 등록 전에는 폴백 가격($1.99)이 표시됨
- 스펙: `.claude/specs/2026-03-05-iap-real-billing.md`
- 리포트: `.claude/specs/2026-03-05-iap-real-billing-report.md`
- QA: `.claude/specs/2026-03-05-iap-real-billing-qa.md`

---

## 2026-03-05 -- 멀티 스폰 시스템 + 스테이지 순서 재배치

### 추가

- **`js/managers/WaveManager.js`** -- 동적 멀티 스폰 시스템 도입. 웨이브 진행도에 따라 틱당 스폰 수량이 증가하는 `_calcSpawnCount(progress)` 메서드 추가. 상수: `MULTI_SPAWN_THRESHOLD_MEDIUM=8`, `MULTI_SPAWN_THRESHOLD_LARGE=16`. 소규모 웨이브(8마리 미만) 항상 1마리/틱, 중규모(8~15마리) 50% 이후 2마리/틱, 대규모(16+마리) 50% 이후 2마리/틱 + 75% 이후 3마리/틱. 총 적 수량과 스폰 간격은 불변, 스폰 수량만 변경
- **`js/managers/WaveManager.js`** -- R21+ 생성 웨이브에 적 난이도순 정렬(`ENEMY_DIFFICULTY_ORDER`) 추가. 순서: normal(0) < fast(1) < swarm(2) < tank(3) < splitter(4) < armored(5). 보스 라운드에서는 보스가 첫 번째(bossDelay 적용), 나머지 적이 난이도순 정렬

### 변경

- **`js/data/worlds.js`** -- 각 월드 `mapIds` 배열 순서 재배치. 웨이포인트 수(경로 길이) 내림차순 정렬: 긴 경로(쉬움) → 월드 초반, 짧은 경로(어려움) → 월드 후반
- **`js/data/maps/forest.js`** -- totalWaves 재분배 (8~12), difficulty 메타데이터 조정 (초반 1, 후반 3)
- **`js/data/maps/desert.js`** -- totalWaves 재분배 (10~15), difficulty 메타데이터 조정
- **`js/data/maps/tundra.js`** -- totalWaves 재분배 (12~18), difficulty 메타데이터 조정
- **`js/data/maps/volcano.js`** -- totalWaves 재분배 (15~20), difficulty 메타데이터 조정
- **`js/data/maps/shadow.js`** -- totalWaves 재분배 (18~25), difficulty 메타데이터 조정

### 스테이지 순서 (웨이포인트 수 내림차순)

| 월드 | 순서 | 맵 ID (wp수, 웨이브수) |
|------|------|------------------------|
| Forest | 1~6 | M5(36wp,8w) → M3(30,9) → M6(28,10) → M4(26,10) → M2(24,11) → M1(18,12) |
| Desert | 1~6 | M5(31wp,10w) → M4(30,11) → M6(28,12) → M1(24,13) → M2(24,14) → M3(20,15) |
| Tundra | 1~6 | M1(40wp,12w) → M4(36,13) → M6(33,14) → M3(27,15) → M2(21,16) → M5(21,18) |
| Volcano | 1~6 | M4(30wp,15w) → M1(28,16) → M2(25,17) → M3(24,18) → M5(24,19) → M6(22,20) |
| Shadow | 1~6 | M6(36wp,18w) → M4(33,19) → M1(32,20) → M3(31,22) → M2(29,23) → M5(29,25) |

### 참고

- 멀티 스폰: 총 적 수량 불변, 스폰 간격(spawnInterval) 불변. 동시 스폰 수량만 웨이브 진행도에 따라 변경
- 난이도순 정렬: R1~R20 사전 정의 웨이브에는 적용 안 됨. R21+ 자동 생성 웨이브에만 적용
- 스테이지 재배치: 맵 데이터(그리드, 웨이포인트)는 변경 없음. mapIds 순서, totalWaves, difficulty 메타데이터만 변경

---

## 2026-03-05 -- 메타 업그레이드 시스템 재설계 (Global Meta Upgrade)

### 변경

- **`js/config.js`** -- 타워별 메타 업그레이드(`META_UPGRADE_CONFIG`) + 유틸리티 업그레이드(`UTILITY_UPGRADES`) 제거. 글로벌 메타 업그레이드 10종(`GLOBAL_META`) 신규 도입. 비용 공식: `5 + currentLevel * 3`. 헬퍼 함수 10종 추가. SAVE_DATA_VERSION 8 → 9. v8 → v9 마이그레이션: 기존 towerUpgrades + utilityUpgrades 투자 다이아 전액 환불 후 `globalUpgrades` 10종 0레벨로 초기화
- **`js/scenes/CollectionScene.js`** -- 메타 탭 UI 전면 재작성. 타워 카드 그리드 + 메타 트리 + 유틸리티 섹션 → 카테고리별(전투/경제/생존/성장) 스크롤 리스트. 각 항목: 아이콘 + 이름 + 프로그레스 바 + 레벨 + 비용/강화 버튼 + 효과 설명
- **`js/scenes/GameScene.js`** -- `_applyMetaUpgradesToTower()` → `_applyGlobalUpgradesToTower()` (damage/fireRate/range 글로벌 배율 적용). 시작골드(`getGlobalStartGold`), 기지HP(`getGlobalBaseHP`), 처치골드(`getGlobalKillGoldMult`), 웨이브보너스(`getGlobalWaveBonusMult`), 합성할인(`getGlobalMergeDiscountMult`) 글로벌 적용
- **`js/ui/TowerPanel.js`** -- 뽑기 비용에 `getGlobalDrawDiscountMult` 적용, 합성 비용에 `getGlobalMergeDiscountMult` 적용
- **`js/scenes/GameOverScene.js`** -- Diamond 획득에 `getGlobalDiamondBonusMult` 적용
- **`js/scenes/MapClearScene.js`** -- Diamond 차액 보상에 `getGlobalDiamondBonusMult` 적용
- **`js/scenes/MergeCodexScene.js`** -- `_applyMetaUpgradesToStats()` → `_applyGlobalUpgradesToStats()` (타워 타입 불필요)
- **`js/i18n.js`** -- 글로벌 업그레이드 10종 이름/설명, 카테고리 4종, UI 키 다수 추가 (ko/en)

### 글로벌 메타 업그레이드 10종

| 카테고리 | 항목 | 효과 (레벨당) | 최대레벨 |
|----------|------|---------------|----------|
| 전투 | 공격력 (⚔) | ×1.1^n | 10 |
| 전투 | 공격속도 (⚡) | ×0.9^n (빨라짐) | 10 |
| 전투 | 사거리 (🎯) | ×1.1^n | 5 |
| 경제 | 시작 골드 (💰) | +20*lv | 10 |
| 경제 | 처치 보상 (🪙) | ×1.1^n | 10 |
| 경제 | 뽑기 할인 (🏷) | ×0.95^n | 10 |
| 경제 | 합성 할인 (🔧) | ×0.95^n | 10 |
| 생존 | 기지 HP (❤) | +3*lv | 10 |
| 생존 | 웨이브 보너스 (⭐) | ×1.1^n | 10 |
| 성장 | 다이아 보너스 (💎) | ×1.1^n | 10 |

### 삭제

- **`js/config.js`** -- `META_UPGRADE_CONFIG` (타워별 3티어 x A/B 분기), `UTILITY_UPGRADES` (3종 3티어), 관련 헬퍼 함수 전체 삭제
- **`js/scenes/CollectionScene.js`** -- 타워 카드 그리드, 상세 오버레이 (3슬롯), 유틸리티 섹션 UI 전체 삭제

### 참고

- 스펙: `.claude/specs/2026-03-05-meta-upgrade-redesign.md`
- 세이브 마이그레이션 v8 → v9: 기존 투자 다이아 환불 (towerUpgrades 비용 공식 역산 + utilityUpgrades 티어별 고정 비용[8,15,30])
- 사거리(range)만 maxLevel=5, 나머지 9종은 maxLevel=10
- Playwright 테스트 39건 QA PASS

---

## 2026-03-04 -- 하단 패널 UI 리디자인 (Panel Redesign)

### 변경

- **`js/ui/TowerPanel.js`** -- 하단 패널을 2행 레이아웃으로 재편. 1행: 뽑기 버튼(X=95, Y=PANEL_Y+42, 150x44px) + 무료뽑기 버튼(X=265, Y=PANEL_Y+42, 150x44px). 2행: 배속 버튼(X=40, Y=PANEL_Y+80)을 2행 좌측으로 이동. "광고보기" 라벨을 "무료뽑기"로 변경 (adFree 여부 무관하게 `draw.ad.button` 키 고정). `_createSellButton()` 메서드 및 관련 참조(sellBg, sellIcon, sellText, showTowerInfo/hideInfo/destroy 내 참조) 전체 삭제. `_adFreeHintText` ("광고 없이 뽑기" 유도 텍스트) 전체 삭제 (constructor, _createAdDrawButton, _disableAdDrawButton 내 참조 포함)
- **`js/scenes/GameScene.js`** -- HP회복 버튼 좌표 변경 (X=320, Y=PANEL_Y+80). 소모품 버튼 3종 좌표 변경 (baseX=90, spacing=50, Y=PANEL_Y+80 → slowAll X=90, goldRain X=140, lightning X=190)
- **`js/i18n.js`** -- ko: `draw.ad.button` 값 '광고보기' -> '무료뽑기'. en: `draw.ad.button` 값 'Watch Ad' -> 'Free Draw'

### 삭제

- **`js/ui/TowerPanel.js`** -- 삭제(판매/휴지통) 버튼 (`_createSellButton` 메서드 전체). TowerInfoOverlay에 sell 버튼이 존재하므로 패널 상의 별도 버튼 불필요
- **`js/ui/TowerPanel.js`** -- "광고 없이 뽑기" 유도 텍스트 (`_adFreeHintText` 관련 코드 전체)

### 참고

- 스펙: `.claude/specs/2026-03-04-panel-redesign.md`
- 리포트: `.claude/specs/2026-03-04-panel-redesign-report.md`
- QA: `.claude/specs/2026-03-04-panel-redesign-qa.md`
- Playwright 테스트 29건 전체 PASS (정상 18 + 예외/엣지케이스 4 + 시각적 4 + 안정성 3)
- `onSell` 콜백 자체는 유지 (TowerInfoOverlay에서 동일 콜백 사용)
- `BTN_DANGER` import 유지 (`_updateSpeedHighlight`에서 사용 중)
- `draw.ad.button.adFree` i18n 키는 하위 호환을 위해 유지
- QA LOW 소견: TowerPanel.js 주석 6곳에 "광고보기" 구 라벨명 잔존 (코드 동작에 영향 없음)

---

## 2026-03-04 -- 합성 튜토리얼 (Merge Tutorial)

### 추가

- **`js/config.js`** -- SAVE_DATA_VERSION 7 -> 8. 신규 세이브 기본값에 `mergeTutorialDone: false` 추가. v7 -> v8 마이그레이션: 기존 유저는 `mergeTutorialDone = true` (이미 플레이한 유저이므로 튜토리얼 생략), 신규 유저만 `false`. Ensure v8 블록 추가
- **`js/scenes/GameScene.js`** -- `_showMergeTutorialIfNeeded()` 메서드 신규 구현. `init()`에 `_mergeTutorialOverlay` 상태 변수 추가. `create()` 마지막에 호출. 오버레이 구성: 반투명 배경(alpha 0.75, depth 60) + 패널(280x180, depth 61) + 타이틀/설명 텍스트 + 확인 버튼(120x40, depth 62). 확인 클릭 시 오버레이 제거 + `isPaused = false` + `mergeTutorialDone = true` 세이브. `_cleanup()`에 오버레이 정리 코드 추가
- **`js/i18n.js`** -- ko/en 각 4개 신규 키 추가: `tutorial.merge.title`, `tutorial.merge.desc1`, `tutorial.merge.desc2`, `tutorial.merge.confirm`

### 참고

- 스펙: `.claude/specs/2026-03-04-merge-tutorial.md`
- 리포트: `.claude/specs/2026-03-04-merge-tutorial-report.md`
- QA: `.claude/specs/2026-03-04-merge-tutorial-qa.md`
- Playwright 테스트 24건 전체 PASS (정상 12 + 예외 5 + UI/시각 5 + i18n 2)
- 오버레이 표시 중 BGM은 계속 재생 (isPaused만 설정, BGM 정지 없음)
- 확인 버튼 높이 40px (Apple HIG 권장 44px보다 약간 작으나 스펙 명시 사항)
- localStorage 쓰기 실패 시 silent ignore (다음 부팅 시 튜토리얼 재표시 가능, 허용된 동작)

---

## 2026-03-04 -- 광고제거 인앱 구매 (Remove Ads IAP)

### 추가

- **`js/managers/IAPManager.js`** -- 신규 클래스. Mock/Native 이중 구현 (AdManager 패턴 동일). `purchaseRemoveAds(registry)` 구매 실행, `restorePurchases(registry)` 구매 복원, `isAdFree(registry)` 상태 확인. `_applyAdFree(registry)` 내부 헬퍼로 saveData 갱신 + localStorage 저장 + AdManager.setAdFree() 동기화. Phaser registry에 `'iapManager'` 키로 등록
- **`js/config.js`** -- `IAP_PRODUCT_REMOVE_ADS = 'remove_ads'` 상수 추가. SAVE_DATA_VERSION 6 -> 7. v6 -> v7 마이그레이션: `adFree: false` 필드 추가. 신규 세이브 기본값에 `adFree: false` 포함
- **`js/i18n.js`** -- ko/en 각 13개 신규 키 추가: `iap.removeAds`, `iap.removeAds.price`, `iap.removeAds.purchased`, `iap.removeAds.hint`, `iap.removeAds.confirm`, `iap.removeAds.confirmDesc`, `iap.removeAds.confirmYes`, `iap.removeAds.confirmNo`, `iap.removeAds.success`, `iap.removeAds.failed`, `iap.removeAds.restored`, `draw.ad.button.adFree`, `ui.ad.reviveFree`
- **`js/scenes/MenuScene.js`** -- 광고제거 구매 버튼 (`_createRemoveAdsButton`, Y=590+offsetY, 160x34px, BTN_DANGER 스타일). 클릭 시 확인 다이얼로그 (오버레이 + 패널 + 구매하기/취소 버튼, `window.__isPurchaseDialogOpen` 플래그). 구매 완료 시 "구매완료" 비활성 표시. Diamond 받기 버튼 adFree 대응: 잔여 횟수를 `∞` 표시, 일일 제한 해제
- **`js/ui/TowerPanel.js`** -- 광고보기 버튼 라벨 adFree 대응: "무료뽑기" (`draw.ad.button.adFree`). "광고 없이 뽑기" 유도 텍스트 (Y=PANEL_Y+74, 8px 빨간색 #e74c3c, adFree 미구매 시에만 표시, 클릭 시 깜빡임 효과)
- **`js/scenes/GameOverScene.js`** -- 부활 버튼 라벨 adFree 대응: "무료 부활" (`ui.ad.reviveFree`)

### 변경

- **`js/managers/AdManager.js`** -- `_isAdFree` 필드 추가 (기본 false). `setAdFree(value)` 메서드: IAPManager에서 호출. `isAdFree()` 메서드: 현재 상태 반환. `showRewarded()`: adFree이면 광고 스킵, 즉시 `{rewarded: true}` 반환. `isAdLimitReached()`: adFree이면 항상 false 반환. `getRemainingAdCount()`: adFree이면 999 반환
- **`js/scenes/BootScene.js`** -- IAPManager import/초기화/registry 등록 추가 (AdManager 다음 순서). 부트 시 `saveData.adFree` 상태를 `adManager.setAdFree(true)` 로 동기화
- **`js/scenes/MenuScene.js`** -- 음소거/언어 버튼 Y좌표: `596+offsetY` -> `630+offsetY` (광고제거 버튼 삽입에 따른 하단 이동)

### 참고

- 스펙: `.claude/specs/2026-03-04-ad-remove-iap.md`
- 리포트: `.claude/specs/2026-03-04-ad-remove-iap-report.md`
- QA: `.claude/specs/2026-03-04-ad-remove-iap-qa.md`
- Playwright 테스트 44건 전체 PASS (정상 22 + 예외 8 + 레이아웃 14)
- 1차 QA FAIL: STATISTICS 버튼과 광고제거 버튼 25px 겹침 -> 2차 QA에서 Y좌표 수정 후 PASS
- LevelSelectScene/MapClearScene의 adFree 라벨 변경 미구현 (LOW, 해당 씬은 원래 잔여 횟수를 라벨에 표시하지 않는 구조이므로 실질적 영향 없음)
- TowerPanel 유도 텍스트는 인게임 안전성을 위해 구매 다이얼로그 대신 깜빡임 효과만 제공
- 실제 Google Play Billing 연동은 스펙 범위 외 (Mock 모드 인터페이스만 구현)
- 가격(₩1,100 / $0.99)은 플레이스홀더, 실제 스토어 연동 시 변경 예정

---

## 2026-03-04 -- 광고 보상 타워 뽑기

### 추가

- **`js/config.js`** -- `ADMOB_REWARDED_TOWER_ID` 상수 추가 (플레이스홀더 값 `ca-app-pub-9149509805250873/XXXXXXXXXX`, 실제 배포 전 교체 필요)
- **`js/i18n.js`** -- ko/en 각 8개 신규 i18n 키 추가 (`draw.ad.button`, `draw.ad.sublabel`, `draw.ad.modal.title`, `draw.ad.modal.select`, `draw.ad.modal.cancel`, `draw.ad.failed`, `draw.ad.badge.t1`, `draw.ad.badge.t2`)
- **`js/ui/TowerPanel.js`** -- 광고보기 버튼 생성 (`_createAdDrawButton`, X=240, Y=PANEL_Y+50, 120x44px), 광고 클릭 핸들러 (`_onAdDrawButtonClick`), 타워 확률 뽑기 (`_pickAdRewardTowers`, T1 90%/T2 10%), 타워 선택 모달 (`_showAdRewardModal`, depth 61, 카드 3개 90x130px), 타워 선택 처리 (`_onAdTowerSelected`, T1 직접/T2 applyMergeResult 경유), 모달 정리 (`_hideAdRewardModal`), 합성 base 타워 추출 (`_getBaseTypeForMerge`). `destroy()`에 `_hideAdRewardModal()` 호출 추가. `ADMOB_REWARDED_TOWER_ID` import 추가
- **`js/scenes/GameScene.js`** -- `_attemptPlaceTower`에 `_pendingAdTower` 감지 로직 추가: 광고 보상 타워 배치 시 cost=0, T2 타워는 `applyMergeResult(mergeData)` 적용 + `totalInvested=0` 설정. `_onTowerTypeSelect`에 T2 타워 이름 표시 대응

### 변경

- **`js/ui/TowerPanel.js`** -- 뽑기 버튼 X 좌표를 140(GAME_WIDTH/2-40)에서 80으로 좌측 이동. `_create()`에 `_createAdDrawButton()` 호출 추가

### 참고

- 스펙: `.claude/specs/2026-03-04-ad-reward-tower.md`
- 리포트: `.claude/specs/2026-03-04-ad-reward-tower-report.md`
- QA: `.claude/specs/2026-03-04-ad-reward-tower-qa.md`
- Playwright 테스트 28건 전체 PASS (정상 17 + 예외 7 + 시각적 3 + 안정성 1)
- 광고 보상 타워는 일일 횟수 제한 없음 (`isAdLimitReached()` / `incrementDailyAdCount()` 미호출)
- 광고 보상으로 획득한 T2 타워는 도감(CollectionScene) 발견 기록에 반영되지 않음 (스펙 범위 외)
- T2 타워의 `totalInvested=0`으로 판매가 0G (의도된 동작)
- `ADMOB_REWARDED_TOWER_ID`는 플레이스홀더이므로 실제 배포 전 AdMob 콘솔에서 발급한 ID로 교체 필요

---

## 2026-03-04 -- 타워 수집 시스템 (도감 발견 메커니즘)

### 추가

- **`js/config.js`** -- SAVE_DATA_VERSION 5 -> 6. v5 -> v6 마이그레이션 추가: discoveredMerges 미존재 시 빈 배열 초기화, 기존 유저 T2 전체 발견 처리(tier === 2인 MERGE_RECIPES 전부 discoveredMerges에 추가), newDiscoveries 빈 배열 추가. 신규 세이브 기본값에 newDiscoveries: [] 추가. ensure 섹션에 newDiscoveries 보장
- **`js/scenes/MergeCodexScene.js`** -- 전체 재작성. `_isTowerDiscovered()` 유틸리티 메서드 추가 (T1은 항상 true, T2+는 saveData.discoveredMerges 포함 여부). 발견/미발견 카드 분기 렌더링: 발견 시 컬러 카드, 미발견 시 실루엣(0x222222 + "?"). T3+ 재료 양쪽 미발견 시 카드 자체 숨김. 재료 발견 상태별 힌트 텍스트("재료A + ???" 등). 진행률 `T{n}: {discovered}/{total}` 형식으로 변경(i18n 키 `codex.progressDiscovery`). 미발견 카드 클릭 시 토스트 표시. 신규 발견 빨간 점(카드 우상단, 반지름 5px). 카드 클릭 시 `_clearNewDiscovery()`로 newDiscoveries에서 제거 + 빨간 점 제거 + 세이브
- **`js/scenes/GameScene.js`** -- `_registerMergeDiscovery()` 수정: 신규 발견 시 newDiscoveries에도 추가, boolean 반환, `_showDiscoveryPopup()` 호출. `_showDiscoveryPopup()` 신규 메서드: 반투명 배경(alpha 0.6) + 중앙 패널(280x320px) + 타워 아이콘/이름/티어/공격유형 배지 + 확인 버튼 + 스케일 애니메이션(0.8->1.0, 200ms Back.easeOut). 확인 또는 배경 클릭 시 닫힘. 게임 일시정지 없음
- **`js/scenes/CollectionScene.js`** -- 합성 도감 탭 버튼에 `saveData.newDiscoveries.length > 0` 시 빨간 점(반지름 5px) 표시
- **`js/ui/TowerInfoOverlay.js`** -- `_isTowerDiscovered()` 메서드 추가(localStorage에서 파싱). 상위 조합 섹션(`_renderUsedInSection`)에서 미발견 결과 타워를 "T{n} ???" 로 표시 + 드릴다운 차단. 재료 노드(`_renderMaterialNode`)에서 미발견 재료를 실루엣(0x222222 + "?") + ??? 표시 + 드릴다운 차단
- **`js/i18n.js`** -- 도감 발견 시스템 i18n 키 7개 추가 (ko/en 양쪽): `discovery.new`, `discovery.confirm`, `discovery.undiscovered`, `discovery.undiscoveredToast`, `discovery.hintUnknown`, `codex.discovered`, `codex.progressDiscovery`

### 변경

- **`js/scenes/MergeCodexScene.js`** -- 기존 진행률 텍스트 `codex.progress`("T{n}: {total}종")를 `codex.progressDiscovery`("T{n}: {discovered}/{total}")로 변경. 카드 전부 공개 방식에서 발견 여부 기반 분기 표시로 변경

### 참고

- 스펙: `.claude/specs/2026-03-04-tower-collection-discovery.md`
- 리포트: `.claude/specs/2026-03-04-tower-collection-discovery-report.md`
- QA: `.claude/specs/2026-03-04-tower-collection-discovery-qa.md`
- 코드 리뷰 6개 파일 전체 PASS, vite build PASS (4.30s)
- TowerInfoOverlay._isTowerDiscovered에서 매번 localStorage 파싱하지만 호출 빈도가 낮아 성능 영향 미미

---

## 2026-03-03 -- 언어 전환 버튼 (Lang Toggle)

### 추가

- **`js/config.js`** -- `LANG_SAVE_KEY = 'fantasy-td-lang'` localStorage 키 상수 추가 (1698~1699행). i18n.js에서는 순환 의존 방지를 위해 직접 참조하지 않고 리터럴 문자열 사용
- **`js/i18n.js`** -- `SUPPORTED_LOCALES = ['ko', 'en']` export 추가. 모듈 초기화 시 `localStorage.getItem('fantasy-td-lang')`으로 저장된 언어 복원 (try/catch). `setLocale()`에 `localStorage.setItem()` 저장 추가 (try/catch)
- **`js/scenes/MenuScene.js`** -- 언어 토글 버튼 추가 (`centerX + 48`, Y=596+offsetY, 80x26, `btn_small_back` 텍스처). 레이블: ko='한국어', en='English'. 클릭 시 `SUPPORTED_LOCALES` 순환 전환 + `this.scene.restart()`로 전체 텍스트 갱신

### 변경

- **`js/scenes/MenuScene.js`** -- 음소거 토글 버튼 X 좌표를 `centerX`에서 `centerX - 48`로 좌측 이동 (언어 버튼과 16px 간격 확보)
- **`js/scenes/MenuScene.js`** -- import에 `setLocale`, `getLocale`, `SUPPORTED_LOCALES` 추가 (`../i18n.js`)

### 참고

- 스펙: `.claude/specs/2026-03-03-lang-toggle.md`
- 리포트: `.claude/specs/2026-03-03-lang-toggle-report.md`
- QA: `.claude/specs/2026-03-03-lang-toggle-qa.md`
- Playwright 테스트 21건 전체 PASS (정상 10 + 예외 6 + UI 안정성 5)
- BootScene 변경 없음 (i18n.js 모듈 초기화 시 자동 복원으로 충분)
- `LANG_SAVE_KEY` 상수는 i18n.js에서 미사용 (순환 의존 방지, 문서화 목적)

---

## 2026-03-03 -- i18n 하드코딩 텍스트 t() 전환

### 추가

- **`js/i18n.js`** -- 신규 i18n 키 16개 추가 (ko/en 양쪽): `tower.statLine`, `ui.backLabel`, `stats.recentInfo`, `stats.recentBoss`, `collection.tier`, `collection.tierLabel`, `collection.effectBaseHp`, `collection.effectGoldBoost`, `collection.effectSpeedBoost`, `collection.currentStatus`, `collection.upgrade`, `endless.waveInfinity`, `endless.waveCount`, `pause.sfx`, `pause.bgm`, `ui.backNav`. 총 키 수 467개 (ko = en)

### 변경

- **`js/scenes/StatsScene.js`** -- Recent Games의 kills/Boss 하드코딩 텍스트를 `t('stats.recentInfo')`, `t('stats.recentBoss')`로 전환 (2개소)
- **`js/scenes/GameOverScene.js`** -- 기존 약 15개소 하드코딩 텍스트 t() 전환 (1차 작업 범위)
- **`js/scenes/GameScene.js`** -- SFX/BGM 볼륨 라벨을 `t('pause.sfx')`, `t('pause.bgm')`으로 전환 + 기존 약 10개소 전환 (합계 약 12개소)
- **`js/scenes/MenuScene.js`** -- 3개소 하드코딩 텍스트 t() 전환
- **`js/scenes/CollectionScene.js`** -- Tier 표시, 기본 효과 텍스트(HP:20, 250G, 1.0x), UP 버튼, Current 상태, 티어 라벨을 t() 전환 (8개소)
- **`js/scenes/MergeCodexScene.js`** -- 1개소 하드코딩 텍스트 t() 전환
- **`js/scenes/MapClearScene.js`** -- 1개소 하드코딩 텍스트 t() 전환
- **`js/scenes/EndlessMapSelectScene.js`** -- Wave 표시를 `t('endless.waveInfinity')`, `t('endless.waveCount')`로 전환 (3개소)
- **`js/ui/TowerInfoOverlay.js`** -- 판매 버튼을 `t('tower.sell')`로 전환, 뒤로 버튼을 `t('ui.backLabel')`로 전환, T1/T2+ 스탯 라인을 `t('tower.statLine')`으로 전환 (4개소)

### 수정

- **`js/i18n.js`** -- ko `tower.sell` 값이 영어 `'Sell {price}G'`로 잘못 되어 있던 것을 `'판매 {price}G'`로 수정

### 참고

- 스펙: `.claude/specs/2026-03-03-i18n-hardcode-fix.md`
- 리포트: `.claude/specs/2026-03-03-i18n-hardcode-fix-report.md`
- QA: `.claude/specs/2026-03-03-i18n-hardcode-fix-qa-r2.md`
- Playwright 테스트 27건 전체 PASS
- 1차 QA FAIL (ko tower.sell 번역 버그 + TowerInfoOverlay Sell 미전환) 수정 후 R2 PASS
- 스코프 외 잔존 하드코딩: LevelSelectScene `Wave: ${totalW}` (LOW), CollectionScene `${displayName} Tower` (LOW), MenuScene 브랜드명 (INFO), TowerInfoOverlay 공격 유형 배지 (INFO), GameScene 음소거 아이콘 (INFO) -- 별도 과제

---

## 2026-03-03 -- 랜덤 뽑기 시스템 Phase 3: 이코노미 리밸런스

### 변경

- **`js/config.js`** -- `INITIAL_GOLD` 200 -> 160으로 하향 조정. 뽑기 시스템 도입(첫 뽑기 80G)에 맞춘 재조정. 주석에 변경 이력 `250→200→160` 반영

### 참고

- 스펙: `.claude/specs/2026-03-03-random-draw-system.md` (Phase 3)
- 리포트: `.claude/specs/2026-03-03-random-draw-system-p3-report.md`
- QA: `.claude/specs/2026-03-03-random-draw-system-p3-qa.md`
- Playwright 테스트 23건 전체 PASS + 시각적 검증 3건
- Gold Boost 메타 업그레이드 수치(T1=275G, T2=300G, T3=350G)는 사용자 요청에 따라 기존 유지. INITIAL_GOLD=160 기준으로 상대적 보너스 효과 증가 (의도적)
- 스펙 수용 기준 #2("2회 뽑기 가능")은 수학 오류: 실제 2회 비용은 80+100=180G. 160G로는 첫 뽑기(80G)만 가능하며 이는 "살짝 부족하게" 의도된 설계
- 웨이브 클리어 보상, 적 처치 골드 보상, 합성 비용(MERGE_COST)은 변경 없음

---

## 2026-03-03 -- 랜덤 뽑기 시스템 Phase 2: 타워 드래그 이동

### 추가

- **`js/managers/MapManager.js`** -- `moveTower(fromCol, fromRow, toCol, toRow, tower)` 메서드 추가. 내부 `towerMap`에서 기존 셀 키를 `delete`하고 새 셀 키에 `set`하여 타워 위치 갱신. 그래픽 좌표 변경은 호출부(GameScene)에서 처리

### 변경

- **`js/ui/TowerPanel.js`** -- `startDrag(tower, pointer)`: 드래그 시작 시 `callbacks.onDragStart()` 콜백 호출 추가(빈 셀 하이라이트 표시 트리거). `endDrag(pointer, getTowerAt, isBuildable)`: 세 번째 파라미터 `isBuildable` 추가(하위 호환: `isBuildable && isBuildable(col, row)` 패턴으로 미전달 시 falsy 처리). 빈 배치 가능 셀 드롭 시 `callbacks.onMove(towerA, col, row)` 호출 분기 추가. 드래그 종료 시 `callbacks.onDragEnd()` 콜백 호출 추가(하이라이트 제거 트리거)
- **`js/scenes/GameScene.js`** -- `gridToPixel` import 추가. TowerPanel 생성 콜백에 `onMove`, `onDragStart`, `onDragEnd` 3개 콜백 추가. `endDrag` 호출부에 `isBuildable` 파라미터 전달 추가. `_onTowerMove(tower, col, row)` 핸들러 신규 구현: `mapManager.moveTower()` -> 타워 `col`/`row`/`x`/`y` 좌표 갱신 -> sprite 위치 갱신 -> `hideRangeCircle()` + `draw()` + alpha 복원

### 참고

- 스펙: `.claude/specs/2026-03-03-random-draw-system.md` (Phase 2)
- 리포트: `.claude/specs/2026-03-03-random-draw-system-p2-report.md`
- QA: `.claude/specs/2026-03-03-random-draw-system-p2-qa.md`
- Playwright 테스트 30건 전체 PASS + 시각적 검증 3건
- 이동 비용 무료 (골드 차감 없음)
- 강화된 타워(enhanceLevel > 0)는 기존 제약 유지 -- 드래그 자체 불가
- 합성 가능 타워 위 드롭 시 기존 합성 동작 그대로 실행
- 합성 불가 타워 위 드롭 / 배치 불가 셀 드롭 시 흔들기 피드백 후 원위치 복원
- QA 소견(LOW 2건): depth 미갱신(체감 영향 극히 낮음), 드래그 중 sprite alpha 미숨김(기존 합성 드래그와 동일 동작)

---

## 2026-03-03 -- 랜덤 뽑기 시스템 Phase 1

### 추가

- **`js/config.js`** -- 뽑기 비용 상수 `DRAW_BASE_COST`(80), `DRAW_COST_INCREMENT`(20) 및 `calcDrawCost(drawCount)` 함수 추가. 비용 공식: `80 + 20 * drawCount`
- **`js/i18n.js`** -- 뽑기 관련 텍스트 5종 추가 (ko/en 동시): `draw.button`, `draw.result`, `draw.noGold`, `draw.pool.title`, `draw.pool.prob`

### 변경

- **`js/ui/TowerPanel.js`** -- 기존 2행 5열 타워 선택 버튼 10개 제거, 단일 뽑기 버튼으로 대체. `_createTowerButtons()`/`_createButtonRow()`/`_drawTowerIcon()` 메서드 삭제. 신규 필드: `drawCount`(세션 내 뽑기 성공 횟수), `_pendingDrawType`(뽑기로 선택된 타워 타입). 신규 메서드: `_createDrawButton()`, `_onDrawButtonClick()`, `incrementDrawCount()`, `cancelDraw()`, `_showDrawPool()`. `updateAffordability(gold)`를 뽑기 비용 기준으로 변경 (부족 시 alpha 0.5 + 빨간 비용 텍스트). 롱프레스(400ms) 시 해금 타워 목록/확률 팝업 표시
- **`js/scenes/GameScene.js`** -- `calcDrawCost` import 추가. `_onTowerTypeSelect(type)`: 뽑기 경유 시 결과 플로팅 텍스트 1.5초 표시(`_showFloatingDrawResult`). `_attemptPlaceTower(type, col, row)`: `_pendingDrawType` 기반 비용 분기 (뽑기 비용 vs TOWER_STATS 비용), 배치 성공 시 `incrementDrawCount()` 호출. `_onDeselect()`: `cancelDraw()` 호출 추가

### 참고

- 스펙: `.claude/specs/2026-03-03-random-draw-system.md` (Phase 1)
- 리포트: `.claude/specs/2026-03-03-random-draw-system-p1-report.md`
- QA: `.claude/specs/2026-03-03-random-draw-system-p1-qa.md`
- Playwright 테스트 29건 전체 PASS + 시각적 검증 6건
- 뽑기 횟수(`drawCount`)는 세션 단위 관리 (저장 불필요, 게임 재시작 시 0으로 초기화)
- 기존 합성 시스템(드래그 합성, 합성 비용, 합성 하이라이트)은 변경 없음
- 개별 타워 직접 선택 배치는 불가 (설계 의도)

---

## 2026-03-03 -- Sell 버튼 패널 하단 고정 배치

### 변경

- **`js/ui/TowerInfoOverlay.js`** -- `_renderActionButtons()` 시그니처에 `panelY`, `panelH` 파라미터 추가(L770). Sell 버튼 Y 좌표를 콘텐츠 직하단 동적 배치(`curY`)에서 패널 하단 고정 배치(`sellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8`, L826)로 변경. panelY=320, panelH=630 기준 sellY=567 고정. 강화 버튼/최대 강화 텍스트는 기존 위치(`buttonsTopY + 10`) 그대로 유지. `_render()` 호출부(L231)에서 `panelY`, `panelH`를 추가 전달. JSDoc(L761-768) 갱신

### 참고

- 스펙: `.claude/specs/2026-03-03-sell-button-reposition.md`
- QA: `.claude/specs/2026-03-03-sell-button-reposition-qa.md`
- Playwright 테스트 23건 전체 PASS + 시각적 검증 5건
- 변경 목적: 상위 조합 텍스트 목록과 Sell 버튼이 근접하여 발생하던 오탭 문제 해소
- sellBtnW(200), sellBtnH(32), BTN_DANGER 스타일, onSell 콜백 + forceClose 동작은 변경 없음

---

## 2026-03-03 -- 광고 로딩/표시 중 네비게이션 버튼 Race Condition 방지

### 추가

- **`js/managers/AdManager.js`** -- `isBusy: boolean` 퍼블릭 프로퍼티 추가(L47). `showInterstitial()`(L115) 및 `showRewarded()`(L148) 진입 시 `true`, Mock 경로 `return` 전 `false`, try/catch를 try/catch/finally로 변환하여 finally에서 `false` 복원. 성공/실패 무관하게 플래그 복원 보장

### 수정

- **`js/scenes/LevelSelectScene.js`** -- BACK(L80-81), START(L212-213) 핸들러에 `adManager?.isBusy` 가드 추가. `_createGoldBoostButton`(L332), `_createClearBoostButton`(L420)의 `showRewarded` await 후 `this.scene.isActive('LevelSelectScene')` 체크 추가
- **`js/scenes/MenuScene.js`** -- CAMPAIGN(L124-125), ENDLESS(L151-152), COLLECTION(L195-196), STATISTICS(L218-219) 핸들러에 `adManager?.isBusy` 가드 추가. `_createDiamondAdButton`(L339)의 `showRewarded` await 후 `this.scene.isActive('MenuScene')` 체크 추가
- **`js/scenes/GameOverScene.js`** -- RETRY(L267-268), WORLD MAP(L294-295), MENU 캠페인(L317-318), MENU 엔드리스(L340-341) 핸들러에 `adManager?.isBusy` 가드 추가. `_createReviveButton`(L402)의 `showRewarded` await 후 `this.scene.isActive('GameOverScene')` 체크 추가
- **`js/scenes/MapClearScene.js`** -- NEXT MAP(L352-353), RETRY(L384-385), WORLD MAP(L411-412) 핸들러에 `adManager?.isBusy` 가드 추가(`_ensureSaved()` 이전 배치). `_createClearBoostButton`(L461)의 `showRewarded` await 후 `this.scene.isActive('MapClearScene')` 체크 추가

### 참고

- 스펙: `.claude/specs/2026-03-03-ad-busy-guard.md`
- QA: `.claude/specs/2026-03-03-ad-busy-guard-qa.md`
- Playwright 테스트 26건 전체 PASS + 시각적 검증 4건
- 가드 패턴: `const adManager = this.registry.get('adManager'); if (adManager?.isBusy) return;` (옵셔널 체이닝, adManager null 시 falsy 처리)
- 기존 `isProcessing` 로컬 가드는 그대로 유지 (광고 버튼 자체의 중복 탭 방지)
- 가드 적용: 네비게이션 버튼 14개 + isActive 씬 체크 5개

---

## 2026-03-03 -- 합성도감 BACK 버튼 이벤트 가로채기 버그 수정

### 수정

- **`js/scenes/MergeCodexScene.js`** -- `_createTopBar()` 내 상단 바 요소 4개(배경 rectangle, backBg, BACK 텍스트, 타이틀 텍스트)의 depth를 기본값 0에서 10으로 상향. 카드 컨테이너(depth 6), 서브탭(depth 8)보다 높게 설정하여 BACK 버튼이 스크롤된 카드보다 먼저 이벤트를 수신하도록 수정 (L167-192)
- **`js/scenes/MergeCodexScene.js`** -- `_buildCodexContent()`에서 `this._codexCardBgs = []` 배열 초기화(L357), `_createCodexCard()`에서 카드 bg와 baseY를 배열에 등록(L397), `_applyCodexScroll()`에서 각 카드의 worldY를 계산하여 visible 영역(CODEX_GRID_Y=104 ~ GAME_HEIGHT) 밖 카드의 interactive를 `disableInteractive()`로 비활성화(L570-581)

### 참고

- 스펙: `.claude/specs/2026-03-03-codex-back-button-fix.md`
- QA: `.claude/specs/2026-03-03-codex-back-button-fix-qa.md`
- Playwright 테스트 27건 (26 PASS / 1 환경 이슈 SKIP)
- 수정 범위: `MergeCodexScene.js` 단일 파일
- depth 계층: 상단 바(10) > 서브탭(8) > 카드 컨테이너(6) > TowerInfoOverlay codex 모드(50)

---

## 2026-03-03 -- 체인 공격 감쇠 공식 변경 (삼각수 지수 감쇠)

### 변경

- **`js/scenes/GameScene.js`** -- `_applyChain` 메서드의 체인 데미지 감쇠 공식을 선형 지수(`decay^n`)에서 삼각수 지수(`decay^(n*(n+1)/2)`)로 변경. 구현: `currentDamage *= Math.pow(chainDecay, i + 1)` (L1076-1078)
- **`tools/balance-simulator.mjs`** -- `chainMultiplier` 함수 동일 공식 적용 (L378-387)
- **`tools/balance-sim.js`** -- `case 'chain'` 블록 동일 공식 적용 (L960-961)

### 영향

- 고타수 체인 타워의 실효 DPS가 대폭 감소한다. chainMultiplier(16, decay=0.9) 기준: 8.15x -> 3.91x (-52%)
- 타워 스탯(`chainCount`, `chainDecay`, `damage` 등)은 변경 없음
- AoE, splash, beam 등 체인 외 공격 타입은 영향 없음
- 디버프(슬로우, 화상, 독, 밀치기) 적용 로직은 변경 없음

### 참고

- 스펙: `.claude/specs/2026-03-03-chain-decay-exponential.md`
- QA: `.claude/specs/2026-03-03-chain-decay-exponential-qa.md`
- Playwright 테스트 28건 전체 PASS
- 세이브 데이터 변경 없음 (SAVE_DATA_VERSION 4 유지)

---

## 2026-03-03 -- 밸런스 전면 조정 (Balance Overhaul)

### 추가

- **`js/config.js`** -- `MAX_TOWER_COUNT = 30` 타워 배치 슬롯 상한 상수 추가
- **`js/config.js`** -- `MERGE_COST = {2:30, 3:80, 4:150, 5:250}` 합성 티어별 골드 비용 상수 추가
- **`js/config.js`** -- `calcHpScale()` HP 스케일링 함수 신규 (R21-35: 0.20/R, R36-50: 0.30/R, R51+: 0.45/R)
- **`js/config.js`** -- `getBossHpMultiplier()` 보스 HP 배율 함수 신규 (<=R30: 3.0x, <=R40: 4.0x, R41+: 5.0x)
- **`js/config.js`** -- `calcWaveClearBonus()` 웨이브 클리어 보너스 공식 함수 신규 (`round * 3 + floor(HP/maxHP * 8)`)
- **`js/ui/HUD.js`** -- `updateTowerCount(count, max)` 메서드 추가. 타워 카운트 텍스트(x=230), 80% 이상 노란색, 100% 빨간색 경고 색상
- **`js/i18n.js`** -- 4개 키 추가: `merge.cost`, `merge.noGold`, `tower.limit`, `hud.towers` (ko/en)
- **`tools/balance-simulator.mjs`** -- Node.js 헤드리스 밸런스 시뮬레이터 (Phaser 의존성 없음, 5개 AI 전략 시나리오, CLI 지원)

### 변경

- **`js/config.js`** -- `INITIAL_GOLD` 250 -> 200
- **`js/config.js`** -- `SELL_RATIO` 0.6 -> 0.5
- **`js/config.js`** -- T5 star_forge: burnDamage 120->50, burnDuration 12->8
- **`js/config.js`** -- T5 omega_herald: chainCount 20->16, burnDamage 40->25, burnDuration 10->7, poisonDamage 30->18, poisonDuration 12->8
- **`js/config.js`** -- T5 extinction_engine: poisonDamage 30->18, poisonDuration 12->8, burnDamage 35->20, burnDuration 9->6
- **`js/config.js`** -- T5 absolute_dominion: chainCount 18->14, chainDecay 0.92->0.88
- **`js/config.js`** -- T5 void_maelstrom: burnDamage 50->30, burnDuration 10->7, poisonDamage 40->25, poisonDuration 12->8
- **`js/scenes/GameScene.js`** -- `_onTowerMerge()`: 합성 비용 체크 + 골드 차감 로직 추가, totalInvested에 mergeCost 합산
- **`js/scenes/GameScene.js`** -- `_buyAndPlaceTower()`: `MAX_TOWER_COUNT` 체크 + 초과 시 경고 메시지
- **`js/scenes/GameScene.js`** -- `update()`: 매 프레임 HUD 타워 카운트 갱신
- **`js/ui/TowerPanel.js`** -- 합성 미리보기 버블에 비용 표시 (`MERGE_COST[tier]`), 골드 부족 시 빨간색

### 수정

- **`js/scenes/GameScene.js`** -- 합성 골드 부족 시 드래그된 타워 투명화 버그 수정 (`towerA.graphics.setAlpha(1)` 복원 추가)

### 참고

- 스펙: `.claude/specs/2026-03-03-balance-overhaul.md`
- QA: `.claude/specs/2026-03-03-balance-overhaul-qa.md`
- 1차 QA FAIL (합성 실패 시 타워 alpha=0 잔류 버그) -> 수정 후 PASS
- 세이브 데이터 변경 없음 (SAVE_DATA_VERSION 4 유지)
- Gold Boost 메타 업그레이드 Tier 값(275/300/350G)은 기존 INITIAL_GOLD=250 기준이며, 200G 변경 후 상대적 효과 증가됨 (의도된 사항으로 유지)

---

## 2026-03-02 -- AdMob 통합 Phase 4 (일일 제한 시스템 검증 + 통합 QA) -- AdMob 통합 완료

### 검증 완료 (코드 변경 없음)

- **일일 제한 시스템 전수 검증** -- AdManager.js의 `_getToday()` YYYY-MM-DD 형식, `_ensureTodayData()` 자정 리셋, `getDailyAdCount()`/`incrementDailyAdCount()`/`isAdLimitReached()`/`getRemainingAdCount()` 전체 동작 확인
- **AD_LIMITS 매핑 정확성** -- `diamond: AD_LIMIT_DIAMOND(5)`, `goldBoost: AD_LIMIT_GOLD_BOOST(3)`, `clearBoost: AD_LIMIT_CLEAR_BOOST(3)` -- config.js 상수 사용, 하드코딩 없음
- **각 씬별 일일 제한 사용** -- MenuScene(diamond), LevelSelectScene(goldBoost/clearBoost), MapClearScene(clearBoost 카운터 공유), GameOverScene(부활은 판당 1회, 일일 제한 아님) 전부 확인
- **카운터 증가 타이밍** -- 모든 씬에서 `result.rewarded === true` 일 때만 `incrementDailyAdCount` 호출, 실패 시 미호출 확인
- **localStorage 에러 내성** -- `_loadDailyLimits()` 파싱 실패 시 기본값, `_saveDailyLimits()` 저장 실패 시 무시 확인
- **전면 광고 검증** -- GameOverScene 진입 시 showInterstitial 호출, MapClearScene 진입 시 미호출, AdManager 부재 시 0.5초 폴백 확인
- **코드 품질** -- 한국어 주석 완비, i18n 10개 키 ko/en 등록 완료, 모든 광고 버튼 isProcessing 중복 탭 방지, 불필요한 console.log 없음

### 참고

- 스펙: `.claude/specs/2026-03-02-admob-integration.md`
- Phase 4 리포트: `.claude/specs/2026-03-02-admob-integration-phase4-report.md`
- Phase 4 QA: `.claude/specs/2026-03-02-admob-integration-phase4-qa.md`
- Phase 4는 코드 변경 없이 Phase 1-3 구현의 검증만 수행. 모든 항목이 올바르게 구현되어 있어 수정 불필요
- **Playwright 테스트 48개 전체 PASS** (일일 제한 8 + 전면 광고 2 + Diamond 3 + 부활 4 + Gold 2배 3 + 클리어 2배 3 + 교차 기능 3 + Mock 3 + 비기능 4 + 시각적 5 + 엣지케이스 7 + 회귀 3)
- AdMob 통합 전체 완료 (Phase 1~4). 네이티브(Android) 실제 광고 테스트는 APK 빌드 후 별도 수행 필요

---

## 2026-03-02 -- AdMob 통합 Phase 3 (보상형 광고: Gold 2배 부스트 + 클리어 보상 2배)

### 추가

- **`js/scenes/LevelSelectScene.js`** -- 각 해금 맵 카드에 "2배 골드" / "보상 2배" 소형 광고 버튼 2개 배치 (`_createGoldBoostButton`, `_createClearBoostButton`). 70x18px 버튼, 카드 좌측 하단에 횡으로 배치 (cardLeft+38, cardLeft+114). 활성화 시 녹색(0x00b894) + 금색 "ON" 텍스트, 한도 소진 시 회색(BTN_SELL) 비활성화, 기본 상태 퍼플(BTN_META) 배경. `_goldBoostActiveFor`/`_clearBoostActiveFor`로 맵 ID별 활성 상태 추적. START 버튼 클릭 시 `goldBoostActive`/`clearBoostActive` 플래그를 GameScene에 전달
- **`js/scenes/MapClearScene.js`** -- "보상 2배" 사후 광고 버튼 추가 (`_createClearBoostButton`). 120x22px 퍼플 메타 버튼, 별점 등급 텍스트 아래(centerY+58)에 배치. `clearBoostActive` 미활성 + 보상 > 0 + 한도 미초과 시에만 표시. 광고 완료 후 보상 재계산(baseDiamond * AD_CLEAR_BOOST_MULTIPLIER) + 다이아몬드 텍스트 "(x2)" 갱신 + 버튼 숨김. `_applyDiamondAndSave()`/`_ensureSaved()` 세이브 안전장치 추가. `_saved` 플래그로 이중 저장 방지
- **`js/i18n.js`** -- 광고 UI 텍스트 4개 키 추가 (ko/en 양쪽): `ui.ad.goldBoost`(2배 골드/2x Gold), `ui.ad.clearBoost`(보상 2배/2x Reward), `ui.ad.goldBoostActive`(2배 골드 ON/2x Gold ON), `ui.ad.clearBoostActive`(보상 2배 ON/2x Reward ON)

### 변경

- **`js/scenes/GameScene.js`** -- `init()`에 `goldBoostActive`(boolean)/`clearBoostActive`(boolean) 파라미터 추가. 적 처치 골드(line 753)와 웨이브 클리어 보너스(line 1495)에 `AD_GOLD_BOOST_MULTIPLIER`(=2) 배율 적용. Gold Rain 소모품과 곱셈 결합(`enemy.gold * goldRainMultiplier * adGoldMultiplier`). 타워 판매 환불에는 미적용. MapClearScene 전환 시 `clearBoostActive` 플래그 전달(line 1555)
- **`js/scenes/MapClearScene.js`** -- `init()`에 `clearBoostActive` 파라미터 수신. `create()`에서 보상 계산을 `baseDiamond * boostMultiplier` 방식으로 변경 (clearBoostActive 시 `AD_CLEAR_BOOST_MULTIPLIER`=2 적용). 세이브 저장을 즉시/지연 분기: 사후 광고 가능성이 있으면 지연, 씬 전환 전 `_ensureSaved()`로 안전 저장
- **`js/scenes/LevelSelectScene.js`** -- `init()`에 `_goldBoostActiveFor`/`_clearBoostActiveFor` 상태 추가. `AD_LIMIT_GOLD_BOOST`, `AD_LIMIT_CLEAR_BOOST`, `ADMOB_REWARDED_GOLD_BOOST_ID`, `ADMOB_REWARDED_CLEAR_BOOST_ID`, `BTN_META`, `BTN_SELL` import 추가

### 참고

- 스펙: `.claude/specs/2026-03-02-admob-integration.md`
- QA: `.claude/specs/2026-03-02-admob-integration-phase3-qa.md`
- 골드 부스트 적용 범위: 적 처치 골드와 웨이브 클리어 보너스에만 2배 적용. 타워 판매 환불에는 미적용 (투자금 회수이므로 게임플레이 보상이 아님)
- Gold Rain 소모품(2x)과 광고 골드 부스트(2x) 동시 활성 시 최대 4배 골드 획득
- clearBoost 일일 카운터는 LevelSelectScene(사전)과 MapClearScene(사후) 양쪽에서 같은 'clearBoost' 키를 공유
- goldBoost는 해당 판에서만 유효하며, 게임 종료(GameOver/MapClear) 시 자동 소멸 (플래그가 init 시점에만 전달되므로)
- Phase 4에서 통합 QA (일일 제한 전체 검증, Mock 모드 Playwright 테스트) 예정

---

## 2026-03-02 -- AdMob 통합 Phase 2 (보상형 광고: Diamond 지급 + 부활)

### 추가

- **`js/scenes/MenuScene.js`** -- "Diamond 받기" 보상형 광고 버튼 추가 (`_createDiamondAdButton`). 소형 140x26px 퍼플 메타 버튼, 잔여 횟수 `(N/5)` 표시, 5회 소진 시 회색 비활성화 + "오늘 한도 초과" 텍스트. 광고 시청 완료 시 `saveData.diamond += 3` 즉시 지급 + localStorage 저장 + 화면 텍스트 갱신. 중복 탭 방지(`isProcessing`), AdManager null 가드, saveData null 가드 포함
- **`js/scenes/GameOverScene.js`** -- "광고 보고 부활" 버튼 추가 (`_createReviveButton`, `_doRevive`). 중형 160x36px 퍼플 메타 버튼, RETRY 위(centerY+58)에 배치. `revived !== true`일 때만 표시(판당 1회). 부활 시 fadeOut 후 GameScene으로 `{ mapData, gameMode, revived: true, startWave: round }` 전달. 광고 실패 시 에러 메시지 표시 + 버튼 재활성화. 부활 버튼 표시 시 패널 높이 +56px, 하위 버튼들 +28px 이동
- **`js/i18n.js`** -- 광고 관련 UI 텍스트 6개 키 추가 (ko/en 양쪽): `ui.ad.revive`, `ui.ad.diamond`, `ui.ad.loading`, `ui.ad.failed`, `ui.ad.limitReached`, `ui.ad.remaining`

### 변경

- **`js/scenes/GameScene.js`** -- `init()`에 `revived`(boolean)/`startWave`(number) 파라미터 추가. `create()`에서 부활 시 기지 HP를 `Math.ceil(maxBaseHP * AD_REVIVE_HP_RATIO)` (최대 HP의 50%)로 설정하고, `waveManager.currentWave = startWave` 후 `_announceWave()`로 해당 웨이브부터 재개. `_gameOver()`에서 `revived: this.revived` 플래그를 GameOverScene에 전달하여 재 게임오버 시 부활 버튼 숨김. `AD_REVIVE_HP_RATIO` import 추가
- **`js/scenes/MenuScene.js`** -- `AD_REWARD_DIAMOND`, `AD_LIMIT_DIAMOND`, `ADMOB_REWARDED_DIAMOND_ID`, `SAVE_KEY` import 추가. 다이아몬드 텍스트 참조 `_diamondText` 보관. 최고 기록 Y 위치를 315->328로 13px 하향 이동하여 Diamond 버튼 공간 확보
- **`js/scenes/GameOverScene.js`** -- `init()`에 `revived` 파라미터 수신. `ADMOB_REWARDED_REVIVE_ID`, `BTN_META` import 추가. 패널 높이 동적 계산 (`reviveExtra = canRevive ? 56 : 0`)

### 참고

- 스펙: `.claude/specs/2026-03-02-admob-integration.md`
- QA: `.claude/specs/2026-03-02-admob-integration-phase2-qa.md`
- 부활 시 GameScene을 `scene.start()`로 새로 시작하므로 타워 배치, 골드, 적 위치 등은 초기화된다. 해당 웨이브부터 시작하지만 기존 타워와 골드는 리셋된다 (스펙에 명시된 설계)
- `waveManager._announceWave()`는 private 메서드 외부 접근이나, JavaScript에서 접근 가능하며 코드베이스에서 유사 패턴 사용. 향후 public 래퍼 추가 권장
- `ui.ad.remaining` i18n 키가 정의되어 있으나 코드에서 미사용 (수동 문자열 조합으로 대체). 미사용 키 정리 권장
- 모바일 뷰포트에서 GameOverScene의 "(Total: ...)" 텍스트와 부활 버튼이 근접하나 겹침은 아님 (LOW 이슈)
- Phase 3에서 Gold 2배 부스트 + 클리어 보상 2배 보상형 광고 추가 예정

---

## 2026-03-02 -- AdMob 통합 Phase 1 (전면 광고 + AdManager 기반)

### 추가

- **`js/managers/AdManager.js`** -- AdMob 플러그인 래핑 클래스 (261줄). 네이티브 환경에서 `@capacitor-community/admob` 플러그인을 동적 import하여 전면/보상형 광고를 관리하고, 웹 환경에서는 Mock 모드로 즉시 resolve. 일일 광고 시청 제한 카운터를 별도 localStorage 키(`ftd_ad_daily_limit`)에 저장/관리
- **`js/config.js`** -- AdMob 관련 상수 13개 추가:
  - 광고 ID 5개: `ADMOB_INTERSTITIAL_ID` (전면), `ADMOB_REWARDED_DIAMOND_ID` / `ADMOB_REWARDED_REVIVE_ID` / `ADMOB_REWARDED_GOLD_BOOST_ID` / `ADMOB_REWARDED_CLEAR_BOOST_ID` (보상형 4종) -- 모두 Google 테스트 ID
  - 일일 제한 3개: `AD_LIMIT_DIAMOND`=5, `AD_LIMIT_GOLD_BOOST`=3, `AD_LIMIT_CLEAR_BOOST`=3
  - 보상 수치 4개: `AD_REWARD_DIAMOND`=3, `AD_REVIVE_HP_RATIO`=0.5, `AD_GOLD_BOOST_MULTIPLIER`=2, `AD_CLEAR_BOOST_MULTIPLIER`=2
  - localStorage 키 1개: `AD_DAILY_LIMIT_KEY`='ftd_ad_daily_limit'

### 변경

- **`js/scenes/BootScene.js`** -- AdManager import 추가. `create()`에서 AdManager 인스턴스 생성, `await adManager.initialize()` 호출, `registry.set('adManager', adManager)`로 전역 등록 (기존 SoundManager 패턴과 동일)
- **`js/scenes/GameScene.js`** -- `_gameOver()` 메서드 수정: 기존 `delayedCall(500)` 딜레이 방식 대신 `adManager.showInterstitial().then()` 방식으로 전면 광고 표시 후 GameOverScene 전환. `.catch()` 블록으로 광고 실패 시에도 정상 전환. AdManager가 registry에 없으면 기존 딜레이 방식으로 폴백
- **`android/app/src/main/AndroidManifest.xml`** -- `<application>` 내부에 AdMob App ID meta-data 추가 (테스트 ID: `ca-app-pub-3940256099942544~3347511713`)
- **`package.json`** -- `@capacitor-community/admob` ^7.0.0 의존성 추가 (실제 설치: v7.2.0, Capacitor 7 호환)

### 참고

- 스펙: `.claude/specs/2026-03-02-admob-integration.md`
- QA: `.claude/specs/2026-03-02-admob-integration-phase1-qa.md`
- Mock 모드에서 `showInterstitial()`이 즉시 resolve하므로 기존 0.5초 딜레이가 제거됨. 네이티브 환경에서는 광고 표시 시간이 딜레이 역할을 대체
- 일일 제한 카운터는 `saveData`가 아닌 별도 localStorage 키에 저장하여 세이브 마이그레이션 체인과 분리
- `GameScene._gameOver()`의 `.catch()` 블록은 `showInterstitial()` 내부에서 이미 catch하므로 사실상 도달 불가하나, 방어적 코딩으로 유지
- Phase 2-4에서 보상형 광고 UI(Diamond 지급, 부활, Gold 2배, 클리어 보상 2배) 추가 예정

---

## 2026-03-02 -- UI 아이콘 일괄 개선 (판매/배속/일시정지/음소거)

### 추가

- **`tools/generate-ui-icons.mjs`** -- GPT Image API(gpt-image-1) 호출 + sharp 리사이즈 스크립트 (7종 순차 생성)
- **`public/assets/ui/icons/icon_sell.png`** -- 판매 버튼 아이콘 (빨간 휴지통, 64x64px 투명 배경 픽셀아트)
- **`public/assets/ui/icons/icon_speed_x1.png`** -- 1배속 아이콘 (단일 화살표, 흰색, 64x64px)
- **`public/assets/ui/icons/icon_speed_x2.png`** -- 2배속 아이콘 (이중 화살표, 노란색, 64x64px)
- **`public/assets/ui/icons/icon_speed_x3.png`** -- 3배속 아이콘 (이중 화살표, 빨간색, 64x64px)
- **`public/assets/ui/icons/icon_pause.png`** -- 일시정지 아이콘 (이중 세로 막대, 흰색, 64x64px)
- **`public/assets/ui/icons/icon_sound_on.png`** -- 사운드 켜짐 아이콘 (스피커+음파, 민트/초록, 64x64px)
- **`public/assets/ui/icons/icon_sound_off.png`** -- 음소거 아이콘 (스피커+X, 회색, 64x64px)

### 변경

- **`js/scenes/BootScene.js`** -- preload()에 게임 플레이 UI 버튼 아이콘 7종 로드 추가 (icon_sell, icon_speed_x1/x2/x3, icon_pause, icon_sound_on/off)
- **`js/ui/TowerPanel.js`** -- _createSellButton(): 텍스트 'S' 대신 icon_sell 이미지(20x20) 사용, textures.exists() 폴백 유지. destroy()에 sellIcon 정리 추가
- **`js/ui/TowerPanel.js`** -- _createSpeedButton(): 텍스트 'x1' 대신 icon_speed_x1 이미지(20x20) 사용, 배속 전환 시 setTexture()로 x1/x2/x3 순환. destroy()에 speedIcon 정리 추가
- **`js/scenes/GameScene.js`** -- _createPauseButton(): 텍스트 '||' 대신 icon_pause 이미지(18x18, depth=32) 사용, textures.exists() 폴백 유지
- **`js/scenes/GameScene.js`** -- _createPauseButton(): 텍스트 'M'/'♪' 대신 icon_sound_on/off 이미지(16x16, depth=32) 사용, _updateMuteButton()에서 setTexture() 전환
- **`js/scenes/GameScene.js`** -- _cleanup()에 pauseBtnIcon/muteBtnIcon destroy 추가

### 참고

- 스펙: `.claude/specs/2026-03-02-ui-icon-batch.md`
- QA: `.claude/specs/2026-03-02-ui-icon-batch-qa.md`
- icon_speed_x3.png의 화살표가 스펙의 "삼중"이 아닌 이중이나, 색상(빨간색)으로 x2(노란색)와 명확히 구분 가능 (QA LOW 관찰 사항)
- HUD.js의 기존 아이콘(icon_sword/diamond/heart)은 변경 없이 정상 동작 확인됨
- UI 이미지 에셋 총계: 49장 -> 56장 (아이콘 7장 추가)

---

## 2026-03-02 -- 소모품 버튼 UX 개선 (아이콘 + 툴팁)

### 추가

- **`public/assets/ui/icons/icon_consumable_slow.png`** -- 눈꽃 아이콘 24x24px (Pillow 생성)
- **`public/assets/ui/icons/icon_consumable_gold.png`** -- 금화 아이콘 24x24px (Pillow 생성)
- **`public/assets/ui/icons/icon_consumable_lightning.png`** -- 번개 아이콘 24x24px (Pillow 생성)
- **`js/scenes/GameScene.js`** -- `_showConsumableTooltip(key)` 신규 메서드: i18n 기반 능력 이름/효과 설명/현재 비용/쿨다운 표시, 화면 좌우 경계(0~360px) 보정
- **`js/scenes/GameScene.js`** -- `_hideConsumableTooltip(key)` 신규 메서드: 툴팁 4종(bg/title/desc/meta) setVisible(false)
- **`js/i18n.js`** -- 소모품 효과 설명 i18n 키 6개 추가 (ko/en 각 3개: `consumable.slowAll.desc`, `consumable.goldRain.desc`, `consumable.lightning.desc`)

### 변경

- **`js/config.js`** -- CONSUMABLE_ABILITIES 각 항목의 `icon` 필드를 텍스처 키로 변경 ('S'->'icon_consumable_slow', '$'->'icon_consumable_gold', 'Z'->'icon_consumable_lightning'), `iconFallback` 필드 추가 (폴백 문자 'S'/'$'/'Z' 보존)
- **`js/scenes/BootScene.js`** -- `preload()`에 소모품 아이콘 3종 로드 추가
- **`js/scenes/GameScene.js`** -- `_createConsumableButtons()`: 기존 텍스트(iconText) 대신 PNG 이미지(iconImage, 16x16 displaySize) 사용, `textures.exists()` 분기로 텍스트 폴백 유지. 버튼별 툴팁 오브젝트(bg 130x52/title/desc/meta, depth 50) 생성. PC pointerover/pointerout 즉시 표시/숨김, 모바일 500ms 롱프레스 표시 + pointerup/pointerout 숨김 이벤트 등록
- **`js/scenes/GameScene.js`** -- `_updateConsumableButtons()`: iconText -> iconImage/iconText 분기 alpha 처리
- **`js/scenes/GameScene.js`** -- `_destroyGoldSinkUI()`: iconImage, tooltipBg/Title/Desc/Meta destroy, longPressTimer remove 추가

### 참고

- 스펙: `.claude/specs/2026-03-02-consumable-button-ux.md`
- QA: `.claude/specs/2026-03-02-consumable-button-ux-qa.md`
- 아이콘 PNG는 OPENAI_API_KEY 미설정으로 GPT Image API 대신 Python Pillow로 생성. 추후 교체 가능
- `iconFallback` 필드는 스펙에 명시되지 않았으나 폴백 가독성 향상을 위해 추가됨
- UI 이미지 에셋 총계: 46장 -> 49장 (아이콘 3장 추가)

---

## 2026-03-02 -- 타워 정보 패널 텍스트 겹침 수정

### 배경

TowerInfoOverlay의 T1/T2+ 패널에서 설명 텍스트(flavor/desc)가 길어져 2줄 이상 렌더링될 때 하단 요소(공격 유형 배지, 스탯, 티어 배지)와 겹치는 문제가 있었다. 각 UI 요소의 Y좌표가 `panelTop + 고정값`으로 하드코딩되어 있어, wordWrap으로 줄바꿈이 발생해도 다음 요소의 위치가 1줄 기준으로 고정되어 있었다.

### 변경

- **`js/ui/TowerInfoOverlay.js`** -- 레이아웃 상수 추가 (30~33행)
  - `T1_CONTENT_GAP = 8`: 텍스트 요소 간 최소 여백 (px)
  - `T1_SECTION_GAP = 16`: 섹션 간 여백 (공격 배지 위 등) (px)
- **`js/ui/TowerInfoOverlay.js`** -- `_renderT1Panel` 동적 Y 누산 방식 적용 (307~383행)
  - `curY = panelTop + 84`에서 시작, 각 요소의 `.height`를 읽어 gap을 더해 다음 Y를 결정
  - flavorText, descText, atkText, statsText, enhText 모두 `setOrigin(0.5, 0)` (수평 중앙, 수직 상단 기준)으로 변경
  - `t1UsedInY = curY`로 기존 `_isSourceWithEnhance` 기반 조건 분기 제거
- **`js/ui/TowerInfoOverlay.js`** -- `_renderTreePanel` 동적 Y 누산 방식 적용 (415~462행)
  - `treeNextY = panelTop + 128 + resultName.height + 4`에서 시작
  - treeDescText, resultTier 높이를 읽어 누산 후 Y자 연결선/재료 노드 좌표를 상대 오프셋으로 계산
  - `nextY = matY + matR + 40`으로 스탯 시작점 결정 (기존 `panelTop + 286` 하드코딩에서 변경)
- **`js/ui/TowerInfoOverlay.js`** -- `_renderMaterialNode` 시그니처 변경 (521행)
  - 4번째 파라미터 `panelTop` -> `matBaseY`로 변경, 호출부에서 `matY`를 전달
  - 재료 이름/배지 Y좌표를 `matBaseY + r + 8`, `matBaseY + r + 22`로 상대 오프셋 계산

### 참고

- 스펙: `.claude/specs/2026-03-02-tower-info-overlap.md`
- QA: `.claude/specs/2026-03-02-tower-info-overlap-qa.md`
- 패널 높이(baseH), PANEL_W(300), _renderActionButtons, 상위 조합 섹션(_renderUsedInSection) 변경 없음
- 1줄 desc 타워(궁수 등)의 레이아웃은 setOrigin 변경(0.5 -> 0.5,0)에 의한 height/2 상쇄로 시각적으로 기존과 동등
- QA INFO 소견: T2+ 패널에서 desc가 2줄일 때 nextY가 baseH를 미세하게 초과할 가능성이 있으나, 현재 i18n 텍스트 범위에서는 발생하지 않으며 스펙에서 "극단적으로 긴 경우는 스코프 제외"로 명시

---

## 2026-03-02 -- HUD 상단 정보 패널 레이아웃 수정

### 배경

HUD 상단의 Wave/Diamond/HP 정보 영역이 음악/일시정지 버튼(x=278, x=310)과 겹쳐 HP 수치가 가려지는 문제가 있었다. 세 정보 항목을 왼쪽(x <= 250px)에 배치하고 버튼 영역(x >= 253px)과 분리하였다.

### 변경

- **`js/ui/HUD.js`** -- `_create()` 내 Diamond/HP 그룹 X좌표 이동 (6개 좌표값 수정)
  - Diamond: 아이콘 135->103, 텍스트 146->114, 폴백 135->103
  - HP: 아이콘 237->175, 텍스트 248->186, 폴백 235->175
- **`js/ui/HUD.js`** -- Wave 텍스트에서 "Wave:" 접두사 제거 (검 아이콘이 이미 표시하므로 중복 제거)
  - `_create()` 초기 텍스트: `'Wave: 1'` -> `'1'`, 폴백 `'\u2694 Wave: 1'` -> `'\u2694 1'`
  - `updateWave()` 캠페인: `Wave: X/Y` -> `X/Y`, 엔드리스: `Wave: X` -> `X`
- **`tests/world-map-phase3.spec.js`** -- HUD Wave Display 테스트 regex 업데이트
  - 캠페인: `/Wave: 1\/\d+/` -> `/1\/\d+/`
  - 엔드리스: `/Wave: \d+$/` -> `/^\u2694?\s?\d+$/`

### 참고

- 스펙: `.claude/specs/2026-03-02-hud-layout-fix.md`
- QA: `.claude/specs/2026-03-02-hud-layout-fix-qa.md`
- Wave 텍스트 형식 변경은 원래 스펙 범위 외였으나, 1차 QA에서 "Wave: 30/30" 텍스트(~107px)가 Diamond 아이콘(x=103)과 겹치는 문제가 발견되어 추가 수정됨
- 수정 후 최악 시나리오(Wave "30/30" + Diamond "9999" + HP "999") 모두 겹침 없음 (최소 간격 14px)
- Wave/버튼 좌표, depth(31), 폰트 스타일 변경 없음

---

## 2026-03-02 -- ESC 키 오버레이 우선순위 처리

### 배경

Android 뒤로가기(ESC) 키를 누를 때 TowerInfoOverlay나 일시정지 오버레이가 열려 있어도 씬 네비게이션(`scene.start`, `_pauseGame()`)이 실행되는 버그가 있었다. 오버레이가 열린 상태에서 ESC를 누르면 사용자는 오버레이가 닫히길 기대하지만, 씬 전환이나 중복 일시정지가 발생했다.

### 추가

- **`js/ui/TowerInfoOverlay.js`** -- `handleBack()` 공개 메서드 추가 (116~123행). `_handleBack()` private 메서드를 외부에서 안전하게 호출하는 래퍼. 히스토리가 있으면 이전 항목으로, 없으면 오버레이를 닫는다
- **`js/main.js`** -- `handleBackButton()` 함수의 `switch (key)` 분기 전에 오버레이 우선 처리 로직 삽입 (85~109행)
  - MergeCodexScene: `towerInfoOverlay.isOpen()` 확인 -> `handleBack()` 호출 후 return
  - GameScene: `towerPanel.isOverlayOpen()` 확인 -> `towerPanel.towerInfoOverlay.handleBack()` 호출 후 return
  - GameScene: `isPaused && pauseOverlay` 확인 -> `_resumeGame()` 호출 후 return

### 변경

- GameScene에서 일시정지 중 ESC 시 동작 변경: 이전에는 아무 변화 없음(isPaused 유지) -> 이제는 게임 재개(`_resumeGame()` 호출, isPaused = false)

### 참고

- 스펙: `.claude/specs/2026-03-02-esc-overlay-priority.md`
- QA: `.claude/specs/2026-03-02-esc-overlay-priority-qa.md`
- 우선순위: TowerInfoOverlay(depth 100) > pauseOverlay(depth 50)
- 기존 `switch (key)` 분기 코드 변경 없음
- QA MEDIUM 소견: 기존 테스트 `back-button-navigation.spec.js:473` ("이미 일시정지 상태에서 ESC 시 아무 변화도 없다")가 의도된 동작 변경으로 실패함. 테스트 업데이트 필요

---

## 2026-03-02 -- TowerInfoOverlay 텍스트 오버플로 및 패널 크기 불일치 수정

### 배경

인게임 타워 정보 오버레이(TowerInfoOverlay)에서 콘텐츠가 패널 배경 밖으로 넘치는 3가지 버그가 있었다. (1) `panel_info_overlay.png`가 300x360px 고정 이미지여서 콘텐츠가 360px을 초과하면 배경이 부족했고, (2) enhanceLevel > 0일 때 T2 패널의 nextY가 +16px 밀려 상위 조합 목록과 액션 버튼이 16px 겹쳤고, (3) 설명 텍스트에 wordWrap이 없어 긴 문자열이 패널 좌우 밖으로 넘쳤다.

### 변경

- **`js/ui/TowerInfoOverlay.js`** -- 3가지 수정 적용
  - **NineSlice 교체**: 패널 배경을 `add.image()` -> `add.nineslice()`로 교체. 슬라이스 상수 NS_TOP=48, NS_BOTTOM=44, NS_LEFT=24, NS_RIGHT=24 추가. 모서리/테두리 장식을 유지하면서 중앙 영역만 동적으로 늘림. Rectangle 폴백은 기존 그대로 유지
  - **baseH 동적 계산**: `_isSourceWithEnhance` 필드 추가 (생성자 초기화, `_render()`에서 판정, `_forceClose()`에서 리셋). enhanceLevel > 0이면 baseH에 +16px 반영 (T1: 240->256, T2+: 316->332). T1 패널의 `_renderUsedInSection` 시작 Y도 170->186으로 조정
  - **wordWrap 추가**: `_renderT1Panel` flavorText/descText, `_renderTreePanel` treeDescText 3곳에 `wordWrap: { width: 260 }, align: 'center'` 추가

### 참고

- 스펙: `.claude/specs/2026-03-01-tower-overlay-overflow.md`
- QA: `.claude/specs/2026-03-01-tower-overlay-overflow-qa.md`
- Phaser 3.87.0 NineSlice API 사용 (추가 패키지 없음)
- 기존 드릴다운, 스크롤, 버튼 동작 변경 없음 (회귀 테스트 65건 PASS)
- QA LOW 소견: `_renderTreePanel`의 treeDescText가 2줄 이상 wrap될 경우 resultTier(panelTop+160)와 겹칠 수 있으나, 현재 게임 내 모든 desc 텍스트가 1줄이므로 실제 발생하지 않음 -> **2026-03-02 "타워 정보 패널 텍스트 겹침 수정"에서 동적 Y 누산 방식으로 해결됨**

---

## 2026-03-01 -- 레벨 선택 카드 텍스트 오버플로우 수정

### 배경

LevelSelectScene 및 EndlessMapSelectScene의 맵 카드에서 텍스트가 좌우 기둥 장식(`panel_level_card.png`의 좌측 0~30px, 우측 296~319px 구간) 영역을 침범하거나 설명 텍스트가 우측으로 삐져나오는 문제가 있었다. 기존 패딩 14px 적용 시 cardLeft=34px로 기둥 끝(51px)보다 안쪽이었고, 설명 텍스트에 wordWrap이 없어 긴 한국어 문장이 카드 밖으로 넘쳤다.

### 변경

- **`js/scenes/LevelSelectScene.js`** -- cardLeft/cardRight 패딩 14px -> 35px 변경 (cardLeft=55px, cardRight=305px), 해금 카드 설명 텍스트에 `wordWrap: { width: 160 }` 추가
- **`js/scenes/EndlessMapSelectScene.js`** -- `_renderClassicCard`: 패딩 14px -> 35px 변경, 설명 텍스트에 `wordWrap: { width: 160 }` 추가 / `_renderWorldCards`: 동일하게 패딩 변경 및 wordWrap 추가

### 좌표 변경

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 패딩 | 14px | 35px |
| cardLeft | 34px | 55px (기둥 끝 51px보다 4px 안쪽) |
| cardRight | 326px | 305px (기둥 시작 316px보다 11px 안쪽) |
| 설명 wordWrap | 없음 | 160px |

### 참고

- 스펙: `.claude/specs/2026-03-01-level-card-text-overflow.md`
- QA: `.claude/specs/2026-03-01-level-card-text-overflow-qa.md`
- 카드 크기(320x86px / 월드 카드 320x76px) 변경 없음
- 이미지 에셋(`panel_level_card.png`) 수정 없음
- QA LOW 소견: EndlessMapSelectScene 월드 카드(cardH=76px)에서 설명 텍스트 2줄 렌더링 시 카드 하단 2~4px 초과 가능 (가용 24px, 10px 폰트 2줄 ~28px). 시각적으로 거의 인지되지 않는 수준

---

## 2026-03-01 -- 유틸리티 카드 레이아웃 수직 재배치

### 배경

컬렉션 화면(CollectionScene)의 UTILITY 섹션 카드(Base HP+, Gold Boost, Wave Bonus+)에서 이름 텍스트가 카드(104px) 밖으로 삐져나오는 버그가 있었다. 아이콘과 이름을 수평 배치(아이콘 x+18, 이름 x+32)하여 텍스트에 72px만 사용 가능했고, "Wave Bonus+"(약 75~80px)가 초과했다.

### 변경

- **`js/scenes/CollectionScene.js`** -- `_createUtilityCard` 메서드 내 아이콘/이름/티어/효과 텍스트 좌표 변경
  - 아이콘: `(x + 18, y + 16)` -> `(cx, y + 18)` (카드 상단 중앙)
  - 이름: `(x + 32, y + 16)`, origin `(0, 0.5)` -> `(cx, y + 34)`, origin `(0.5, 0.5)` (아이콘 아래 중앙 정렬)
  - Tier 텍스트: `y + 40` -> `y + 52`
  - 효과 텍스트: `y + 56` -> `y + 66`
  - 카드 전체 폭(104px)을 텍스트에 활용하여 오버플로 해결
  - 타워 카드(`_createTowerCard`)의 수직 레이아웃 패턴과 시각적 일관성 확보

### 참고

- 스펙: `.claude/specs/2026-03-01-utility-card-layout.md`
- QA: `.claude/specs/2026-03-01-utility-card-layout-qa.md`
- UTIL_W(104px), UTIL_H(80px) 상수 변경 없음
- `_drawUtilityIcon` 메서드 변경 없음

---

## 2026-03-01 -- Android 뒤로가기 키(ESC) 내비게이션

### 배경

Android 기기에서 하드웨어 뒤로가기 버튼을 누르면 아무 반응이 없거나 WebView가 직전 URL 히스토리로 이동하는 비정상 동작을 했다. Android 사용자가 기대하는 네이티브 수준의 뒤로가기 UX를 제공하기 위해, 각 씬별 적절한 뒤로가기 동작을 구현했다.

### 추가

- **`js/main.js`** -- `handleBackButton` 함수 및 `document.addEventListener('keydown', ...)` 리스너 추가
  - Capacitor Android WebView에서 하드웨어 뒤로가기 버튼은 ESC 키(keyCode 27)로 매핑됨
  - `game.scene.getScenes(true)[0]`으로 현재 활성 씬 조회 후 switch 분기
  - 10개 씬에 대한 뒤로가기 동작 정의 (BootScene은 무시)
  - PC 브라우저에서도 ESC 키로 동일 동작
- **`js/scenes/MenuScene.js`** -- `_openExitDialog()` 메서드 추가
  - 반투명 오버레이(0x000000, alpha 0.7) + 다크 패널(240x140, 0x05050f, 골드 테두리 0xc0a030)
  - "게임을 종료하시겠습니까?" 텍스트 (i18n: `ui.exitConfirm`)
  - 확인 버튼(BTN_DANGER 레드): `navigator.app.exitApp()` -> `window.close()` 폴백
  - 취소 버튼(BTN_BACK 틸): 다이얼로그 닫기
  - 오버레이 외부 클릭 시 취소 처리
  - `window.__isExitDialogOpen` 플래그로 다이얼로그 중복 생성 방지
  - BTN_DANGER import 추가
- **`js/i18n.js`** -- i18n 키 3개 추가
  - `ui.exitConfirm`: ko "게임을 종료하시겠습니까?" / en "Exit the game?"
  - `ui.exitConfirmYes`: ko "확인" / en "Yes"
  - `ui.exitConfirmNo`: ko "취소" / en "No"

### 씬별 뒤로가기 매핑

| 씬 | 동작 | 전환 방식 |
|---|---|---|
| MenuScene | 종료 확인 다이얼로그 | `_openExitDialog()` |
| WorldSelectScene | MenuScene | fadeOut 200ms |
| LevelSelectScene | WorldSelectScene | fadeOut 200ms |
| EndlessMapSelectScene | MenuScene | fadeOut 200ms |
| CollectionScene | MenuScene | 즉시 scene.start |
| MergeCodexScene | 호출 씬 복귀 | fromScene 기반 분기 |
| StatsScene | MenuScene | 즉시 scene.start |
| GameScene | 일시정지 | `_pauseGame()` (isPaused/isGameOver 시 무시) |
| MapClearScene | WorldSelectScene | fadeOut 200ms |
| GameOverScene | MenuScene | fadeOut 200ms |

### 참고

- 스펙: `.claude/specs/2026-03-01-back-button-navigation.md`
- QA: `.claude/specs/2026-03-01-back-button-navigation-qa.md`
- 스펙 차이: LevelSelectScene에서 worldId 미전달 (WorldSelectScene에 init() 메서드가 없고 기존 뒤로가기 버튼도 worldId를 전달하지 않으므로 기존 패턴과 일치)
- QA LOW 소견: `window.__isExitDialogOpen` 플래그가 씬 재시작 시 리셋되지 않을 수 있으나, 정상 사용 흐름에서 재현 불가

---

## 2026-03-01 -- Galmuri 픽셀 폰트 적용

### 배경

게임이 `pixelArt: true` 렌더링과 46장의 픽셀아트 UI 에셋을 사용하지만, 텍스트는 벡터 시스템 폰트(Arial)를 사용하고 있었다. 다크 판타지 픽셀아트 컨셉과 일관된 타이포그래피를 위해 Galmuri11 비트맵 픽셀 폰트로 전체 교체했다.

### 추가

- **`public/assets/fonts/`** -- Galmuri 폰트 파일 3개 배치
  - `Galmuri11.woff2` (504KB) -- 본문 전반 Regular
  - `Galmuri11-Bold.woff2` (166KB) -- Bold 강조 텍스트
  - `Galmuri9.woff2` (429KB) -- 소형 텍스트 확장 여지용 (현재 미사용)
- **`style.css`** -- `@font-face` 3개 선언 추가 (Galmuri11 Regular/Bold, Galmuri9)
  - `font-display: block`으로 FOUT 방지
  - URL 경로: `/assets/fonts/` (Vite 정적 에셋 서빙)
- **`index.html`** -- Galmuri11 Regular/Bold preload 링크 2개 추가
  - Galmuri9는 현재 미사용이므로 preload 생략 (약 430KB 불필요 로드 방지)

### 변경

- **`js/scenes/BootScene.js`** -- `create()` 메서드를 `async`로 변경, `await document.fonts.ready`로 폰트 로딩 완료 대기 후 MenuScene 전환
- **15개 JS 파일의 fontFamily 일괄 교체** (183개 참조)
  - `'Arial, sans-serif'` -> `'Galmuri11, Arial, sans-serif'`
  - `'Outfit, Arial, sans-serif'` -> `'Galmuri11, Arial, sans-serif'`
  - 대상 파일: CollectionScene, GameOverScene, GameScene, LevelSelectScene, MapClearScene, MenuScene, WorldSelectScene, EndlessMapSelectScene, StatsScene, MergeCodexScene, HUD, TowerInfoOverlay, TowerPanel, WaveManager, MapManager
  - 기존 `fontStyle: 'bold'` 유지 (Galmuri11 Bold 자동 적용)
  - `fontSize` 수치 변경 없음

### 참고

- 스펙: `.claude/specs/2026-03-01-font-change.md`
- QA: `.claude/specs/2026-03-01-font-change-qa.md`
- 폰트: Galmuri v2.40.3, SIL OFL 라이선스 (https://github.com/quiple/galmuri)
- QA LOW 소견: Galmuri9 @font-face 선언만 존재하고 JS에서 미참조. 향후 소형 텍스트 적용 시 활용 예정.

---

## 2026-03-01 -- UI 이미지 에셋 46장 생성 및 코드 적용

### 배경

모든 UI 요소가 `add.rectangle()` 프로그래밍 방식 도형으로 구성되어 타워/몬스터의 픽셀아트와 시각적 일관성이 없었다. gpt-image-1.5 API로 픽셀아트 UI 이미지 46장을 생성하고 모든 씬의 버튼/패널/HUD/아이콘을 이미지로 교체했다.

### 추가

- **`public/assets/ui/`** -- UI 이미지 에셋 46장 배치
  - `buttons/` -- 버튼 23장 (대형 160x44 9장, 중형 160x36 9장, 소형 80x26 5장)
    - 4색(primary/meta/back/danger) x normal/pressed + disabled
    - 소형은 primary/back만 존재
  - `panels/` -- 패널 배경 5장 (결과 280x420, 일시정지 220x260, 월드카드 320x88, 레벨카드 320x86, 타워정보 300x360)
  - `hud/` -- HUD/슬롯 9장 (HUD바 360x40, 타워패널 360x120, 타워슬롯 40x40 x3상태, 액션슬롯 32x32 x2상태, 미니슬롯 24x24 x2상태)
  - `decorations/` -- 장식 3장 (골드구분선, 헤더라인, 코너장식)
  - `icons/` -- 아이콘 6장 (다이아몬드/하트/검 16x16, 별채움/별빈/자물쇠 20x20)
- **`js/scenes/BootScene.js`** -- preload()에 UI 에셋 46장 일괄 로드 추가
- 각 씬에 `_createImageButton()` 유틸리티 메서드 추가 (MenuScene, MapClearScene, GameOverScene, LevelSelectScene)
  - `textures.exists()` 체크 후 Image 생성, 미존재 시 Rectangle 폴백
  - pointerdown/pointerup/pointerout 핸들러로 pressed 텍스처 전환

### 변경

- **`js/main.js`** -- `pixelArt: true`, `antialias: false` 설정 (픽셀아트 계단 엣지 렌더링)
- **`js/scenes/MenuScene.js`** -- 모든 버튼을 이미지 버튼으로 교체, ENDLESS/COLLECTION/STATISTICS 높이 44px로 통일 (대형 표준), 음소거 토글 소형(80x26)으로 표준화
- **`js/scenes/WorldSelectScene.js`** -- 월드 카드 배경을 `panel_world_card` 이미지로 교체, 잠금 아이콘을 `icon_lock` 이미지로 교체
- **`js/scenes/LevelSelectScene.js`** -- 맵 카드 배경을 `panel_level_card` 이미지로 교체, 별점을 `icon_star_filled`/`icon_star_empty` 이미지로 교체, START 버튼 이미지 교체
- **`js/scenes/MapClearScene.js`** -- 결과 패널을 `panel_result` 이미지로 교체, 별점 아이콘 이미지 교체, 버튼 3종 이미지 교체
- **`js/scenes/GameOverScene.js`** -- 결과 패널을 `panel_result` 이미지로 교체, 버튼 이미지 교체
- **`js/scenes/GameScene.js`** -- 일시정지 패널을 `panel_pause` 이미지로 교체, 일시정지 버튼 이미지 교체, HP회복/소모품 버튼에 `slot_action`/`slot_mini` 이미지 적용
- **`js/ui/HUD.js`** -- HUD 배경을 `hud_bar_bg` 이미지로 교체, 아이콘(다이아몬드/하트/검) 유니코드 -> 이미지 교체
- **`js/ui/TowerPanel.js`** -- 패널 배경을 `tower_panel_bg` 이미지로 교체, 타워 슬롯을 `tower_slot_normal`/`selected`/`locked` 이미지로 교체, 액션슬롯 이미지 교체
- **`js/ui/TowerInfoOverlay.js`** -- 패널 배경을 `panel_info_overlay` 이미지로 교체, 강화/판매 버튼 이미지 교체

### 수정

- **런타임 크래시 7건** (R1 QA FAIL -> R2 수정 후 PASS)
  - `WorldSelectScene.js`: Image 객체에 `setStrokeStyle` 호출 크래시 2건 -> `instanceof Phaser.GameObjects.Rectangle` 가드 추가
  - `LevelSelectScene.js`: 동일 크래시 2건 -> instanceof 가드 추가
  - `GameScene.js`: Image 객체에 `setFillStyle` 호출 크래시 2건 + `setStrokeStyle` 크래시 1건 -> instanceof 분기 + `setTint`/`clearTint` 대체

### 참고

- 스펙: `.claude/specs/2026-03-01-ui-image-assets.md`
- 수정 리포트: `.claude/specs/2026-03-01-ui-image-assets-fix-report.md`
- QA: `.claude/specs/2026-03-01-ui-image-assets-qa.md`

### 잔존 이슈 (수정 범위 외)

- 일시정지 버튼 너비 불일치 (이미지 160px vs 의도 180px) -- 기능 정상
- TowerInfoOverlay 강화/판매 버튼 크기 불일치 (이미지 160x36 vs 스펙 200x32) -- 기능 정상
- 장식 에셋 3종 (divider_gold, divider_header, corner_deco) 로드만 되고 미사용

---

## 2026-03-01 -- 몬스터 판타지 컨셉 + 바이옴별 스프라이트 시스템

### 배경

적 8종이 모두 도형(원, 삼각형, 사각형)으로만 렌더링되어 판타지 TD 분위기와 맞지 않았다. 각 적 유형의 게임플레이 특성에 맞는 판타지 몬스터 컨셉을 매핑하고, 5개 월드별 바이옴 스킨 변형을 포함한 스프라이트 시스템을 구축했다.

### 몬스터 컨셉 매핑

| 유형 | 컨셉 | spriteBase |
|------|------|------------|
| normal | 고블린 (Goblin) | `goblin` |
| fast | 늑대 (Warg) | `warg` |
| tank | 오우거 (Ogre) | `ogre` |
| swarm | 미니 슬라임 (Mini Slime) | `mini_slime` |
| splitter | 슬라임 (Slime) | `slime` |
| armored | 흑기사 (Dark Knight) | `dark_knight` |
| boss | 마왕 (Demon Lord) | `demon_lord` |
| boss_armored | 골렘 (Golem) | `golem` |

### 추가

- **`js/config.js`**
  - `ENEMY_STATS` 각 타입에 `spriteBase` 필드 추가 (몬스터 컨셉 식별자)
  - `getEnemySpriteKey(enemyType, worldId)` 함수 — 적 타입과 월드 ID를 조합하여 스프라이트 텍스처 키 반환
- **`js/entities/Enemy.js`**
  - `worldId` 필드 — 생성자 overrides에서 전달받아 바이옴 스프라이트 결정
  - `sprite` 필드 — Phaser.GameObjects.Image, 텍스처 존재 시 생성
  - `_applySpriteDebuffTint()` — 스프라이트에 디버프 색상 틴트 적용 (슬로우: 파랑, 화상: 빨강, 독: 초록)
  - `_drawShapeFallback()` — 기존 도형 렌더링을 별도 메서드로 분리 (스프라이트 미존재 시 폴백)
  - `destroy()`에 스프라이트 정리 추가
- **`js/scenes/GameScene.js`**
  - `preload()` — 현재 월드의 적 스프라이트 8종을 `assets/enemy/`에서 로드
  - `currentWorldId` 필드 — 현재 맵의 월드 ID 저장
  - `_spawnEnemy()`, `_spawnChildEnemy()`에 `worldId` 전달
  - `getWorldByMapId` import 추가
- **`js/i18n.js`**
  - `enemy.{type}.name` 키 8종 추가 (ko/en)
- **`public/assets/enemy/`** — 적 스프라이트 에셋 디렉토리 생성
- **`docs/monster-art-guide.md`** — 40종 AI 이미지 생성 프롬프트 (8종 × 5바이옴)

### 변경 없음

- 적 스탯 (HP, 속도, 저항, 면역 등)
- 웨이브 구성
- 디버프/피해 시스템
- HP 바, 사망 이펙트

### 파일명 규칙

`{worldId}_{spriteBase}.png` — 예: `forest_goblin.png`, `desert_warg.png`

### 참고

- 스프라이트가 없는 적은 기존 도형으로 자동 폴백 → 점진적 마이그레이션 가능
- 엔드리스 모드(classic map)는 worldId가 없으므로 도형 폴백 사용
- splitter 사망 → swarm 생성 시 동일 바이옴 미니슬라임 스프라이트 사용

---

## 2026-02-27 -- 앱 백그라운드 전환 시 BGM 자동 일시정지

### 배경

Android Capacitor 앱에서 홈버튼으로 백그라운드 전환 시 BGM이 계속 재생되어 배터리 소모 및 사용자 불편을 유발했다. `document.visibilitychange` 이벤트를 활용하여 백그라운드 전환 시 BGM을 자동 일시정지하고 복귀 시 재개하도록 처리한다.

### 추가

- **`js/managers/SoundManager.js`**
  - `_bgmIdBeforeBackground` 필드: 백그라운드 전환 직전 재생 중이던 BGM ID 저장
  - `_visibilityHandler` 필드: visibilitychange 이벤트 핸들러 참조 (해제용)
  - `_initVisibilityHandler()` 메서드: constructor에서 호출, `document.visibilitychange` 이벤트 등록. hidden 시 `_bgmIntervalId !== null`(스케줄러 활성) 조건으로 BGM ID 저장 후 `pauseBgm()` 호출, 복귀 시 `resumeBgm()` 호출
  - `pauseBgm()` 메서드: BGM 스케줄러(setInterval) 중단 + `AudioContext.suspend()`. `_currentBgmId`는 유지 (`stopBgm()`과 다른 동작)
  - `resumeBgm(bgmId)` 메서드: `AudioContext.resume()` 후 `playBgm(bgmId)` 호출. `.then()` 콜백에 `document.hidden` 가드로 비동기 레이스 컨디션 방지

### 변경

- **`js/managers/SoundManager.js`** -- `destroy()`에 `document.removeEventListener('visibilitychange', ...)` 추가
- **`js/scenes/GameScene.js`** -- `_pauseGame()`에서 `soundManager._currentBgmId`를 `_bgmIdBeforePause`에 저장 후 `stopBgm(false)` 호출. `_resumeGame()`에서 저장된 BGM ID로 `playBgm()` 호출하여 복원. 인게임 일시정지 중 백그라운드 전환 시 BGM 재시작 방지 (QA R1에서 발견)

### 참고

- 스펙: `.claude/specs/2026-02-27-bgm-pause-on-background.md`
- QA: `.claude/specs/2026-02-27-bgm-pause-on-background-qa.md`
- 제약: `playBgm()`은 항상 처음 노트부터 시작 (재생 위치 복원 불가, SoundManager 아키텍처 한계)
- `pauseBgm()`은 `AudioContext.suspend()`를 호출하므로 SFX도 함께 일시정지됨 (백그라운드 상태에서 예상되는 동작)

---

## 2026-02-27 -- 타워 이미지 APK 빌드 포함 수정

### 배경

타워 이미지 PNG 10개가 `assets/tower/`에 위치하여 Vite 빌드 결과물(`dist/`)에 포함되지 않았다. Vite는 `public/` 폴더의 내용만 `dist/`로 자동 복사하므로, Phaser의 런타임 이미지 로드(`assets/tower/${name}.png`)가 APK에서 실패하는 문제가 있었다.

### 변경

- **`public/assets/tower/`** -- 타워 이미지 PNG 10개를 `assets/tower/`에서 `public/assets/tower/`로 이동 (`git mv`). Archer, Dragon, Flame, Ice, Light, Lightning, Mage, Poison, Rock, Wind.
- **`assets/`** -- 빈 디렉토리 삭제 (tower/ 하위만 존재하여 전체 제거)

### 변경 없음

- `js/scenes/BootScene.js` -- 이미지 로드 경로 `assets/tower/${name}.png` 유지 (Vite `public/` 규칙에 의해 동일 경로로 서빙)
- `vite.config.js` -- `publicDir` 기본값(`public/`) 활용, 별도 설정 불필요

### 문서

- `docs/ART_STYLE_GUIDE.md` -- 이미지 경로를 `fantasydefence/public/assets/tower/`로 수정

### 참고

- 스펙: `.claude/specs/2026-02-27-tower-image-build-fix.md`
- QA: `.claude/specs/2026-02-27-tower-image-build-fix-qa.md`

---

## 2026-02-27 -- 타워 특징 설명(desc) 시스템 추가

### 배경

T1 타워 10종에는 flavor(분위기 텍스트)만 있고 공격 타입/특성 설명이 없었다. T2~T5는 desc 키가 i18n에 정의되어 있지만 어떤 UI에서도 사용하지 않았다. 타워의 기능적 특징을 한눈에 파악할 수 있도록 desc 텍스트를 추가하고, flavor + desc를 주요 UI 3곳에 모두 표시한다.

### 추가

- **`js/i18n.js`** -- T1 타워 10종에 `tower.*.desc` 키 추가 (한국어/영어). 공격 타입 + 핵심 특성을 1줄로 요약.
- **`js/ui/TowerInfoOverlay.js`** -- `_renderT1Panel()`에 flavor(이탤릭, #a0a0a0) + desc(#d0d0d0) 2줄 추가, 하단 요소 Y오프셋 +40px 조정. `_renderTreePanel()`에 결과 노드 아래 desc 1줄 추가, 하단 Y오프셋 +16px 조정.
- **`js/ui/TowerPanel.js`** -- `_showDescription()` 롱프레스 팝업에 desc 1줄 추가, 팝업 높이 110→130px, 스탯/비용 라인 Y오프셋 조정.
- **`js/scenes/CollectionScene.js`** -- `_showTowerDetailView()` 상세뷰에 flavor + desc 2줄 추가, 패널 높이 520→556px, 구분선/업그레이드 섹션 Y오프셋 +36px 조정.

### 문서

- `docs/systems/tower.md` -- 타워 텍스트 시스템 섹션 추가 (키 패턴, 표시 위치)

---

## 2026-02-27 -- 타워 해금 확장 (월드 클리어 기반 5종 잠금)

### 배경

기존에는 타워 10종 중 드래곤만 50 Diamond로 해금하고 나머지 9종은 모두 사용 가능했다. 월드 클리어 보상을 강화하기 위해 기본 5종(archer, mage, ice, lightning, flame)만 시작 시 사용 가능하도록 변경하고, 나머지 5종은 각 월드 클리어(6맵 전부 cleared) 시 해금되도록 확장했다.

### 추가

- **`js/config.js`** -- `TOWER_UNLOCK_MAP` 상수 추가 (월드 ID -> 타워 타입 매핑: forest->rock, desert->poison, tundra->wind, volcano->light, shadow->dragon)
- **`js/config.js`** -- TOWER_STATS의 rock, poison, wind, light, dragon 5종에 `locked: true`, `unlockWorld` 필드 추가 (기존 `unlockCost` 필드 제거)
- **`js/config.js`** -- 세이브 마이그레이션 v3->v4 추가 (기존 unlockedTowers를 worldProgress 기반으로 재계산)
- **`js/config.js`** -- `SAVE_DATA_VERSION = 4`
- **`js/scenes/MapClearScene.js`** -- 월드 클리어 시 `TOWER_UNLOCK_MAP`으로 타워 자동 해금 + 알림 UI 표시
- **`js/scenes/CollectionScene.js`** -- 잠긴 타워 카드에 해금 조건 월드 이름 표시, 클릭 시 월드 클리어 조건 안내 팝업 (기존 다이아 구매 팝업 대체)
- **`js/ui/TowerPanel.js`** -- 롱프레스 설명에 잠긴 타워는 비용 대신 `🔒 [월드이름]` 표시
- **`js/i18n.js`** -- `ui.towerUnlocked`, `ui.clearWorldToUnlock`, `ui.confirm` 키 추가 (한국어/영어)

### 변경

- **`js/config.js`** -- 기본 5종(archer, mage, ice, lightning, flame)은 `locked: false, unlockCost: 0` 유지, 잠긴 5종에서 `unlockCost` 필드 제거

### 해금 매핑

| 타워 | 해금 조건 |
|---|---|
| rock | Forest 월드 클리어 (6맵) |
| poison | Desert 월드 클리어 (6맵) |
| wind | Tundra 월드 클리어 (6맵) |
| light | Volcano 월드 클리어 (6맵) |
| dragon | Shadow 월드 클리어 (6맵) |

---

## 2026-02-27 -- Endless 모드 해금 버그 수정

### 수정

- **`js/config.js`** -- v2→v3 세이브 마이그레이션에서 `bestRound >= 20`이면 `endlessUnlocked = true`로 설정하던 레거시 조건 제거
  - 변경 전: `saveData.endlessUnlocked = (saveData.bestRound || 0) >= 20;`
  - 변경 후: `saveData.endlessUnlocked = false;`
  - 캠페인 30개 맵 미클리어 레거시 유저가 Endless 모드에 진입 가능했던 버그 수정
  - 실제 해금은 `MapClearScene.js`에서 30개 맵 전체 cleared 시에만 발생

### 문서

- **`docs/PROJECT.md`** -- 엔드리스 해금 조건에서 레거시 유저 분기 설명 제거, 세이브 마이그레이션 테이블 갱신

---

## 2026-02-27 -- 타워 정보 오버레이 통합 (TowerInfoOverlay)

### 배경

인게임 타워 클릭 모달(`TowerPanel._showTowerModal`)과 합성도감 카드 오버레이(`MergeCodexScene._renderOverlay`)가 타워 이름, 색상, 티어, 스탯, 합성 트리, 상위 조합 섹션을 공통으로 표시하지만 코드가 완전히 중복되어 유지보수 비용이 컸다. 두 오버레이를 `TowerInfoOverlay` 단일 클래스로 통합하고, 인게임 모달에도 Y자 트리/드릴다운/상위 조합 기능을 추가했다.

### 추가

- **`js/ui/TowerInfoOverlay.js`** -- 공용 타워 정보 오버레이 컴포넌트 신규 생성
  - `mode` 옵션으로 `'game'` / `'codex'` 두 가지 동작 지원
  - 공통 레이아웃: 반투명 배경막 (alpha 0.96), 300px 패널, 닫기(X)/뒤로 버튼
  - T1: 색상 원, 이름, T1 배지, 공격 유형, DMG/SPD/RNG 스탯
  - T2+: Y자 트리 노드 (결과 r=28 금테, 재료 r=20), 연결선, 스탯
  - 상위 조합 섹션: 구분선, 헤더, 드래그 스크롤 목록 (GeometryMask)
  - 드릴다운: 재료 노드/상위 조합 항목 클릭 -> 해당 타워 오버레이 전환 + 히스토리
  - game 모드 전용: 강화 버튼 (200x32, BTN_PRIMARY), 판매 버튼 (200x32, BTN_DANGER), 최대 강화 텍스트
  - game 모드 드릴다운 중 강화/판매 버튼 숨김, 원래 타워 복귀 시 재표시
  - game 모드 depth 100, codex 모드 depth 50
  - 공개 API: `open()`, `close()`, `isOpen()`, `getClosedAt()`, `destroy()`
  - `_buildEntryFromTower()`: Tower 인스턴스 -> entry 변환 (game 모드)
  - `_buildEntryFromConfig()`: config 데이터 -> entry 변환 (드릴다운)
  - `_findUsedInRecipes()`: 상위 조합 레시피 검색 (MergeCodexScene에서 이전)
  - `_removeScrollListeners()`: 스크롤 리스너 정리 (누수 방지)
  - 한국어 주석 규약 준수 (@fileoverview, JSDoc, 인라인 주석)

### 변경

- **`js/ui/TowerPanel.js`** -- 모달 관련 코드 제거, TowerInfoOverlay 연동
  - 삭제: `_showTowerModal()`, `_buildModalMergeList()`, `_hideTowerModal()`, `_buildMergeList()` 메서드
  - 삭제: `showTowerInfo()` 내 `infoContainer` 생성 로직 (간이 정보 한 줄)
  - 추가: constructor에서 `TowerInfoOverlay` 인스턴스 생성 (`mode: 'game'`, onEnhance/onSell 콜백)
  - 수정: `showTowerInfo()` -> `towerInfoOverlay.open(tower)` 호출
  - 수정: `_hideInfo()` -> `towerInfoOverlay.close()` 호출
  - 수정: `destroy()` -> `towerInfoOverlay.destroy()` 호출
  - 유지: `sellBg` 판매 단축 버튼, `_flashMergeTargets()` 합성 파트너 깜빡이기
  - 정리: 미사용 import 제거 (`CELL_SIZE`, `MAX_ENHANCE_LEVEL`, `GAME_HEIGHT`)
- **`js/scenes/MergeCodexScene.js`** -- 오버레이 관련 코드 제거, TowerInfoOverlay 연동
  - 삭제: `_renderOverlay()`, `_renderT1Panel()`, `_renderTreePanel()`, `_renderMaterialNode()`, `_renderConnectorLines()`, `_renderUsedInSection()`, `_handleBack()`, `_forceCloseOverlay()`, `_closeOverlay()`, `_findUsedInRecipes()`, `_buildEntryById()` (약 490줄)
  - 삭제: `init()` 내 `this.overlay`, `this._overlayHistory`, `this._overlayClosedAt` 초기화
  - 추가: `create()`에서 `TowerInfoOverlay` 인스턴스 생성 (`mode: 'codex'`, applyMetaUpgrades 옵션 주입)
  - 추가: `_onShutdown()` 메서드 + shutdown 이벤트 핸들러 등록 (오버레이 파괴, 드래그 리스너 정리, 자기 해제)
  - 수정: `_showCodexCardOverlay()` -> `towerInfoOverlay.open(entry)` 호출
  - 수정: `_onCodexPointerDown()` -> `towerInfoOverlay.isOpen()` 사용
  - 수정: 카드 클릭 재오픈 방지 -> `towerInfoOverlay.getClosedAt()` 사용
  - 유지: `_applyMetaUpgradesToStats()` (옵션 주입으로 처리)
  - 정리: 미사용 import 제거 (`BTN_PRIMARY`)

### 수정 (QA R1 버그 수정)

- **BUG-1 (HIGH)**: `_renderUsedInSection()`에서 `scene.input.on()`으로 등록한 스크롤 리스너가 익명 함수여서 제거 불가 -> `_scrollMoveHandler`/`_scrollUpHandler` 인스턴스 변수에 참조 저장 + `_removeScrollListeners()` 메서드 추가, `_render()` 및 `_forceClose()` 시 호출
- **BUG-2 (MEDIUM)**: `_buildMergeList()` dead code 제거 (`this.infoContainer` 참조가 undefined 상태에서 TypeError 발생 가능)
- **BUG-3 (MEDIUM)**: MergeCodexScene에 shutdown 핸들러 미등록 -> `_onShutdown()` 메서드 추가 (towerInfoOverlay.destroy() + 드래그 리스너 정리 + 자기 해제)
- **BUG-4 (LOW)**: `t('ui.maxEnhance') === t('ui.maxEnhance') ? '' : ''` 무의미한 삼항 연산 제거, `+${info.enhanceLevel}` 단순화

### 알려진 제약

- `_getAttackTypeBadge` 메서드가 `TowerInfoOverlay.js`와 `MergeCodexScene.js`에 동일하게 존재 (도감 카드 생성용). 공용 유틸로 분리 가능하나 기능에 영향 없음
- 기존 테스트 `merge-preview-ui.spec.js`에서 삭제된 `_buildMergeList`를 참조하는 테스트가 실패할 수 있음 (별도 정리 필요)

### QA 결과

- **판정**: PASS (R2)
- R1: 36개 중 34개 통과, 2건 FAIL (이벤트 리스너 누수)
- R2: 전체 65개 통과 (R1 36 + R2 29), 시각적 검증 스크린샷 11건 확인
- 수용 기준 AC1~AC19 전체 PASS
- 수정 전 4건(BUG-1~4) 전체 수정 확인

### 참고 문서

- 스펙: `.claude/specs/2026-02-27-tower-info-overlay.md`
- 구현 리포트: `.claude/specs/2026-02-27-tower-info-overlay-report.md`
- 수정 리포트: `.claude/specs/2026-02-27-tower-info-overlay-fix-report.md`
- QA R1: `.claude/specs/2026-02-27-tower-info-overlay-qa.md`
- QA R2: `.claude/specs/2026-02-27-tower-info-overlay-qa-r2.md`
- 테스트: `tests/tower-info-overlay.spec.js`, `tests/tower-info-overlay-r2.spec.js`

---

## 2026-02-26 -- 월드/맵 시스템 Phase 5 (나머지 맵 완성 + 씬 전환 페이드 + EndlessMapSelectScene)

### 배경

Phase 1~4를 통해 맵/월드 선택 UI와 캠페인 진행 흐름이 완성되었으나, 숲(6개) 외 4개 월드 맵 대부분이 "직선+1턴" 단순 스켈레톤 패턴이었다. Phase 5에서 19개 스켈레톤 맵을 월드별 특성이 반영된 고유 경로로 교체하고, 씬 전환 페이드 효과와 엔드리스 맵 선택 씬을 추가했다.

### 추가

- **`js/scenes/EndlessMapSelectScene.js`** -- 엔드리스 맵 선택 씬 신규 생성
  - 씬 키: `'EndlessMapSelectScene'`
  - 6탭 UI: CLASSIC(클래식) + F(숲) + D(사막) + T(설원) + V(화산) + S(그림자)
  - 클래식 탭: CLASSIC MAP 1개, 즉시 GameScene(endless) 시작
  - 월드 탭: 6개 맵 카드 (맵 번호, 이름, 설명, Wave 수, START 버튼)
  - 탭별 강조색: classic=0xffd700, forest=0x2ecc71, desert=0xe67e22, tundra=0x74b9ff, volcano=0xe17055, shadow=0x9b59b6
  - 다크 판타지 테마 (0x0d0d1a 배경, 골드 강조색)
  - fadeIn(300) / fadeOut(200) + camerafadeoutcomplete 패턴
  - 뒤로가기 -> MenuScene
- **`js/i18n.js`** -- 3개 신규 키 추가 (ko + en)
  - ui.endlessMapSelect, ui.classicMap, ui.classicMapDesc

### 변경

- **`js/data/maps/desert.js`** -- d2_m3~d2_m6 스켈레톤 4개를 고유 경로로 재설계
  - d2_m3: U턴 패턴 (SPAWN 2,0 -> BASE 2,11)
  - d2_m4: 이중 S자 (SPAWN 7,0 -> BASE 1,11)
  - d2_m5: Z자 3단 (SPAWN 0,0 -> BASE 7,11)
  - d2_m6: 수렴 경로 (SPAWN 1,0 -> BASE 3,11)
- **`js/data/maps/tundra.js`** -- t3_m2~t3_m6 스켈레톤 5개를 고유 경로로 재설계
  - t3_m2: U턴+중앙벽 (SPAWN 3,0 -> BASE 6,11)
  - t3_m3: 역S자+좌측벽 (SPAWN 6,0 -> BASE 1,11)
  - t3_m4: 지그재그 4단 (SPAWN 1,0 -> BASE 1,11)
  - t3_m5: 사행천+벽 (SPAWN 7,0 -> BASE 6,11)
  - t3_m6: 5단 지그재그 (SPAWN 4,0 -> BASE 7,11)
- **`js/data/maps/volcano.js`** -- v4_m2~v4_m6 스켈레톤 5개를 고유 경로로 재설계
  - v4_m2: 계단+벽 (SPAWN 2,0 -> BASE 7,11)
  - v4_m3: 분화구 우회 (SPAWN 7,0 -> BASE 7,11)
  - v4_m4: 지그재그+좌우벽 (SPAWN 1,0 -> BASE 7,11)
  - v4_m5: 좁은 통로 S자 (SPAWN 4,0 -> BASE 4,11)
  - v4_m6: V자+회귀 (SPAWN 4,0 -> BASE 2,11)
- **`js/data/maps/shadow.js`** -- s5_m2~s5_m6 스켈레톤 5개를 고유 경로로 재설계
  - s5_m2: Z자 3단 (SPAWN 2,0 -> BASE 7,11)
  - s5_m3: 꺾임 7회 경로 (SPAWN 7,0 -> BASE 6,11)
  - s5_m4: 5단 Z자 (SPAWN 4,0 -> BASE 7,11)
  - s5_m5: 사각 회랑 (SPAWN 0,0 -> BASE 5,11)
  - s5_m6: 6단 S자 (SPAWN 1,0 -> BASE 1,11)
- **씬 전환 페이드 효과** -- 6개 씬에 fadeIn/fadeOut 추가
  - MenuScene: fadeIn(400), fadeOut(200) (WorldSelectScene, CollectionScene, StatsScene, EndlessMapSelectScene 진입)
  - WorldSelectScene: fadeIn(300), fadeOut(200) (LevelSelectScene, MenuScene 진입)
  - LevelSelectScene: fadeIn(300), fadeOut(200) (GameScene, WorldSelectScene 진입)
  - MapClearScene: fadeIn(300), fadeOut(200) (GameScene, WorldSelectScene 진입)
  - GameOverScene: fadeIn(300), fadeOut(200) (MenuScene, GameScene 진입)
  - GameScene: fadeIn(300) (create() 최상단)
  - EndlessMapSelectScene: fadeIn(300), fadeOut(200) (GameScene, MenuScene 진입)
  - 페이드 색상: 검정(0,0,0). fadeOut 완료(camerafadeoutcomplete) 후 씬 전환
- **`js/scenes/MenuScene.js`** -- ENDLESS 활성 상태에서 EndlessMapSelectScene으로 이동 (기존: GameScene 직접 진입)
- **`js/main.js`** -- EndlessMapSelectScene import 및 scene 배열에 등록 (총 11개 씬)

### 수정

- 모든 재설계 맵의 totalWaves 기존 값 유지 확인 (desert 10~15, tundra 12~18, volcano 15~20, shadow 18~25)
- 기존 완성 맵(f1_m1~f1_m6, d2_m1, d2_m2, t3_m1, v4_m1, s5_m1) 변경 없음

### QA 결과

- **판정**: PASS (R2)
- R1: 3건 FAIL (EndlessMapSelectScene 미생성/미등록, GameScene fadeIn 미구현)
- R2: Playwright 테스트 20개 + 원본 10개 + Node.js 맵 검증 30개 = 총 60개 통과
- 시각적 검증 스크린샷 2건 확인 (CLASSIC 탭, Forest 탭)
- 수용 기준 16/16 충족

### 참고 문서

- 스펙: `.claude/specs/2026-02-26-world-map-phase5.md`
- 수정 리포트: `.claude/specs/2026-02-26-world-map-phase5-fix-report.md`
- QA R1: `.claude/specs/2026-02-26-world-map-phase5-qa.md`
- QA R2: `.claude/specs/2026-02-26-world-map-phase5-qa-r2.md`
- 테스트: `tests/world-map-phase5.spec.js`, `tests/world-map-phase5-r2.spec.js`, `tests/validate-maps-phase5.mjs`

---

## 2026-02-26 -- 월드/맵 시스템 Phase 4 (세이브 확장 + 진행 시스템)

### 배경

Phase 1~3에서 동적 맵 인프라, 월드 테마/별점/클리어 씬, 월드/레벨 선택 UI가 구현되었으나 진행 상태(별점, 맵 해금, 월드 해금, 엔드리스 해금)가 localStorage에 저장되지 않아 새로고침 시 초기화되었다. Phase 4에서 세이브 스키마를 v3로 확장하고 모든 진행 상태를 세이브 데이터와 연결했다.

### 추가

- **`js/config.js`** -- 세이브 스키마 v3 확장
  - SAVE_DATA_VERSION: 2 -> 3
  - v3 신규 필드: worldProgress(맵별 {cleared, stars}), endlessUnlocked(boolean), campaignStats({totalStars, mapsCleared, worldsCleared})
  - v2->v3 마이그레이션 블록: worldProgress={}, campaignStats 기본값 설정
  - 레거시 유저 처리: bestRound >= 20 -> endlessUnlocked = true
  - v3 ensure 블록 추가
- **`js/scenes/MapClearScene.js`** -- 세이브 저장/보상 실제 지급
  - _loadSave() / _saveToDB() private 메서드 추가 (GameOverScene 패턴 동일)
  - 다이아몬드 차액 보상: CAMPAIGN_DIAMOND_REWARDS[stars] - CAMPAIGN_DIAMOND_REWARDS[prevStars]
  - worldProgress 갱신 (최고 별점 유지: Math.max(prevStars, stars))
  - campaignStats 갱신 (mapsCleared, totalStars)
  - 엔드리스 해금 체크: 30개 맵 전부 cleared === true -> endlessUnlocked = true
  - worldsCleared 갱신: 각 월드의 6개 mapIds 전부 cleared인 월드 수 카운트
  - earnedDiamond === 0 && prevStars > 0 일 때 "이미 최고 기록" 텍스트 표시
- **`js/i18n.js`** -- 'ui.alreadyBest' 키 추가 (ko: '이미 최고 기록', en: 'Already Best Record')

### 변경

- **`js/scenes/WorldSelectScene.js`** -- `_getWorldProgress()` 세이브 데이터 기반으로 교체
  - registry에서 saveData 조회
  - 해금 판정: requiredStars === 0 (forest 항상 해금) 또는 campaignStats.totalStars >= requiredStars
  - 별점: `_calcWorldStars()` 헬퍼 함수로 worldProgress에서 합산
- **`js/scenes/LevelSelectScene.js`** -- 세이브 데이터 기반으로 교체
  - init()에 `_saveData = registry.get('saveData')` 캐싱 추가
  - `_isMapUnlocked(mapIndex)`: 이전 맵 stars >= 1 판정 (index 0은 항상 해금)
  - `_getMapStars(mapId)`: worldProgress에서 별점 조회
- **`js/scenes/MenuScene.js`** -- ENDLESS 버튼 endlessUnlocked 조건부 활성화
  - `_isEndlessUnlocked(saveData)`: `saveData?.endlessUnlocked === true` 판정
  - 활성: BTN_PRIMARY 골드, setInteractive, 호버 효과
  - 비활성: BTN_SELL 회색, 잠금 안내 텍스트 유지
- **`js/config.js`** -- v1->v2 마이그레이션 블록에서 saveDataVersion을 2로 하드코딩 (기존: SAVE_DATA_VERSION 동적값)
  - v2->v3 순차 마이그레이션 보장을 위한 불가피한 변경

### 수정 (QA 버그 수정)

- **BUG-1**: `_isEndlessUnlocked()`가 `saveData.campaignStars`(미정의 필드)를 참조하여 endlessUnlocked 플래그를 무시하던 문제 수정 -> `saveData?.endlessUnlocked === true`로 교체
- **BUG-2**: MapClearScene에서 `campaignStars` ad-hoc 필드 생성/저장 코드 제거 (worldProgress와 기능 중복)
- _saveToDB 이중 호출 해소 (2회 -> 1회로 통합)

### 알려진 제약

- v1->v2 마이그레이션 블록의 saveDataVersion 하드코딩은 스펙 제약("기존 v1->v2 블록 미수정")을 위반하나, 순차 마이그레이션 보장을 위해 불가피

### QA 결과

- **판정**: PASS (R1 FAIL -> 버그 수정 후 PASS)
- R1: Playwright 40개 통과, BUG-1(ENDLESS 활성화 불가) 1건 FAIL
- 수정 후: BUG-1, BUG-2 수정 완료
- 시각적 검증 스크린샷 6건 확인

### 참고 문서

- 스펙: `.claude/specs/2026-02-26-world-map-phase4.md`
- 구현 리포트: `.claude/specs/2026-02-26-world-map-phase4-report.md`
- QA 리포트: `.claude/specs/2026-02-26-world-map-phase4-qa.md`
- 수정 리포트: `.claude/specs/2026-02-26-world-map-phase4-fix-report.md`
- 테스트: `tests/world-map-phase4.spec.js`

---

## 2026-02-26 -- 월드/맵 시스템 Phase 3 (월드/레벨 선택 UI + 캠페인 씬 플로우 완성)

### 배경

Phase 1(동적 맵 인프라)과 Phase 2(월드 테마 + 별점 + MapClearScene)가 완료된 상태에서, MenuScene에는 GAME START 버튼 하나만 존재하고 MapClearScene의 NEXT MAP/WORLD MAP 버튼이 MenuScene으로 임시 연결되어 있었다. Phase 3에서 WorldSelectScene, LevelSelectScene을 신규 구현하고 캠페인 모드의 전체 씬 플로우를 완성했다.

### 추가

- **`js/scenes/WorldSelectScene.js`** -- 월드 선택 씬 신규 생성
  - 5개 월드 패널 세로 목록 (320x88px, 간격 10px)
  - 월드 테마 bg 색상 배경 + 테마 강조색 stroke (forest:0x2ecc71, desert:0xe67e22, tundra:0x74b9ff, volcano:0xe17055, shadow:0x9b59b6)
  - 해금 패널: 골드 이름, 설명, 별점 진행도(0/18), 호버 효과, 탭 시 LevelSelectScene 이동
  - 잠금 패널: 회색 이름, alpha 0.5, 잠금 아이콘(U+1F512), 별 N개 필요 문구
  - 헤더: 뒤로가기(MenuScene) + 월드 선택 타이틀(골드 18px)
  - Phase 3 임시 진행 데이터: `_getWorldProgress()` -- forest만 해금, 별점 0
- **`js/scenes/LevelSelectScene.js`** -- 레벨 선택 씬 신규 생성
  - 6개 맵 카드 목록 (320x86px)
  - 해금 카드: 맵 번호(22px), 이름(14px), 설명(11px), 별점(3개), 웨이브 수(Wave: N), 난이도 점(최대 3개), START 버튼(80x26px)
  - 잠금 카드: 반투명 검정 오버레이(alpha 0.55) + 잠금 아이콘
  - START 탭 시 GameScene 이동 (mapData, gameMode: campaign)
  - 헤더: 뒤로가기(WorldSelectScene) + 월드 이름 표시
  - Phase 3 임시 해금 판정: `_isMapUnlocked()` -- 첫 맵(index 0)만 해금, `_getMapStars()` -- 항상 0
- **`js/data/worlds.js`** -- `getNextMapId(mapId)` 유틸 함수 추가
  - 같은 월드 내 다음 맵 ID 반환, 마지막 맵/월드 미발견 시 null
- **`js/i18n.js`** -- 13개 신규 키 추가 (ko + en)
  - ui.worldSelect, ui.levelSelect, ui.campaign, ui.endless, ui.endlessLocked, ui.starsRequired, ui.starsProgress, ui.difficulty, ui.waves, ui.back, ui.start, ui.worldComplete, ui.locked

### 변경

- **`js/scenes/MenuScene.js`** -- GAME START 버튼을 CAMPAIGN + ENDLESS(잠금) 버튼으로 교체
  - CAMPAIGN (Y:380, 160x44, BTN_PRIMARY 골드) -> WorldSelectScene 이동
  - ENDLESS (Y:435, 160x40, BTN_SELL 회색, setInteractive 미호출, 클릭 불가)
  - ENDLESS 하단 잠금 안내 문구 (Y:460, "전체 클리어 시 해금")
  - COLLECTION Y:458->492, STATISTICS Y:510->544, 음소거 Y:562->596으로 이동
- **`js/scenes/MapClearScene.js`** -- NEXT MAP/WORLD MAP 실제 네비게이션 연결
  - NEXT MAP: `getNextMapId()`로 다음 맵 판정, 존재 시 GameScene(다음 맵), 없을 시 "월드 클리어!" 텍스트로 교체 + WorldSelectScene 이동
  - WORLD MAP: MenuScene -> WorldSelectScene으로 변경
- **`js/scenes/GameOverScene.js`** -- 캠페인 모드 WORLD MAP 버튼 추가
  - 캠페인: RETRY + WORLD MAP(BTN_BACK 틸) + MENU(BTN_DANGER 레드 160x30) 3버튼, 패널 420px
  - 엔드리스: RETRY + MENU 2버튼, 패널 380px (기존 유지)
- **`js/ui/HUD.js`** -- `updateWave(round, total)` 시그니처 변경
  - total이 유한값이면 `Wave: X/Y` 형식 (캠페인)
  - total이 null/Infinity면 `Wave: X` 형식 (엔드리스, 기존 동작)
- **`js/scenes/GameScene.js`** -- `this.totalWaves` 인스턴스 변수 추가
  - init()에서 `isFinite(this.mapData.totalWaves) ? this.mapData.totalWaves : null` 설정
  - create(), update() 내 `hud.updateWave(round)` -> `hud.updateWave(round, this.totalWaves)` 변경
- **`js/main.js`** -- WorldSelectScene, LevelSelectScene import 및 scene 배열 등록

### 알려진 제약

- Phase 3는 인메모리 임시 진행 데이터를 사용. 실제 세이브 연동은 Phase 4에서 처리
- forest 월드만 해금, 첫 번째 맵만 플레이 가능 (별점 모두 0)
- ENDLESS 버튼은 항상 잠금 상태 (Phase 4에서 해금 로직 구현 예정)
- MenuScene의 CLASSIC_MAP import가 미사용 상태(dead import). 기능 영향 없음
- MapClearScene/GameOverScene의 mapData null 미처리. 정상 플로우에서는 발생 불가

### QA 결과

- **판정**: PASS
- Playwright 테스트 56개 통과 (정상 42 + 예외 14)
- 시각적 검증 스크린샷 5건 확인
- 수용 기준 27/27 충족

### 참고 문서

- 스펙: `.claude/specs/2026-02-26-world-map-phase3.md`
- 구현 리포트: `.claude/specs/2026-02-26-world-map-phase3-report.md`
- QA 리포트: `.claude/specs/2026-02-26-world-map-phase3-qa.md`
- 테스트: `tests/world-map-phase3.spec.js`

---

## 2026-02-26 -- 월드/맵 시스템 Phase 1+2 (동적 맵 인프라 + 월드 테마 + 별점 + 클리어 씬)

### 배경

하드코딩된 단일 맵(S자 경로, 엔드리스 모드)만 존재하던 구조를 동적 맵 시스템으로 리팩토링하고, 5개 월드(30개 캠페인 맵), 별점 시스템, 맵 클리어 결과 씬을 추가했다. Phase 1에서 동적 맵 인프라를 구축하고, Phase 2에서 실제 월드/맵 데이터와 클리어 UI를 구현했다.

### 추가 (Phase 1: 동적 맵 인프라)

- **`js/data/maps.js`** -- 맵 데이터 구조 및 레지스트리 신규 생성
  - MapData/MapTheme 타입 JSDoc 정의
  - CLASSIC_MAP: 기존 config.js의 MAP_GRID/PATH_WAYPOINTS를 MapData 구조로 추출
  - mapRegistry: Map 기반 레지스트리 (getMapById, registerMap)
  - validateMapData(): 그리드 크기, 셀 타입, 스폰/기지 위치, 웨이포인트 인접성(상하좌우만) 검증

### 변경 (Phase 1: 동적 맵 인프라)

- **`js/managers/MapManager.js`** -- constructor에 mapData 파라미터 추가
  - `constructor(scene)` -> `constructor(scene, mapData)`
  - MAP_GRID/PATH_WAYPOINTS 하드코딩 제거, mapData.grid/waypoints/spawnPos/basePos 참조
  - renderMap(): mapData.theme 있으면 테마 색상 적용 (없으면 기본 색상 폴백)
  - getCellType() 버그 수정: 전역 MAP_GRID -> this.grid 인스턴스 데이터 참조
- **`js/managers/WaveManager.js`** -- constructor에 options 파라미터 추가
  - `constructor(scene)` -> `constructor(scene, options = {})`
  - totalWaves: options.totalWaves ?? Infinity (캠페인 모드 지원)
  - waveOverrides: options.waveOverrides || null (커스텀 웨이브)
  - WaveState.MAP_CLEAR 추가: totalWaves 도달 시 mapClear 이벤트 발행
  - isMapCleared() 메서드 추가
- **`js/scenes/GameScene.js`** -- init(data) 파라미터 수신
  - init() -> init(data = {}), this.mapData/this.gameMode 저장
  - create(): new MapManager(this, this.mapData), new WaveManager(this, { totalWaves, waveOverrides })
  - _gameOver(): mapData/gameMode를 GameOverScene에 전달
- **`js/scenes/GameOverScene.js`** -- init에서 mapData/gameMode 저장, RETRY 시 전달
- **`js/scenes/MenuScene.js`** -- CLASSIC_MAP import, GAME START에서 mapData/gameMode 전달

### 추가 (Phase 2: 월드 테마 + 별점 + 맵 데이터 + 클리어 씬)

- **`js/data/worlds.js`** -- 5개 월드 정의
  - WorldData 타입 JSDoc 정의 (id, nameKey, descKey, theme, mapIds, requiredStars, order)
  - 테마 색상 상수: THEME_FOREST, THEME_DESERT, THEME_TUNDRA, THEME_VOLCANO, THEME_SHADOW
  - 해금 조건: 0별(숲), 9별(사막), 24별(설원), 42별(화산), 60별(그림자)
  - 유틸: getWorldById(), getWorldByMapId()
- **`js/data/maps/forest.js`** -- 숲 월드 6개 맵 (totalWaves 8~12, 전부 완성)
- **`js/data/maps/desert.js`** -- 사막 월드 6개 맵 (totalWaves 10~15, 2개 완성 + 4개 스켈레톤)
- **`js/data/maps/tundra.js`** -- 설원 월드 6개 맵 (totalWaves 12~18, 1개 완성 + 5개 스켈레톤)
- **`js/data/maps/volcano.js`** -- 화산 월드 6개 맵 (totalWaves 15~20, 1개 완성 + 5개 스켈레톤)
- **`js/data/maps/shadow.js`** -- 그림자 월드 6개 맵 (totalWaves 18~25, 1개 완성 + 5개 스켈레톤)
- **`js/scenes/MapClearScene.js`** -- 맵 클리어 결과 씬
  - 별점 3개 순차 팝업 애니메이션 (Back.easeOut, 0.3초 간격)
  - HP 잔량 비율 색상: >= 80% 골드(#ffd700), >= 40% 옅은 노랑(#fdcb6e), < 40% 빨강(#ff4757)
  - 다이아몬드 보상 페이드인 (1성=+3, 2성=+5, 3성=+8)
  - NEXT MAP / RETRY / WORLD MAP 3개 버튼
  - RETRY: 동일 mapData/gameMode로 GameScene 재시작
  - NEXT MAP / WORLD MAP: Phase 3에서 실제 네비게이션 구현 예정, 현재 MenuScene으로 임시 이동

### 변경 (Phase 2)

- **`js/config.js`** -- calcStarRating() 함수 추가
  - calcStarRating(currentHP, maxHP): HP 비율 >= 80% -> 3성, >= 40% -> 2성, > 0% -> 1성
  - maxHP <= 0 시 1성 반환 (0 나누기 방지)
  - CAMPAIGN_DIAMOND_REWARDS = [0, 3, 5, 8]
- **`js/scenes/GameScene.js`** -- mapClear 이벤트 리스너 + _onMapClear() 메서드 추가
  - isGameOver 설정 + BGM 정지 + 1초 딜레이 후 MapClearScene 전환
- **`js/main.js`** -- MapClearScene 씬 등록, 5개 월드 맵 데이터 사이드 이펙트 import
- **`js/i18n.js`** -- 캠페인 UI/월드/맵 이름 ko+en 번역 ~170줄 추가

### 알려진 제약

- 스켈레톤 맵 19개(desert 4, tundra 5, volcano 5, shadow 5)는 "직선+1턴" 단순 패턴. Phase 5에서 고유 경로 완성 예정
- NEXT MAP, WORLD MAP 버튼은 현재 MenuScene으로 임시 이동. Phase 3에서 실제 네비게이션 구현 예정
- MapClearScene의 "RETRY", "Waves:", "Kills:", "HP:" 텍스트가 i18n 미적용 (하드코딩). 실질적 영향 낮음
- MapClearScene에서 HP=0 입력 시 data.currentHP || 1로 HP=1로 보정됨 (의도적 방어 코드)

### QA 결과

- **판정**: PASS
- Phase 2 Playwright 테스트 24개 통과 (실패 4개는 ES 모듈 격리 이슈로 테스트 방법론 문제)
- Node.js 맵 검증 스크립트: 31개 맵(30 캠페인 + 1 클래식) 전부 validateMapData() 통과
- 시각적 검증 스크린샷 7건 확인
- 수용 기준 24/24 충족, 예외 시나리오 8/8 통과

### 참고 문서

- Phase 1 스펙: `.claude/specs/2026-02-26-world-map-phase1.md`
- Phase 1 구현 리포트: `.claude/specs/2026-02-26-world-map-phase1-report.md`
- Phase 2 스펙: `.claude/specs/2026-02-26-world-map-phase2.md`
- Phase 2 구현 리포트: `.claude/specs/2026-02-26-world-map-phase2-report.md`
- Phase 2 QA 리포트: `.claude/specs/2026-02-26-world-map-phase2-qa.md`
- 테스트: `tests/world-map-phase2.spec.js`, `tests/validate-maps-phase2.mjs`

---

## 2026-02-26 -- 합성도감 노드 트리 UI (Merge Tree UI)

### 배경

MergeCodexScene의 타워 카드 클릭 오버레이가 텍스트 레시피 목록(`재료A + 재료B -> 결과`) 형식이어서 합성 경로를 직관적으로 파악하기 어려웠다. 상향식 그래픽 노드 트리로 교체하여 시각적 이해도와 탐색성을 개선했다.

### 변경

- **`js/scenes/MergeCodexScene.js`** -- 카드 클릭 오버레이 전체 교체
  - 텍스트 레시피 목록 -> 상향식 노드 트리 UI (결과 타워 상단, 재료 2개 하단, Y자 연결선)
  - 추가된 메서드 11개:
    - `_renderOverlay(entry)`: 오버레이 컨테이너 생성, 상위 조합 조회, 패널 높이 동적 계산, T1/T2+ 분기
    - `_renderT1Panel(entry, panelX, panelTop, panelW, usedInList)`: T1 스탯 패널 (이름, 색상 원, attackType, DMG/SPD/RNG(메타 업그레이드 반영), 티어 뱃지, 상위 조합)
    - `_renderTreePanel(entry, panelX, panelTop, panelW, usedInList)`: 결과 노드 + Y자 연결선 + 재료 2개 + DMG/SPD/RNG 스탯 + 상위 조합
    - `_renderMaterialNode(matEntry, cx, cy, r, panelTop, currentEntry)`: 재료 노드 렌더링 + 클릭 드릴다운
    - `_renderConnectorLines(graphics, resultPos, forkY, matAPos, matBPos)`: Y자 연결선 그리기
    - `_handleBack()`: 히스토리 pop 또는 완전 닫기
    - `_forceCloseOverlay()`: 히스토리 무시 즉시 닫기
    - `_buildEntryById(id)`: _tierDataCache에서 ID로 entry 검색
    - `_applyMetaUpgradesToStats(towerType, stats)`: META_UPGRADE_TREE 기반 메타 업그레이드 보너스를 스탯에 적용 (multiply/add)
    - `_findUsedInRecipes(towerId)`: MERGE_RECIPES에서 해당 타워를 재료로 사용하는 상위 레시피 검색
    - `_renderUsedInSection(currentEntry, usedInList, panelX, startY, panelW)`: 상위 조합 드래그 스크롤 리스트 렌더링 (GeometryMask 클리핑, 뷰포트 100px, 항목 클릭 시 드릴다운)
  - 수정된 메서드 2개:
    - `_showCodexCardOverlay(entry)`: 히스토리 초기화 후 `_renderOverlay` 호출로 변경 (시그니처 유지)
    - `_closeOverlay()`: `_handleBack()` 위임으로 변경 (기존 호출부 호환)
  - 패널 높이 동적 계산: T1 기본 200px, T2+ 기본 300px, 상위 조합 있으면 +100px
  - 노드 트리 레이아웃 (패널 300x(200~400)px, 상향식):
    - 결과 노드: panelTop+90px, 반지름 28px, BTN_PRIMARY 테두리
    - 결과 타워명: panelTop+128px, 티어 뱃지: panelTop+144px
    - 연결선 시작: panelTop+155px, 분기점: panelTop+175px
    - 재료 노드: panelTop+210px, 반지름 20px, 좌우 +-55px
    - 재료 타워명: panelTop+238px, 티어 뱃지: panelTop+252px
    - T2+ 스탯: panelTop+270px (구분선) + 14px (DMG/SPD/RNG 텍스트)
  - 재료 노드 테두리: T2+=금색(BTN_PRIMARY), T1=회색(0x636e72)
  - 드릴다운: 재료 노드 클릭 시 히스토리 스택에 현재 entry push -> 재료 entry 렌더링
  - `< 뒤로` 버튼: 히스토리가 있을 때만 표시, 클릭 시 이전 트리 복귀
  - X 버튼: 히스토리 무시, 즉시 닫기 (`_forceCloseOverlay()`)
  - 배경(backdrop) 클릭: `_handleBack()` (히스토리 있으면 뒤로, 없으면 닫기)
  - T1 카드 클릭 시 T1 스탯 패널 표시 (메타 업그레이드 반영 + 상위 조합)
  - `_overlayHistory` 배열: 드릴다운 히스토리 스택 관리 (상위 조합 클릭도 히스토리에 push)
  - `_overlayClosedAt` 타임스탬프: 오버레이 닫기 후 200ms 이내 재클릭 방지
  - `_towerMetaUpgrades`: init() 시 localStorage에서 `saveData.towerUpgrades` 로드
- **`js/i18n.js`** -- i18n 키 추가
  - `codex.usedIn`: ko="상위 조합", en="Used In"

### 알려진 제약

- **LOW**: `_closeOverlay()`가 `_handleBack()` 위임으로 변경됨. 외부에서 `_closeOverlay()` 호출 시 히스토리가 있으면 완전 닫기가 아닌 뒤로가기로 동작함. 현재 외부 호출처 없음
- 기존 테스트 `merge-codex-scene.spec.js`의 3개 테스트가 텍스트 레시피 형식을 검증하므로 의도된 실패 발생 (노드 트리로 교체됨). 별도 업데이트 필요

### QA 결과

- **판정**: PASS
- Playwright 테스트 52개 전체 통과 (정상 30개 + 예외 22개)
- 시각적 검증 스크린샷 11건 확인
- 수용 기준 9/9 충족, 전체 102개 T2~T5 레시피 재료 ID 전수 확인

### 참고 문서

- 스펙: `.claude/specs/2026-02-26-merge-tree-ui.md`
- 구현 리포트: `.claude/specs/2026-02-26-merge-tree-ui-report.md`
- QA 리포트: `.claude/specs/2026-02-26-merge-tree-ui-qa.md`
- 테스트: `tests/merge-tree-ui.spec.js`

---

## 2026-02-25 -- 문서 수치 정합성 교정

### 배경

tower.md의 T1 타워 스탯 표가 실제 코드(config.js)와 불일치하는 항목이 다수 발견되어 일괄 교정.

### 수정

- **tower.md T1 타워 스탯 6건 교정** (config.js 실제 값으로 통일)
  - 번개: damage 20→18, fireRate 1.0→1.2, chainDecay/chainRadius 보충
  - 불꽃: damage 12→5, fireRate 1.2→1.5, burn 5→4
  - 바위: damage 40→45, fireRate 2.5→3.0
  - 독안개: damage 5→3, poison 4→3, splashRadius:60·armorReduction:20%/4s 추가
  - 바람: fireRate 1.0→2.5, range 100→120
  - 빛: fireRate 1.5→1.8
- **tower.md T3 공격 타입 분포 수량 3건 교정**
  - chain 8→7, aoe_instant 13→12, splash 7→9 (실제 ID 리스트와 일치하도록)

---

## 2026-02-24 -- 합성도감 전용 씬 (MergeCodexScene)

### 배경

기존 CollectionScene의 합성도감 탭은 saveData.discoveredMerges 기반으로 발견/미발견을 구분하여 표시했고, T4/T5 미발견 타워는 레시피가 비공개였다. 플레이어가 조합 전략을 세우려면 모든 레시피를 미리 볼 수 있어야 하며, 게임 중에도 전략 참고를 위해 도감에 접근할 수 있어야 한다.

### 추가

- **`js/scenes/MergeCodexScene.js`** -- 합성도감 전용 씬 신규 생성
  - TopBar: BACK 버튼(x=38, y=24) + 타이틀(x=180, y=24, i18n `codex.title`)
  - SubTab Bar: T1~T5 서브탭 5개 (각 64px, 간격 4px, y=48~76)
  - 기본 선택 서브탭: T2 (매 진입 시 초기화)
  - Progress 표시: "T{n}: {total}종" (y=90, 12px, #b2bec3, 중앙 정렬)
  - 카드 그리드: 62x74px, 5열, 간격 6px, Geometry Mask 스크롤
  - 카드 표시: 모든 타워 전부 공개 (발견 여부 무관, ??? 카드 없음)
    - 색상 원(반지름 10px), 이름(6자 초과 5자+.. truncate, 9px), attackType 뱃지(8px, #81ecec), 티어 뱃지(8px, #ffd700)
  - 티어별 테두리 색상: T1/T2=0xb2bec3, T3/T5=0xffd700, T4=0xa29bfe
  - 카드 클릭 상세 오버레이(280x200px, 화면 중앙):
    - T1: 이름, 색상 원, attackType, DMG/SPD/RNG
    - T2~T5: 이름, 재료A + 재료B -> 결과이름, attackType, Tier
    - T4/T5도 레시피 전부 공개 (기존 비공개 처리 없음)
  - 드래그 스크롤: 5px threshold로 클릭/드래그 구분
  - 씬 복귀(`_goBack()`): GameScene에서 진입 시 scene.stop + scene.wake, CollectionScene에서 진입 시 scene.start
  - 타워 수: T1=10종, T2=55종, T3=30종, T4=12종, T5=5종 (총 112종)

- **`js/main.js`** -- MergeCodexScene import 및 scene 배열 등록

- **`js/i18n.js`** -- 신규 i18n 키 추가 (ko/en)
  - `codex.title`: 합성도감 / Merge Codex
  - `codex.progress`: T{n}: {total}종 / T{n}: {total} towers
  - `ui.mergeCodex`: 합성도감 / Merge Codex

### 변경

- **`js/scenes/GameScene.js`** -- Pause 오버레이 확장 + wake 이벤트 처리
  - Pause 패널 높이 220 -> 260, 중심 y=300 -> 310
  - 합성도감 버튼 추가: y=288, 색상 0x6c5ce7(보라), i18n `ui.mergeCodex`
  - Resume y=252(유지), 합성도감 y=288(신규), Main Menu y=324, Volume Controls baseY=360
  - 합성도감 버튼 클릭: `_hidePauseOverlay()` -> `scene.launch('MergeCodexScene')` -> `scene.sleep('GameScene')` (isPaused=true 유지)
  - `_hidePauseOverlay()` 메서드 신규 추가: pauseOverlay destroy만 수행 (isPaused 변경 없음)
  - `_resumeGame()`: isPaused=false + `_hidePauseOverlay()` 호출로 리팩토링
  - `_onWake()` 메서드 추가: isPaused=true이면 `_showPauseOverlay()` 재표시
  - `_cleanup()`에서 wake 리스너 해제 추가

- **`js/scenes/CollectionScene.js`** -- Codex 관련 코드 전체 제거
  - 합성도감 탭 클릭 핸들러: `scene.start('MergeCodexScene', { fromScene: 'CollectionScene' })`로 교체
  - 제거된 메서드 12개: `_buildCodexTab`, `_buildCodexSubTabs`, `_buildCodexContent`, `_createCodexCard`, `_showCodexCardOverlay`, `_setupCodexDrag`, `_cleanupCodexDrag`, `_applyCodexScroll`, `_buildTierData`, `_getTierBorderColor`, `_getAttackTypeBadge`, `_getDisplayNameById`
  - 제거된 상태 변수 10개: `codexTier`, `codexScrollY`, `codexDragging`, `codexDragStartY`, `codexDragStartScroll`, `codexDragMoved`, `_tierDataCache`, `codexScrollContainer`, `_subTabContainer`, `_codexContentContainer`, `_maskShape`
  - 미사용 import 제거: `MERGE_RECIPES`, `MERGED_TOWER_STATS`
  - 메타업그레이드 탭 기능 영향 없음

### 수정

- **ISSUE-1 [HIGH]**: MergeCodexScene 서브탭 전환 시 Progress 텍스트 누적/겹침 -- progress 텍스트를 `_codexContentContainer`에 추가하여 탭 전환 시 컨테이너와 함께 정상 파괴되도록 수정

### 알려진 제약

- **LOW**: 오버레이 표시 중 backdrop 영역에서 드래그하면 뒤쪽 스크롤이 활성화될 수 있음. backdrop의 setInteractive()가 대부분 이벤트를 차단하므로 실제 문제 미확인

### QA 결과

- **R1 판정**: FAIL (ISSUE-1 HIGH 1건 -- Progress 텍스트 누적/겹침)
- **R2 판정**: PASS -- ISSUE-1 수정 확인, 수용 기준 15/15 충족, 예외 시나리오 12/12 통과
- Playwright 테스트 50개 전체 통과 (정상 36개 + 예외 14개)
- 시각적 검증 스크린샷 13건 확인

### 참고 문서

- 스펙: `.claude/specs/2026-02-24-combination-collection.md`
- 구현 리포트: `.claude/specs/2026-02-24-combination-collection-report.md`
- QA 리포트: `.claude/specs/2026-02-24-combination-collection-qa.md`
- 테스트: `tests/merge-codex-scene.spec.js`

---

## 2026-02-24 -- 머지 프리뷰 UI (조합 목록 + 드래그 하이라이트)

### 배경

머지 시스템에서 드래그&드롭으로만 조합 결과를 확인할 수 있어, 102종 레시피 중 어떤 타워와 합성하면 무엇이 나오는지 미리 파악할 방법이 없었다. 타워 선택 시 조합 목록 표시(기능 A)와 드래그 시 시각적 유도(기능 B)를 추가하여 UX를 개선했다.

### 추가

- **`js/ui/TowerPanel.js`** -- 기능 A: 조합 목록 시스템
  - `_buildMergeList(tower, startY)`: 선택 타워의 MERGE_RECIPES 매칭 항목을 infoContainer에 렌더링
    - 섹션 헤더: "합성 가능" (9px, #b2bec3, x=10)
    - 항목 형식: `+[파트너명] -> [결과명](T[티어])`, 결과 타워 color CSS, 9px
    - MAX_SHOW 동적 계산: `Math.max(3, Math.min(5, Math.floor(available / 12)))` (패널 잔여 공간 기반)
    - 5개 초과 시 "외 N개" 텍스트 (9px, #636e72)
    - 각 항목 탭 시 `_flashMergeTargets(partnerType)` 호출
  - `_flashMergeTargets(partnerType)`: 맵 위 해당 파트너 타입 타워에 노란 원(0xffd700, 반지름 20, depth 40) 깜빡임 애니메이션 (alpha 1->0, 300ms, yoyo, repeat 2, 총 ~1.8초)
  - 생성자에 `_mergeHighlights`, `_mergePreviewBubble`, `_hoveredMergeTarget` 상태 변수 추가

- **`js/ui/TowerPanel.js`** -- 기능 B: 드래그 하이라이트 + 호버 미리보기
  - `_startMergeHighlights(dragTower)`: 드래그 시작 시 합성 가능한 타워에 펄스 하이라이트 (strokeCircle 반지름 22, lineWidth 3, 0xffd700, depth 40, alpha 1.0<->0.5, 600ms, yoyo, repeat -1)
  - `_showMergePreviewBubble(tower, result)`: 호버 시 결과 미리보기 말풍선 (Container depth 41, 90x32px, fill 0x0a0e1a alpha 0.9, 결과 color 테두리 lineWidth 2, 결과명 10px bold, 티어 9px #aaaaaa)
  - `_hideMergePreviewBubble()`: 말풍선 제거 + 상태 초기화
  - `_clearMergeHighlights()`: tween.stop() + graphics.destroy() + 배열 초기화
  - 말풍선 Y 클리핑: `Math.max(HUD_HEIGHT + 20, tower.y - 34)`

- **`js/scenes/GameScene.js`** -- TowerPanel callbacks에 `getTowers: () => this.towers` 추가

- **`js/i18n.js`** -- 머지 프리뷰 문자열 추가
  - ko: `ui.mergeList.header` = "합성 가능", `ui.mergeList.more` = "외 {n}개"
  - en: `ui.mergeList.header` = "Can merge", `ui.mergeList.more` = "+{n} more"

### 변경

- **`js/ui/TowerPanel.js`** -- 기존 메서드 수정
  - `showTowerInfo()`: `hasRecipes && isMergeable && enhanceLevel === 0` 조건에서 `_buildMergeList()` 호출
  - `startDrag()`: 기존 로직 뒤에 `_startMergeHighlights(tower)` 호출 추가
  - `updateDrag()`: ghost 업데이트 후 `pixelToGrid`로 셀 계산, `_mergeHighlights`에서 hover 감지하여 말풍선 show/hide
  - `endDrag()`: cleanup 직후 `_clearMergeHighlights()` + `_hideMergePreviewBubble()` 호출
  - `destroy()`: `_clearMergeHighlights()` + `_hideMergePreviewBubble()` 호출 추가

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| 플래시 지속 시간 | 1.5초 | ~1.8초 (300ms x 2 yoyo x 3 repeat) | Phaser tween 구조상 `repeat:2`가 초기 1회 + 반복 2회 = 총 3회 x 600ms yoyo = 1.8초. 체감 차이 미미 |

### QA 결과

- **판정**: PASS
- Playwright 테스트 49개 전체 통과 (정상 36개 + 예외/엣지케이스 13개)
- 시각적 검증 스크린샷 2건 확인
- 수용 기준 13/13 충족, 스펙 대비 구현 일치도 전항목 일치

### 참고 문서

- 스펙: `.claude/specs/2026-02-24-merge-preview-ui.md`
- 구현 리포트: `.claude/specs/2026-02-24-merge-preview-ui-report.md`
- QA 리포트: `.claude/specs/2026-02-24-merge-preview-ui-qa.md`
- 테스트: `tests/merge-preview-ui.spec.js`

---

## 2026-02-24 -- 머지 조합 타워 시스템 Phase 4-B (CollectionScene 합성도감)

### 배경

Phase 4-A에서 추가된 T4 12종 + T5 5종 데이터에 맞춰, CollectionScene을 "메타업그레이드 탭 + 합성도감 탭" 이중 탭 구조로 전면 교체했다. 합성도감에서 T1~T5 전 타워를 서브탭으로 분류하여 발견/미발견 카드를 표시하고, 레시피 힌트와 드래그 스크롤을 지원한다.

### 추가

- **`js/scenes/CollectionScene.js`** -- 전면 재작성
  - 탭 바 (y=48, h=36): "메타업그레이드" / "합성도감" 2개 탭 버튼 (각 W=165)
  - 선택 탭: COLORS.UI_PANEL 배경 + 하단 강조선 2px (COLORS.DIAMOND)
  - 비선택 탭: COLORS.BACKGROUND 배경, 텍스트 #636e72
  - 기본 탭: 메타업그레이드 (기존 로직 유지, META_GRID_Y=96으로 조정)
  - 합성도감 탭:
    - 서브탭 바 (T1~T5, 각 64px, 간격 4px, y=88)
    - 진행률 표시 (y=122, "T{n}: {count} / {total} 발견")
    - 카드 그리드 (y=142~640, 62x74px 카드, 5열, 간격 6px, 자동 중앙정렬)
    - 발견 카드: 타워 색상 원 + 이름(6자 초과 truncate) + attackType 뱃지 + 티어 뱃지
    - 미발견 카드: 검은 배경(0x0d1117) + "???" + 티어 뱃지
    - 드래그 스크롤: `this.input.on()` 전역 이벤트 기반, 5px threshold로 클릭/드래그 구분
    - Geometry Mask: CODEX_GRID_Y~GAME_HEIGHT 영역 클리핑
  - 카드 클릭 오버레이:
    - T1: 타워 기본 정보 (이름, 색상원, attackType, DMG/SPD/RNG 스탯)
    - T2~T3 발견: 레시피 힌트 ("재료A + 재료B -> 결과이름", attackType, Tier)
    - T2~T3 미발견: 레시피 힌트 ("재료A + 재료B -> ???")
    - T4~T5 발견: "레시피 비공개" + attackType
    - T4~T5 미발견: 반응 없음
  - `_buildTierData()`: TOWER_STATS + MERGE_RECIPES에서 T1~T5 데이터 캐시 생성
  - `_getDisplayNameById()`: 타워/머지 ID에서 i18n 기반 표시이름 조회

- **`js/i18n.js`** -- 컬렉션 UI 문자열 10개 추가 (ko 5개 + en 5개)
  - `collection.tab.meta`: 메타업그레이드 / Meta Upgrade
  - `collection.tab.codex`: 합성도감 / Merge Codex
  - `collection.codex.progress`: {tier}: {count} / {total} 발견 / discovered
  - `collection.codex.unknown`: ??? / ???
  - `collection.codex.recipeHidden`: 레시피 비공개 / Recipe Hidden

### 수정

- **BUG-1 [HIGH]**: 드래그 존 rectangle이 카드 클릭 차단 -- `_codexDragZone` 완전 제거, `this.input.on()` 전역 이벤트로 대체. `activeTab !== 'codex'` 및 `pointer.y < CODEX_GRID_Y` 가드 조건으로 메타탭/서브탭 영역 간섭 방지
- **BUG-2 [MEDIUM]**: maskShape 메모리 누수 -- `this._maskShape` 인스턴스 변수로 추적 + `_codexContentContainer.add()` 자식 추가. 서브탭 전환 시 컨테이너 파괴와 함께 자동 정리
- **BUG-3 [MEDIUM]**: T1 이름 영어/T2+ 한국어 혼재 -- `_buildTierData()` T1 섹션에서 `t('tower.${type}.name')` i18n 키 사용으로 통일
- **BUG-4 [MEDIUM]**: T2+T1 레시피 힌트 재료명 영한 혼재 -- `_getDisplayNameById()`에서도 i18n 적용 (BUG-3과 동일 패턴)

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| i18n 문자열 수 | 10개 | ko 5개 + en 5개 (합계 10개) | 스펙과 일치 |
| 티어 테두리 색상 | 스펙 미명시 | T1/T2=은색(0xb2bec3), T3/T5=금색(0xffd700), T4=보라(0xa29bfe) | 기존 Tower.js `_drawTierBorder()` 패턴과 통일 |

### 알려진 제약

- **NEW-1 [LOW]**: 5px 이상 드래그 스크롤 후 첫 번째 카드 클릭이 무시될 수 있음. Phaser 3의 이벤트 발생 순서(game object -> scene input)에 기인. 두 번째 클릭부터 정상 동작
- **NEW-2 [LOW]**: 오버레이 표시 중 backdrop 영역에서 드래그하면 뒤쪽 스크롤이 활성화됨. 오버레이가 UI를 차단하므로 사용자 영향 극히 적음
- **T4/T5 미발견 카드**: `useHandCursor: true`가 설정되어 있으나, T4/T5 미발견 시 클릭 반응 없음. 시각적 불일치 있으나 기능 영향 없음

### QA 결과

- **1차 판정**: FAIL (BUG-1 HIGH 1건, BUG-2 MEDIUM 1건, BUG-3/BUG-4 MEDIUM 2건)
- **2차(R2) 판정**: PASS (조건부) -- 4건 전체 수정 확인, 신규 LOW 이슈 2건 발견 (즉시 수정 불요)
- 정적 코드 분석 23건 (정상 15개 + 예외 8개) + Playwright 테스트 23개 작성

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-merge-tower-system-phase4.md`
- 구현 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase4b-report.md`
- 수정 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase4b-fix-report.md`
- QA 리포트 (R1): `.claude/specs/2026-02-23-merge-tower-system-phase4b-qa.md`
- QA 리포트 (R2 최종): `.claude/specs/2026-02-23-merge-tower-system-phase4b-qa-r2.md`
- 테스트: `tests/collection-scene-phase4b-r2.spec.js`

---

## 2026-02-24 -- 머지 조합 타워 시스템 Phase 4-A (T4 12종 + T5 5종)

### 배경

Phase 3에서 구축한 T3 30종 위에 T4 합성 타워 12종(T3+T1 6종, T3+T2 3종, T3+T3 3종)과 T5 전설 합성 타워 5종(T4+T4 조합)의 레시피, 스탯, i18n 문자열을 추가했다. 신규 attackType이나 특수효과 없이 기존 효과의 강화 조합만 사용하며, config.js 데이터 추가와 i18n.js 문자열 추가만으로 구현 완료되었다. Tower.js, GameScene.js, TowerPanel.js는 기존 인프라가 tier:4/5를 자동 처리하므로 수정 없음.

### 추가

- **`js/config.js`** -- MERGE_RECIPES에 T4 12종 + T5 5종 레시피 등록 (tier: 4, 5)
  - T4 T3+T1 6종: void_sniper, annihilation_gale, magma_core, glacial_epoch, apex_toxin, radiant_ruin
  - T4 T3+T2 3종: storm_dominion, maelstrom_herald, solar_cremation
  - T4 T3+T3 3종: world_breaker, genesis_verdict, pandemic_sovereign
  - T5 T4+T4 5종: omega_herald, extinction_engine, absolute_dominion, star_forge, void_maelstrom
  - 각 레시피: `{ id, tier, displayName, color }`

- **`js/config.js`** -- MERGED_TOWER_STATS에 T4 12종 + T5 5종 스탯 블록 등록
  - T4 공격 타입별: chain 2종 (void_sniper, storm_dominion), aoe_instant 7종, splash 1종 (world_breaker), piercing_beam 2종 (radiant_ruin, genesis_verdict)
  - T5 공격 타입별: chain 2종 (omega_herald, absolute_dominion), aoe_instant 2종 (extinction_engine, star_forge), piercing_beam 1종 (void_maelstrom)
  - 모든 스탯이 스펙과 1:1 일치

- **`js/i18n.js`** -- T4 12종 + T5 5종 타워 이름/설명 ko+en 추가 (68개 문자열)
  - 키 형식: `tower.[mergeId].name`, `tower.[mergeId].desc`

### 변경

- **`js/config.js`** -- JSDoc 주석 업데이트
  - MERGE_RECIPES: "85 recipes" -> "102 recipes: 55 T2 + 30 T3 + 12 T4 + 5 T5"
  - MERGED_TOWER_STATS: "85 stat blocks" -> "102 stat blocks: 55 T2 + 30 T3 + 12 T4 + 5 T5"

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| color 필드 | 스펙에 미명시 | 각 T4/T5 타워에 테마 기반 고유 색상 할당 | 기존 T2/T3 데이터 패턴과 동일하게 color 필드 필수, 재료 타워 색상 참고하여 배정 |

### QA 결과

- **판정**: PASS
- 정적 코드 분석 24건 검증 (수용 기준 4개 + 데이터 정합성 6개 + 레시피 유효성 4개 + 스탯 검증 7개 + 핸들러 호환성 1개 + 자체 도출 예외 6개)
- 수용 기준 4/4 충족, 17개 타워 스펙 1:1 대조 완료

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-merge-tower-system-phase4.md`
- QA 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase4a-qa.md`

---

## 2026-02-24 -- 머지 조합 타워 시스템 Phase 3 (3티어 30종)

### 배경

Phase 2에서 구축한 T2 합성 타워 55종 위에 T3 합성 타워 30종(T2+T2 12종, T2+T1 18종)의 레시피, 스탯, i18n 문자열을 추가했다. 신규 attackType이나 특수효과 없이 기존 효과의 강화 조합만 사용하며, config.js 데이터 추가와 i18n.js 문자열 추가만으로 구현 완료되었다. Tower.js, GameScene.js, TowerPanel.js는 기존 인프라가 tier:3을 자동 처리하므로 수정 없음.

### 추가

- **`js/config.js`** -- MERGE_RECIPES에 T3 30종 레시피 등록 (tier: 3)
  - T2+T2 12종: thunder_wyrm_king, plague_wyrm, cosmos_dragon, tectonic_dragon, adamantine_lightning, venom_sovereign, absolute_frost_domain, celestial_judgment, superconductor_mage, grand_pyromancer, lightning_tempest, hellquake
  - T2+T1 18종: primal_dragon_lord, molten_hell, iron_dragon, eternal_blizzard, storm_deity, great_poison_king, wind_dragon_king, divine_sun_ray, arcane_dragon_sage, sky_lancer, death_miasma, thunderstorm_king, solar_cannon, great_typhoon, earth_shatterer, permafrost, sacred_judgement_beam, arcane_cannon
  - 각 레시피: `{ id, tier:3, displayName, color }`

- **`js/config.js`** -- MERGED_TOWER_STATS에 T3 30종 스탯 블록 등록
  - 공격 타입별: chain 8종, aoe_instant 13종, splash 7종, piercing_beam 2종
  - 모든 스탯이 스펙과 1:1 일치

- **`js/i18n.js`** -- T3 30종 타워 이름/설명 ko+en 추가 (120개 문자열)
  - 키 형식: `tower.[mergeId].name`, `tower.[mergeId].desc`

### 변경

- **`js/config.js`** -- JSDoc 주석 업데이트
  - MERGE_RECIPES: "55 T2 recipes" -> "85 recipes: 55 T2 + 30 T3"
  - MERGED_TOWER_STATS: "55 T2 stat blocks" -> "85 stat blocks: 55 T2 + 30 T3"

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| color 필드 | 스펙에 미명시 | 각 T3 타워에 테마 기반 고유 색상 할당 | 기존 T2 데이터 패턴과 동일하게 color 필드 필수, 재료 타워 색상 참고하여 배정 |

### T1 10종 활용 현황

모든 T1 타워 10종이 최소 1회 이상 T3 재료로 사용됨.

| T1 | 횟수 | T3 타워 |
|---|---|---|
| archer | 1 | sky_lancer |
| mage | 2 | arcane_dragon_sage, arcane_cannon |
| ice | 2 | eternal_blizzard, permafrost |
| lightning | 2 | storm_deity, thunderstorm_king |
| flame | 1 | molten_hell |
| rock | 2 | iron_dragon, earth_shatterer |
| poison | 2 | great_poison_king, death_miasma |
| wind | 2 | wind_dragon_king, great_typhoon |
| light | 3 | divine_sun_ray, solar_cannon, sacred_judgement_beam |
| dragon | 1 | primal_dragon_lord |

### QA 결과

- **판정**: PASS
- 정적 코드 분석 27건 검증 (정상 19개 + 예외/엣지케이스 8개)
- 수용 기준 8/8 충족, 데이터 정합성 6/6 통과, 스탯 검증 7/7 통과

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-merge-tower-system-phase3.md`
- 구현 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase3-report.md`
- QA 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase3-qa.md`

---

## 2026-02-23 -- 머지 조합 타워 시스템 Phase 2 (2티어 55종)

### 배경

Phase 1에서 구축한 머지 인프라(드래그&드롭, 데이터 구조, 세이브 마이그레이션) 위에 2티어 합성 타워 55종(동종 10 + 이종 45)의 레시피, 스탯, i18n 문자열을 등록하여 실제 합성 플레이를 활성화한다. QA에서 발견된 공격 핸들러 미지원 이슈(P0 2건, P1 4건, P2 2건)를 수정하여 55종 전체의 복합 효과가 전투에서 정상 적용되도록 했다.

### 추가

- **`js/config.js`** -- MERGE_RECIPES에 55종 T2 레시피 등록
  - 동종 10종: rapid_archer, overload_mage, zero_field, thunder_lord, inferno, quake, plague, typhoon, solar_burst, ancient_dragon
  - 이종 45종: archer 조합 8종, mage 조합 7종, ice 조합 6종, lightning 조합 5종, flame 조합 4종, rock 조합 3종, poison 조합 2종, wind 조합 1종, dragon 조합 9종
  - 각 레시피: `{ id, tier:2, displayName, color }`

- **`js/config.js`** -- MERGED_TOWER_STATS에 55종 T2 스탯 블록 등록
  - 공격 타입별: single 4종, splash 18종, aoe_instant 13종, chain 9종, dot_single 4종, piercing_beam 7종
  - 효과별 속성: damage, fireRate, range, attackType, splashRadius, slowAmount/Duration, burnDamage/Duration, poisonDamage/Duration, armorReduction/Duration, armorPiercing, pushbackDistance/Targets, chainCount/Decay/Radius, maxPoisonStacks, projectileSpeed

- **`js/i18n.js`** -- 55종 T2 타워 이름/설명 ko+en 추가 (220개 문자열)
  - 키 형식: `tower.[mergeId].name`, `tower.[mergeId].desc`

### 변경

- **`js/scenes/GameScene.js`** -- `_applyChain()` 핸들러 확장
  - burn, poison, armorReduction, pushback 효과 적용 로직 추가 (각 `if` 가드로 보호)
  - 영향 타워: thunder_fire(burn), toxic_shock(poison+armorReduction), storm_bolt(pushback), thunder_dragon(burn)

- **`js/scenes/GameScene.js`** -- `_applyBeam()` 핸들러 확장
  - slow, poison, armorReduction, pushback 효과 적용 로직 추가
  - 영향 타워: holy_ice(slow), purge_venom(poison+armorReduction), radiant_gale(pushback)

- **`js/entities/Projectile.js`** -- `_hitDotSingle()` 핸들러 확장
  - poison, slow, armorReduction 효과 적용 로직 추가
  - 영향 타워: venom_shot(poison+armorReduction), cryo_flame(slow), venom_fire(poison)

- **`js/entities/Projectile.js`** -- `_hitSplash()` 핸들러 확장
  - pushback 효과 적용 로직 추가
  - 영향 타워: vacuum_mage, stone_gale, storm_dragon

- **`js/entities/Tower.js`** -- `_getColor()` O(n) -> O(1) 정적 캐시 최적화
  - `Tower._mergeColorMap` 정적 캐시: 최초 1회 빌드 후 O(1) 직접 조회
  - 캐시 미적중(미래 T3+) 시 `TOWER_STATS[this.type].color` 폴백

- **`js/entities/Tower.js`** -- `MERGE_RECIPES` import, `t()` import 추가

- **`js/ui/TowerPanel.js`** -- `_drawDragGhost()` 시그니처 변경
  - `(x, y, type)` -> `(x, y, tower)`: tower 객체 직접 전달로 합성 타워 색상 지원
  - `tower._getColor()` 호출로 T2 타워의 레시피 색상 표시

### 수정

- **`js/config.js`** -- `ancient_dragon` 데이터 오류 수정
  - `poisonDuration: 6` 추가 (poisonDamage:10 존재하나 duration 누락으로 poison 효과 무효화)
  - `burnDuration: 4` 추가 (burnDamage:12 존재하나 duration 누락으로 burn 효과 무효화)

- **`js/config.js`** -- `toxic_shock` 데이터 오류 수정
  - `poisonDuration: 4`, `armorReductionDuration: 4` 추가

- **`js/config.js`** -- chain 타입 7종에 `chainDecay: 0.7` 명시
  - 대상: thunder_frost, thunder_fire, thunder_strike, toxic_shock, storm_bolt, holy_thunder, thunder_dragon
  - thunder_lord(0.85), shock_arrow(0.8)는 개별 값 유지

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| ancient_dragon burnDuration | 스펙에 미명시 | burnDuration:4 추가 | burnDamage:12가 있으면서 duration 없으면 burn 무효. QA에서 동일 유형 오류로 식별 |
| storm_mage chainCount/chainRadius | splash 타입에서 chain 속성 보유 | 미수정 (데이터 유지, 동작 무시) | splash 핸들러가 chain 속성을 사용하지 않으므로 실제 동작 영향 없음. 의도적 설계 가능성 |

### 알려진 제약

- `storm_mage`의 `chainCount:3, chainRadius:60`이 attackType `splash`에서 무시됨. 데이터는 존재하나 splash 핸들러가 chain 관련 속성을 참조하지 않음
- Playwright 테스트 파일(`tests/merge-tower-phase2-fix.spec.js`) 작성 완료, 서버 기동 후 실행 가능

### QA 결과

- **Phase 2 초기 판정**: FAIL (P0 데이터 오류 2건, P1 핸들러 미지원 4건, P2 개선 2건)
- **Phase 2 수정 후 판정 (R2)**: PASS (8건 전체 수정 확인, 55종 전체 효과 적용 가능 검증, T1 영향 없음 확인)
- 정적 코드 분석 20건 검증 (정상 8개 + 예외 12개)

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-merge-tower-system.md`
- Phase 2 수정 리포트: `.claude/specs/2026-02-23-merge-tower-system-phase2-fix-report.md`
- Phase 2 QA 리포트 (R2 최종): `.claude/specs/2026-02-23-merge-tower-system-phase2-qa-r2.md`
- 테스트: `tests/merge-tower-phase2-fix.spec.js`

---

## 2026-02-23 -- 머지 조합 타워 시스템 Phase 1 (기반 구축)

### 배경

기존 A/B 분기 업그레이드 트리(Lv.1->2->3, 40종 최종형)를 제거하고, 배치된 타워끼리 드래그&드롭으로 합성하는 Merge 시스템으로 교체하기 위한 Phase 1 기반 작업. Phase 1에서는 기존 시스템 제거와 머지 인프라(데이터 구조, 드래그 UI, 세이브 마이그레이션)를 구축한다. MERGE_RECIPES는 빈 객체이므로 실제 합성은 Phase 2에서 활성화된다.

### 제거

- **`js/config.js`** -- A/B 분기 관련 상수 및 데이터 제거
  - `TOWER_STATS[*].levels`에서 `2a`, `2b`, `3aa`, `3ab`, `3ba`, `3bb` 키 전부 삭제, `levels[1]`만 유지
  - `MAX_TOWER_LEVEL`, `LV3_SHAPE_SCALE`, `DRAGON_TOWER_LOCKED`, `DRAGON_UNLOCK_COST` 상수 제거
- **`js/entities/Tower.js`** -- `level`, `branch`, `branch3` 필드 제거, `upgrade()` 메서드 제거
- **`js/ui/TowerPanel.js`** -- A/B 분기 버튼 UI 전체 제거
  - `_createBranchButton()`, `_calcStatDiff()`, `_getBranchTags()` 메서드 제거
  - `callbacks.onUpgrade` 제거
- **`js/scenes/GameScene.js`** -- `_onTowerUpgrade()` 제거

### 추가

- **`js/config.js`** -- 머지 시스템 인프라
  - `MERGE_RECIPES = {}` (Phase 2에서 55종 채울 예정)
  - `MERGED_TOWER_STATS = {}` (Phase 2에서 55종 스탯 채울 예정)
  - `getMergeKey(typeA, typeB)`: 알파벳 오름차순 정렬 + `+` 연결 키 생성
  - `getMergeResult(typeA, typeB)`: MERGE_RECIPES 조회
  - `isMergeable(tower)`: `tower.enhanceLevel === 0` 체크
  - `isUsedAsMergeIngredient(id)`: MERGE_RECIPES에서 재료 여부 확인
  - `SAVE_DATA_VERSION = 2`
  - `TOWER_STATS[*].locked`, `TOWER_STATS[*].unlockCost` 필드 (범용 잠금)
    - dragon: `locked: true`, `unlockCost: 50` / 나머지 9종: `locked: false`, `unlockCost: 0`
- **`js/entities/Tower.js`** -- 머지 관련 필드/메서드
  - `tier` (기본 1), `mergeId` (기본 null) 필드
  - `applyMergeResult(mergeData)`: mergeId, tier, stats 업데이트
  - `_drawTierBorder()`: 2티어=은색(0xb2bec3), 3티어=금색(0xffd700), 4티어=보라(0xa29bfe), 5티어=정적 금색
  - `canEnhance()` 조건 변경: `enhanceLevel < MAX && !isUsedAsMergeIngredient(id)`
  - `getInfo()` 반환값에 `tier`, `mergeId`, `displayName`, `isMergeable` 추가
- **`js/ui/TowerPanel.js`** -- 드래그&드롭 머지 UI
  - `startDrag(tower, pointer)`: 원래 타워 alpha=0, 반투명 고스트 생성 (depth 50)
  - `updateDrag(pointer)`: 고스트 위치 업데이트
  - `endDrag(pointer, getTowerAt)`: 대상 타워에 드롭 시 합성 또는 흔들림 피드백
  - `_drawDragGhost(x, y, type)`: 반투명(0.5) 원형 고스트
  - `_playShakeTween(tower)`: x +-4px 왕복 3회, 80ms, 상대 좌표 기반
  - `hasRecipes` 가드: `MERGE_RECIPES`가 비어있으면 머지 힌트/드래그 비활성화
  - `callbacks.onMerge` 콜백
- **`js/scenes/GameScene.js`** -- 머지 핸들링
  - `_onTowerMerge(towerA, towerB)`: towerB를 결과로 변환, towerA 제거, totalInvested 합산
  - `_registerMergeDiscovery(mergeId)`: `saveData.discoveredMerges` 배열에 추가, localStorage 저장
  - `_pendingDrag` + 10px 이동 threshold로 드래그 시작
  - `pointermove`/`pointerup` 핸들러에서 드래그 고스트 업데이트/종료
  - `MERGE_RECIPES.length > 0` 가드: Phase 1에서 드래그 자체 차단
- **`js/scenes/CollectionScene.js`** -- 범용 타워 잠금 시스템
  - `_showTowerUnlockPopup(type)`: 드래곤 하드코딩 -> 범용 팝업
  - `_unlockTower(type)`: `saveData.unlockedTowers[]` 배열 관리
  - `TOWER_STATS[type].locked` 기반 잠금 상태 판단
- **`js/i18n.js`** -- 머지 관련 문자열
  - `ui.dragToMerge`: 한국어 "드래그하여 합성" / 영어 "Drag to merge"
- **`js/config.js`** -- 세이브 마이그레이션 v1->v2
  - `dragonUnlocked` -> `unlockedTowers[]` 배열 변환
  - `towerUpgrades` 유지 (메타 업그레이드)
  - `discoveredMerges: []` 신규 추가
  - `diamond`, `stats`, `totalDiamondEarned` 보존

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| 5티어 테두리 | 무지개 tween | 정적 금색(0xffd700) | Phase 1에서 5티어 타워 미존재, 단순화 |
| towerUpgrades v1->v2 | 제거 | 유지 | 메타 업그레이드(컬렉션 모드) 데이터 보존 필요 |

### 알려진 제약

- Phase 1에서 `MERGE_RECIPES = {}` 이므로 실제 합성 불가. 드래그/머지 힌트 모두 비활성화
- sell 버튼 y=640 (하단 9px 화면 밖 경계선 배치). Phase 2에서 `isUsedAsMergeIngredient()`가 true 되면 enhance 버튼 사라지며 자연 해소
- `_pendingDrag` init() 미초기화: Phase 1에서 `_pendingDrag` 자체가 설정되지 않으므로 무위험. Phase 2에서 `init()`에 `this._pendingDrag = null` 추가 권장
- `Tower.js` `@fileoverview`에 "A/B branching" 문구 잔존 (기능 무관)

### QA 결과

- **1차 판정**: FAIL (버그 3건 -- shake tween 절대좌표 사용, 강화 UI else-if 패턴, 클릭 즉시 드래그 시작)
- **2차 판정**: FAIL (N1 sell 버튼 오버플로우 -- merge hint + enhance 동시 표시로 sellY=656 화면 밖)
- **3차(R3) 판정**: PASS (hasRecipes 가드 추가로 merge hint 숨김, sellY=640 대폭 개선, 전역 S 버튼 사용 가능)
- 정적 코드 분석 14건 + Playwright 테스트 13건 작성

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-merge-tower-system.md`
- QA 리포트 (R1): `.claude/specs/2026-02-23-merge-tower-system-phase1-qa.md`
- QA 리포트 (R2): `.claude/specs/2026-02-23-merge-tower-system-phase1-qa-r2.md`
- QA 리포트 (R3 최종): `.claude/specs/2026-02-23-merge-tower-system-phase1-qa-r3.md`
- 테스트: `tests/merge-tower-phase1-r3.spec.js`

---

## 2026-02-23 -- 업그레이드 분기 선택 UI 개선

### 배경

타워 Lv.1->Lv.2, Lv.2->Lv.3 업그레이드 시 A/B 분기 선택 버튼이 1줄(300x18px, 9px)로 표시되어 정보 파악이 어려웠다. 분기 이름, 스탯 변화, 특화 방향, 비용을 2줄 레이아웃으로 확장하여 가독성을 개선.

### 변경

- **`js/ui/TowerPanel.js`** -- 업그레이드 분기 버튼 UI 재구성
  - `showTowerInfo()` 재구성: Lv.1->2, Lv.2->3 분기 코드를 `isLv1` 플래그로 통합
  - `_createBranchButton()` 헬퍼 추가: 340x32px 2줄 버튼 생성
  - `_calcStatDiff()` 헬퍼 추가: 현재/분기 스탯 변화율(ATK/SPD/RNG %) 계산
  - `_getBranchTags()` 헬퍼 추가: 분기 스탯 기반 특화 태그 파생 (최대 2개)
  - `infoBg`를 패널 전체 영역(GAME_WIDTH x PANEL_HEIGHT, alpha 0.92)으로 확장
  - 타워 정보 텍스트 위치: PANEL_Y + 8 (패널 내부 상단)
  - A 버튼 centerY: PANEL_Y + 42, B 버튼 centerY: PANEL_Y + 78
  - 판매 버튼 Y: PANEL_Y + 106 (업그레이드 UI 표시 시)
  - 골드 부족 시: 버튼 alpha 0.35, 비용 텍스트 #ff4757(빨간색)

- **`js/i18n.js`** -- 분기 특화 태그 10종 ko/en 문자열 추가
  - `branch.tag.aoe`(범위형/AOE), `branch.tag.stun`(강감속/Stun), `branch.tag.slow`(감속형/Slow), `branch.tag.burn`(화상형/Burn), `branch.tag.poison`(독형/Poison), `branch.tag.pierce`(관통형/Pierce), `branch.tag.debuff`(약화형/Debuff), `branch.tag.push`(밀치기형/Push), `branch.tag.chain`(연쇄형/Chain), `branch.tag.single`(단일형/Single)

### 스펙 대비 변경

| 항목 | 스펙 | 구현 | 사유 |
|---|---|---|---|
| 버튼 크기 | 340x28px | 340x32px | 터치 영역 확보를 위해 높이 4px 증가 |
| 상단 행 폰트 | 11px | 10px bold | 360px 해상도에서 스탯+비용을 한 줄에 담기 위해 축소 |
| 하단 행 폰트 | 9px | 8px | 설명+태그를 한 줄에 맞추기 위해 축소 |
| 타워 정보 위치 | PANEL_Y - 30 (오버레이) | PANEL_Y + 8 (패널 내부) | depth/z-order 단순화 |

### 알려진 제약

- 스탯 변화 색상(증가=#55efc4, 감소=#fdcb6e) 미적용: Phaser Text 단일 객체에 복수 색상 적용 불가. 전체 흰색(#ffffff)으로 표시
- `updateAffordability()`가 분기 버튼의 실시간 골드 변동을 반영하지 않음. `showTowerInfo()` 호출 시점에만 계산
- 일부 분기(wind 2a, light 2a, dragon 2a)에서 damage/fireRate/range 변화 없이 특수 스탯만 변경되는 경우 stat diff가 빈 문자열로 표시됨. 태그와 설명으로 보완

### QA 결과

- **판정**: PASS
- **Playwright 브라우저 테스트**: 17/17 통과
- **정적 분석 검증 스크립트**: 2개 통과 (stat diff 계산값, Lv.2->3 분기 키 구성 검증)

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-upgrade-branch-ui.md`
- 구현 리포트: `.claude/specs/2026-02-23-upgrade-branch-ui-report.md`
- QA 리포트: `.claude/specs/2026-02-23-upgrade-branch-ui-qa.md`
- 테스트: `tests/upgrade-branch-ui.spec.js`

---

## 2026-02-23 -- 골드 싱크 시스템

### 배경

후반 라운드(R30+)에서 골드가 과도하게 축적되는 인플레이션 문제를 해소하기 위해 3가지 골드 소비처를 추가.

### 변경

- **`js/config.js`** -- 골드 싱크 상수 추가
  - 타워 강화: `MAX_ENHANCE_LEVEL=10`, `ENHANCE_BASE_COST=200`, `ENHANCE_COST_INCREMENT=100`, `ENHANCE_STAT_BONUS=0.05`
  - HP 회복: `HP_RECOVER_BASE_COST=100`, `HP_RECOVER_COST_INCREMENT=50`, `HP_RECOVER_AMOUNT=5`
  - 소모품: `CONSUMABLE_ABILITIES` 객체 (slowAll, goldRain, lightning)
  - `calcEnhanceCost(level)`, `calcHpRecoverCost(useCount)` 함수 추가

- **`js/i18n.js`** -- 강화, HP 회복, 소모품 관련 한국어/영어 문자열 추가

- **`js/entities/Tower.js`** -- 타워 강화 시스템 구현
  - `enhanceLevel`, `enhanceInvested` 속성 추가
  - `enhance()` 메서드: 레벨당 damage x1.05, range x1.025, fireRate x0.975 (최소 0.3초)
  - `getEnhanceCost()`, `canEnhance()` 메서드 추가
  - `getInfo()` 반환값에 강화 정보 추가
  - `_drawEnhanceGlow()`: 금색 글로우 링 시각 효과

- **`js/ui/TowerPanel.js`** -- 강화 UI 추가
  - Lv.3 타워 선택 시 보라색 강화 버튼 표시
  - 최대 강화 시 금색 "최대 강화" 텍스트 표시
  - 타워 이름에 `+N` 강화 레벨 표시
  - `onEnhance` 콜백 추가

- **`js/scenes/GameScene.js`** -- HP 회복 + 소모품 능력 구현
  - `_onTowerEnhance(tower)`: 타워 강화 처리
  - `_createHpRecoverButton()`: 하단 패널 +HP 버튼 생성
  - `_onHpRecover()`: HP 5 회복, 에스컬레이팅 비용
  - `_createConsumableButtons()`: 소모품 3종 버튼 (S, $, Z)
  - `_useConsumable(key)`: 쿨다운/비용 확인, 적 없을 때 즉시형 능력 사용 차단 (goldRain 제외)
  - `_executeSlowAll()`: 전체 적 슬로우
  - `_executeGoldRain()`: 지속시간 동안 킬 골드 2배
  - `_executeLightningStrike()`: 전체 적 100 피해 + 카메라 흔들림
  - `_playAbilityFlash(color)`: 화면 플래시 연출
  - `_updateConsumables(delta)`: 쿨다운/지속시간 갱신

### 구현된 기능

- **타워 강화 (Lv.3+)**: Lv.3 타워에 추가 골드를 투자하여 최대 10단계 강화. 강화당 공격력 +5%, 사거리 +2.5%, 공속 -2.5%. 금색 글로우 링 시각 효과
- **기지 HP 회복**: 골드로 HP 5 회복. 사용할 때마다 비용 증가 (100G → 150G → 200G → ...). 초록 플래시 연출
- **소모품 능력 3종**:
  - 슬로우 (S): 전체 적 슬로우. 쿨다운 15초, 초기 비용 300G
  - 황금비 ($): 10초간 킬 골드 2배. 쿨다운 30초, 초기 비용 400G
  - 번개 (Z): 전체 적 100 피해 + 카메라 쉐이크. 쿨다운 20초, 초기 비용 500G
- **적 없을 때 낭비 방지**: 즉시형 소모품(슬로우, 번개)은 살아있는 적이 없으면 사용 불가. 지속형(황금비)은 사전 활성화 허용

### QA 결과

- **1차 판정**: FAIL (버그 3건)
  - BUG-01: 소모품 버튼과 타워 매도 버튼 겹침 (Major)
  - BUG-02: i18n 키 미사용, 하드코딩 텍스트 (Minor)
  - BUG-03: 적 없을 때 소모품 골드 낭비 (Minor)
- **2차 판정**: PASS (3건 모두 수정 완료, regression 없음)

### 참고 문서

- 구현 리포트: `.claude/specs/2026-02-23-gold-sink-report.md`
- QA 리포트: `.claude/specs/2026-02-23-gold-sink-qa.md`

---

## 2026-02-23 -- 데이터 기반 상태이상 면역 시스템

### 배경

R30 보스가 Wind 타워 pushback에 의해 출발점까지 밀려나는 버그의 임시 하드코딩 수정(`if (this.type === 'boss' ...) return`)을 데이터 기반 시스템으로 교체.

### 변경

- **`js/config.js`** -- ENEMY_STATS 면역 데이터 추가
  - `boss`: `immunities: ['pushback']` 추가
  - `boss_armored`: `immunities: ['pushback']` 추가

- **`js/entities/Enemy.js`** -- 면역 시스템 구현
  - 생성자: `this.immunities = new Set(baseStats.immunities || [])` 추가
  - `isImmune(effectType)` 게이트 메서드 신규 추가
  - 5개 디버프 메서드(`applySlow`, `applyBurn`, `applyPoison`, `applyArmorReduction`, `pushBack`)에 면역 체크 추가
  - `pushBack()`의 하드코딩 보스 타입 체크 삭제

### 구현된 기능

- **데이터 기반 면역**: `ENEMY_STATS`의 `immunities` 배열로 적 타입별 상태이상 면역 선언
- **확장성**: 새 면역 추가 시 config만 수정 (예: `fire_elemental: { immunities: ['burn'] }`)
- **하드코딩 제거**: `pushBack()`의 `this.type === 'boss'` 체크를 `this.isImmune('pushback')`로 대체

### QA 결과

- **판정**: PASS (CRITICAL 0건)
- **Playwright 브라우저 테스트**: 17/17 통과
- **검증 범위**: config 필드, isImmune() 동작, pushback 면역, 비면역 디버프 정상 작동, 하드코딩 제거, 런타임 무결성

### 참고 문서

- 스펙: `.claude/specs/2026-02-23-immunity-system.md`
- 구현 리포트: `.claude/specs/2026-02-23-immunity-system-report.md`
- QA 리포트: `.claude/specs/2026-02-23-immunity-system-qa.md`
- 테스트: `tests/immunity-system.spec.js`

---

## 2026-02-22 -- Phase 6 패키징 + 밸런스 + 퍼포먼스 + 통계

### 변경

- **`package.json`** -- 신규 파일 (Vite + Phaser + Capacitor 의존성)
- **`vite.config.js`** -- 신규 파일 (Vite 빌드 설정)
- **`capacitor.config.json`** -- 신규 파일 (Capacitor 앱 설정)
- **`js/scenes/StatsScene.js`** -- 신규 파일 (통계 표시 씬)
- **`js/managers/ProjectilePool.js`** -- 신규 파일 (오브젝트 풀)
- **`index.html`** -- Vite용 간소화 (CDN 제거, npm 전환)
- **`style.css`** -- Capacitor safe-area 패딩
- **`js/main.js`** -- npm Phaser import + StatsScene 등록
- **`js/config.js`** -- 밸런스 조정 + 통계 필드
- **`js/entities/Projectile.js`** -- 풀 지원 메서드 (reset/deactivate)
- **`js/managers/WaveManager.js`** -- 저항 캡 + 프리뷰
- **`js/scenes/GameScene.js`** -- 풀 + 델타캡 + 통계 추적
- **`js/ui/TowerPanel.js`** -- 3단 속도 사이클
- **`js/ui/HUD.js`** -- 웨이브 카운트다운 + 프리뷰
- **`js/scenes/MenuScene.js`** -- STATISTICS 버튼
- **`js/scenes/GameOverScene.js`** -- 통계 저장 + 히스토리
- **`js/scenes/BootScene.js`** -- migrateSaveData 통계 필드

### 구현된 기능

- **Vite 번들링**: Phaser npm 전환, CDN 제거, Vite dev 서버/빌드 파이프라인
- **Capacitor 모바일 패키징**: Android + iOS 네이티브 빌드, safe-area 패딩
- **밸런스 조정**: Swarm HP 15, Gold 스케일 0.10, R50+ 저항 캡 0.55, 보스 저항 스케일 0.03
- **퍼포먼스 최적화**: ProjectilePool (30개 사전 할당), delta 캡 100ms
- **3단 게임 속도**: 1x / 2x / 3x 순환
- **타워 사거리 프리뷰**: 타워 호버 시 공격 범위 원형 표시
- **웨이브 카운트다운**: 대기 시간 잔여량 HUD 표시 + 다음 웨이브 적 미리보기 도트
- **통계 시스템**: killsByType/killsByTower/goldEarned/damageDealt 추적
- **영구 통계**: 세이브 데이터에 누적 통계 저장
- **게임 히스토리**: 최근 20게임 기록 저장 및 열람
- **StatsScene**: 스크롤 가능 UI로 통계/히스토리 표시

### QA 결과

- **초기 판정**: FAIL (CRITICAL 2건 -- killsByTower 누락, damageDealt 미증가)
- **수정 후 판정**: PASS (모든 데미지 경로에서 추적 완료)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase6.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase6-qa.md`

---

## 2026-02-22 -- Phase 5 보스 강화 + 사운드 + 전투 연출

### 변경

- **`js/managers/SoundManager.js`** -- 신규 파일 (Web Audio API SFX 8종 + BGM 3종)
- **`js/config.js`** -- 보스 스케일링 강화
- **`js/managers/WaveManager.js`** -- 보스 스폰 강화
- **`js/entities/Enemy.js`** -- 보스 시각 강화
- **`js/entities/Projectile.js`** -- 폭발 이펙트 강화
- **`js/scenes/GameScene.js`** -- SFX/BGM 연동 + 연출
- **`js/scenes/MenuScene.js`** -- BGM + 음소거
- **`js/scenes/BootScene.js`** -- SoundManager 초기화

### 구현된 기능

- **보스 강화**: HP 2.5배, 속도 1.2배, 라운드별 저항 증가, 골드 1.5배
- **프로시저럴 SFX 8종**: Web Audio API 런타임 합성
- **프로시저럴 BGM 3종**: 메뉴/전투/보스 상황별 자동 전환
- **보스 등장 연출**: 카메라 쉐이크 + 경고 텍스트 + 전용 SFX + BGM 전환
- **공격 이펙트 강화**: splash 파티클, chain 글로우, beam 두께 변화, aoe 링
- **볼륨 설정 UI**: Pause 내 SFX/BGM 개별 조절, HUD/메뉴 음소거 토글

### QA 결과

- **판정**: PASS (CRITICAL 0건, MEDIUM 3건, LOW 7건)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase5.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase5-qa.md`

---

## 2026-02-22 -- Phase 4 게임플레이 완성

### 변경

- **`js/config.js`** -- Lv.3 데이터 추가 (40종 최종형)
- **`js/entities/Tower.js`** -- Lv.3 업그레이드 지원
- **`js/ui/TowerPanel.js`** -- Lv.3 UI 분기
- **`js/scenes/GameScene.js`** -- 일시정지 시스템
- **`js/entities/Projectile.js`** -- 디버프 전달 보완

### 구현된 기능

- **Lv.3 업그레이드 40종**: 10타워 x 4 최종형 (3aa/3ab/3ba/3bb)
- **일시정지 시스템**: HUD Pause 버튼, PAUSED 오버레이, Resume/Main Menu
- **Gold 전용 비용**: Lv.3는 인게임 Gold만 사용

### QA 결과

- **판정**: PASS (CRITICAL 2건 수정 후)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase4.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase4-qa.md`

---

## 2026-02-22 -- Phase 3 Diamond 메타 화폐 + 컬렉션 모드

### 변경

- **`js/config.js`** -- Phase 3 데이터 추가 (Diamond, 메타 업그레이드 트리)
- **`js/scenes/CollectionScene.js`** -- 신규 파일 (~1143 라인)
- **`js/scenes/MenuScene.js`** -- 메뉴 UI 변경 (Diamond 표시, 버튼 추가)
- **`js/scenes/GameOverScene.js`** -- Diamond 획득 표시
- **`js/scenes/GameScene.js`** -- 메타 업그레이드 적용
- **`js/managers/WaveManager.js`** -- maxBaseHP 수정
- **`js/scenes/BootScene.js`** -- 세이브 마이그레이션
- **`js/ui/TowerPanel.js`** -- 드래곤 해금 동적 체크
- **`js/main.js`** -- CollectionScene 등록

### 구현된 기능

- **Diamond 메타 화폐**: 게임 오버 시 라운드 기반 획득, 영구 축적
- **컬렉션 모드**: 타워 카드 브라우징, 메타 업그레이드 구매, 유틸리티 업그레이드
- **타워 메타 업그레이드 트리**: 10종 x 3티어 x A/B (60개 옵션)
- **유틸리티 업그레이드 3종**: Base HP+, Gold Boost, Wave Bonus x
- **드래곤 타워 해금**: 50 Diamond 소모
- **세이브 데이터 마이그레이션**: Phase 2 -> Phase 3 하위 호환

### QA 결과

- **판정**: PASS (CRITICAL 1건 수정, MEDIUM 1건 수정)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase3.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase3-qa.md`

---

## 2026-02-22 -- Phase 2 콘텐츠 확장

### 변경

- **`js/config.js`** -- 전면 재작성 (타워 10종, 적 8종, R1~R20)
- **`js/entities/Tower.js`** -- 업그레이드 분기 + 신규 타워 7종
- **`js/entities/Enemy.js`** -- 디버프 시스템 + 신규 적 4종
- **`js/entities/Projectile.js`** -- 신규 공격 타입 처리
- **`js/ui/TowerPanel.js`** -- 2줄 5열 레이아웃
- **`js/managers/WaveManager.js`** -- R11~R20 웨이브 + 스케일링 확장
- **`js/scenes/GameScene.js`** -- 신규 공격 메서드 4종

### 구현된 기능

- **타워 10종** (각 Lv.1 + Lv.2 A/B 분기)
- **새 적 3종**: 소형 군집형(R15), 분열형(R18), 방어형(R20)
- **방어형 보스**: R20 전용 (HP=1500, resistance=0.3)
- **디버프 시스템**: 화상 DoT, 독 DoT(2중첩), 방어력 감소, 밀치기, 완전 정지
- **R11~R20 사전 정의 웨이브** + R21+ 스케일링에 새 적 포함
- **2줄 5열 UI 레이아웃** + A/B 분기 업그레이드 UI

### QA 결과

- **판정**: PASS (Playwright 26/26 통과, 5건 수정)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase2.md`
- 구현 리포트: `.claude/specs/2026-02-22-fantasy-td-phase2-report.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase2-qa.md`
- 테스트: `tests/fantasy-td-phase2.spec.js`

---

## 2026-02-22 -- Phase 1 핵심 게임 루프 구현

### 추가

- **fantasydefence/** 디렉토리 신규 생성 (15개 파일, ~3,400 라인)

### 구현된 기능

- **맵 시스템**: 9x12 그리드 S자 경로 맵, 5종 셀 타입, 31개 웨이포인트
- **타워 3종** (각 Lv.1~Lv.2): 궁수, 마법사, 얼음
- **적 3종 + 미니보스**: 일반형(R1), 고속형(R3), 탱커형(R5), 미니보스(R10)
- **웨이브**: R1~R10 수동 정의 + R11+ 자동 스케일링 (무한 모드)
- **Gold 시스템**: 초기 200G, 적 처치 보상, 웨이브 클리어 보너스
- **기지 HP**: 초기 20, 회복 없음, HP <= 5 빨간 깜빡임
- **타워 관리**: 그리드 스냅 배치, 업그레이드, 판매(60% 환급), 사거리 표시
- **게임 오버**: 결과 패널, localStorage 최고 기록
- **게임 속도**: x1/x2 배속 토글
- **모바일 대응**: Phaser.Scale.FIT + CENTER_BOTH, 터치 입력

### QA 결과

- **판정**: PASS (Playwright 11/11 통과)

### 참고 문서

- 스펙: `.claude/specs/2026-02-22-fantasy-td-phase1.md`
- 구현 리포트: `.claude/specs/2026-02-22-fantasy-td-phase1-report.md`
- QA 리포트: `.claude/specs/2026-02-22-fantasy-td-phase1-qa.md`
- GDD 원본: `판타지_타워디펜스_GDD_v0.1.md`
