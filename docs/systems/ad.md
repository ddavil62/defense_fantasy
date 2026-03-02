# 광고 시스템 (AdMob)

Google AdMob 기반 광고 수익화 시스템. `@capacitor-community/admob` 플러그인을 사용하며, 웹 환경에서는 Mock 모드로 동작한다.

## 상태

**AdMob 통합 완료** (2026-03-02)

- Phase 1: 완료 (AdManager 기반 + 전면 광고)
- Phase 2: 완료 (보상형 광고: Diamond 지급 + 부활)
- Phase 3: 완료 (보상형 광고: Gold 2배 부스트 + 클리어 보상 2배)
- Phase 4: 완료 (일일 제한 시스템 검증 + 통합 QA PASS, 코드 변경 없음)

## AdManager (`js/managers/AdManager.js`)

AdMob 플러그인을 래핑하는 단일 클래스. BootScene에서 인스턴스를 생성하고 Phaser registry에 `'adManager'` 키로 등록한다.

### 플랫폼 감지

- `window.Capacitor.isNativePlatform()` 호출로 네이티브 여부 판별
- 네이티브: 실제 AdMob 플러그인 사용
- 웹(브라우저/Playwright): Mock 모드 (광고 스킵, 즉시 resolve)
- 감지 실패 시: Mock 모드 유지
- 초기화 실패 시: Mock 모드로 폴백

### Mock 모드 동작

| 메서드 | Mock 동작 |
|---|---|
| `initialize()` | 콘솔 로그 출력 후 즉시 return |
| `showInterstitial()` | 콘솔 로그 출력 후 즉시 resolve |
| `showRewarded(adUnitId)` | `{ rewarded: true }` 즉시 resolve |

### 에러 처리

- 광고 로드/표시 실패 시 reject하지 않고 정상 resolve한다
- `showInterstitial()`: 실패 시 무시하고 진행 (void resolve)
- `showRewarded()`: 실패 시 `{ rewarded: false, error: message }` resolve

### 플러그인 로드

- `@capacitor-community/admob`은 `initialize()` 내에서 `await import()`로 동적 로드
- 웹 환경에서는 Mock 모드가 먼저 판정되어 플러그인 import 자체가 실행되지 않음
- Vite 빌드 시 동적 import를 별도 청크로 분리하여 초기 로드 성능에 영향 없음

## 전면 광고 (Interstitial) -- Phase 1

- **노출 시점**: GameScene `_gameOver()` 호출 시
- **미노출 시점**: MapClearScene 진입 시 (맵 클리어 경로에는 전면 광고 없음)
- **흐름**: `isGameOver=true` -> SFX/BGM 정지 -> `adManager.showInterstitial()` -> GameOverScene 전환
- **폴백**: AdManager가 registry에 없으면 기존 `delayedCall(500)` 방식 유지

## 보상형 광고 1: Diamond 지급 -- Phase 2

MenuScene에서 보상형 광고를 시청하고 Diamond를 즉시 지급받는다.

### 버튼 배치

- **위치**: MenuScene 다이아몬드 보유량 텍스트 하단 (y=302+offsetY)
- **크기**: 소형 140x26px, 퍼플 메타 스타일 (`btn_small_meta`)
- **텍스트**: `Diamond 받기 (N/5)` (잔여 횟수 표시)
- **소진 시**: 회색 비활성 버튼 (`btn_small_disabled`), "오늘 한도 초과" 텍스트

### 동작

1. 버튼 클릭 시 `isProcessing` 플래그로 중복 탭 방지
2. `adManager.showRewarded(ADMOB_REWARDED_DIAMOND_ID)` 호출
3. `rewarded: true` 시:
   - `saveData.diamond += AD_REWARD_DIAMOND` (3개 지급)
   - localStorage에 즉시 저장
   - 다이아몬드 보유량 텍스트 갱신
   - `incrementDailyAdCount('diamond')` 호출
   - 잔여 횟수 갱신 (소진 시 버튼 비활성화)
4. `rewarded: false` 시: "광고를 불러올 수 없습니다" 에러 텍스트 표시, 버튼 재활성화

### 수치

| 항목 | 값 | config.js 상수 |
|---|---|---|
| 1회당 지급량 | Diamond 3개 | `AD_REWARD_DIAMOND` |
| 일일 제한 | 5회 | `AD_LIMIT_DIAMOND` |

### 예외 처리

- AdManager가 registry에 null이면 remaining=0, isLimitReached=true로 처리 (비활성 버튼)
- saveData가 null이면 `if (saveData)` 가드로 지급 건너뜀
- localStorage 저장 실패 시 무시 (try-catch)

## 보상형 광고 2: 부활 -- Phase 2

GameOverScene에서 보상형 광고를 시청하고 현재 라운드에서 게임을 재개한다.

### 버튼 배치

- **위치**: GameOverScene RETRY 버튼 위 (centerY+58)
- **크기**: 중형 160x36px, 퍼플 메타 스타일 (`btn_medium_meta`)
- **텍스트**: "광고 보고 부활" (i18n: `ui.ad.revive`)
- **표시 조건**: `this.revived !== true` (이미 부활한 판이면 버튼 미표시)
- **판당 1회 제한**: 일일 제한 없음, `revived` 플래그로 판 단위 제어

### 레이아웃 조정

- 부활 버튼 표시 시 결과 패널 높이를 56px 확장 (`reviveExtra`)
- RETRY 및 하위 버튼들을 28px 아래로 밀어냄 (`reviveOffset`)
- 부활 불가 시(revived=true) 기존 레이아웃과 동일

### 동작

1. 버튼 클릭 시 `isProcessing` 플래그로 중복 탭 방지
2. `adManager.showRewarded(ADMOB_REWARDED_REVIVE_ID)` 호출
3. `rewarded: true` 시: `_doRevive()` 실행
4. `rewarded: false` 시: "광고를 불러올 수 없습니다" 에러 텍스트 표시, 버튼 재활성화

### 부활 처리 (`_doRevive`)

1. fadeOut(200ms) 후 GameScene으로 전환
2. 전달 데이터: `{ mapData, gameMode, revived: true, startWave: this.round }`
3. GameScene `init()`:
   - `this.revived = data.revived || false`
   - `this._reviveStartWave = data.startWave || 0`
4. GameScene `create()`:
   - 기지 HP 설정: `Math.ceil(this.maxBaseHP * AD_REVIVE_HP_RATIO)` (최대 HP의 50%)
   - 웨이브 재개: `waveManager.currentWave = this._reviveStartWave` 후 `waveManager._announceWave()` 호출
5. `_gameOver()` 시 `revived: this.revived`를 GameOverScene에 전달하여 재 게임오버 시 부활 버튼 숨김

### 수치

| 항목 | 값 | config.js 상수 |
|---|---|---|
| 부활 HP | maxBaseHP * 0.5 (올림) | `AD_REVIVE_HP_RATIO` |
| 판당 제한 | 1회 | `revived` 플래그 |

### 제약사항

- 부활 시 GameScene을 `scene.start()`로 새로 시작하므로 타워 배치, 골드, 적 위치 등은 초기화된다
- 해당 웨이브부터 시작하지만 기존 타워와 골드는 리셋된다 (스펙에 명시된 설계)
- 엔드리스/캠페인 모드 무관하게 동일하게 동작

## 보상형 광고 3: Gold 2배 부스트 -- Phase 3

LevelSelectScene에서 보상형 광고를 시청하고 해당 판 전체 골드 획득량을 2배로 만든다.

### 버튼 배치 (LevelSelectScene)

- **위치**: 각 해금 맵 카드 좌측 하단 (cardLeft+38, adBtnY)
- **크기**: 소형 70x18px, 퍼플 메타 스타일 (BTN_META)
- **텍스트**: "2배 골드" (i18n: `ui.ad.goldBoost`)
- **활성화 시**: 녹색(0x00b894) 배경 + 금색 테두리 + "2배 골드 ON" (`ui.ad.goldBoostActive`), disableInteractive
- **한도 소진 시**: 회색(BTN_SELL) 배경 + 회색 텍스트, non-interactive

### 동작

1. 버튼 클릭 시 `isProcessing` 플래그로 중복 탭 방지
2. `adManager.showRewarded(ADMOB_REWARDED_GOLD_BOOST_ID)` 호출
3. `rewarded: true` 시:
   - `incrementDailyAdCount('goldBoost')` 호출
   - `_goldBoostActiveFor = mapId`로 활성 맵 설정
   - 버튼 하이라이트로 전환
4. `rewarded: false` 시: 텍스트 복원, isProcessing 해제
5. START 버튼 클릭 시 `goldBoostActive: this._goldBoostActiveFor === mapId`로 GameScene에 전달

### 골드 부스트 적용 범위

GameScene에서 `goldBoostActive` 플래그가 true이면:
- **적 처치 골드**: `enemy.gold * goldRainMultiplier * adGoldMultiplier` (Gold Rain과 곱셈 결합, 최대 4배)
- **웨이브 클리어 보너스**: `bonusGold * metaMultiplier * adGoldMultiplier`
- **타워 판매 환불**: 미적용 (투자금 회수이므로 게임플레이 보상이 아님)
- **유효 범위**: 해당 판에서만 유효. 게임 종료(GameOver/MapClear) 시 자동 소멸

### 수치

| 항목 | 값 | config.js 상수 |
|---|---|---|
| 골드 배율 | 2배 | `AD_GOLD_BOOST_MULTIPLIER` |
| 일일 제한 | 3회 | `AD_LIMIT_GOLD_BOOST` |

## 보상형 광고 4: 클리어 보상 2배 -- Phase 3

LevelSelectScene(사전) 또는 MapClearScene(사후)에서 보상형 광고를 시청하고 클리어 Diamond 보상을 2배로 만든다.

### 버튼 배치 (LevelSelectScene -- 사전)

- **위치**: 각 해금 맵 카드 좌측 하단 (cardLeft+114, adBtnY), Gold 2배 버튼 우측
- **크기**: 소형 70x18px, 퍼플 메타 스타일 (BTN_META)
- **텍스트**: "보상 2배" (i18n: `ui.ad.clearBoost`)
- **활성화 시**: 녹색(0x00b894) 배경 + 금색 테두리 + "보상 2배 ON" (`ui.ad.clearBoostActive`), disableInteractive
- **한도 소진 시**: 회색(BTN_SELL) 배경 + 회색 텍스트, non-interactive

### 버튼 배치 (MapClearScene -- 사후)

- **위치**: 별점 등급 텍스트 아래 (centerY+58), NEXT MAP 버튼 위
- **크기**: 소형 120x22px, 퍼플 메타 스타일 (BTN_META)
- **텍스트**: "보상 2배" (i18n: `ui.ad.clearBoost`)
- **표시 조건**: `clearBoostActive === false` + `baseDiamond > 0` + `adLimitReached === false`

### 동작 (LevelSelectScene 사전)

1. 버튼 클릭 -> `showRewarded(ADMOB_REWARDED_CLEAR_BOOST_ID)`
2. `rewarded: true` 시: `_clearBoostActiveFor = mapId`, 하이라이트 전환
3. START 시 `clearBoostActive: this._clearBoostActiveFor === mapId`로 GameScene에 전달
4. GameScene -> MapClearScene 전환 시 `clearBoostActive` 플래그 전달

### 동작 (MapClearScene 사후)

1. 버튼 클릭 -> `showRewarded(ADMOB_REWARDED_CLEAR_BOOST_ID)`
2. `rewarded: true` 시:
   - `incrementDailyAdCount('clearBoost')` 호출
   - `clearBoostActive = true`
   - 보상 재계산: `_earnedDiamond = _baseDiamond * AD_CLEAR_BOOST_MULTIPLIER`
   - 다이아몬드 텍스트 갱신 ("+N Diamond (x2)")
   - 재계산된 보상으로 `_applyDiamondAndSave()` 호출
   - 버튼 숨김

### 세이브 지연 패턴

- 기존: create() 내에서 보상 계산 후 즉시 세이브 저장
- 변경: 사후 광고 시청 가능성이 있으면 세이브 저장을 지연
  - 이미 clearBoostActive이거나 보상이 0이거나 광고 한도 초과이면 즉시 저장
  - 그 외에는 광고 시청 후 또는 씬 전환 시 `_ensureSaved()`로 안전 저장
- `_saved` 플래그로 이중 저장 방지

### 카운터 공유

LevelSelectScene과 MapClearScene 모두 동일한 `'clearBoost'` 키를 사용하여 AdManager의 일일 카운터를 공유한다.

### 수치

| 항목 | 값 | config.js 상수 |
|---|---|---|
| 보상 배율 | 2배 | `AD_CLEAR_BOOST_MULTIPLIER` |
| 일일 제한 | 3회 | `AD_LIMIT_CLEAR_BOOST` |

## i18n 키

| 키 | ko | en | Phase |
|---|---|---|---|
| `ui.ad.revive` | 광고 보고 부활 | Revive (Ad) | 2 |
| `ui.ad.diamond` | Diamond 받기 | Get Diamond | 2 |
| `ui.ad.goldBoost` | 2배 골드 | 2x Gold | 3 |
| `ui.ad.clearBoost` | 보상 2배 | 2x Reward | 3 |
| `ui.ad.goldBoostActive` | 2배 골드 ON | 2x Gold ON | 3 |
| `ui.ad.clearBoostActive` | 보상 2배 ON | 2x Reward ON | 3 |
| `ui.ad.loading` | 광고 로딩 중... | Loading ad... | 2 |
| `ui.ad.failed` | 광고를 불러올 수 없습니다 | Ad unavailable | 2 |
| `ui.ad.limitReached` | 오늘 한도 초과 | Daily limit reached | 2 |
| `ui.ad.remaining` | ({count}/{max}) | ({count}/{max}) | 2 |

`ui.ad.remaining`은 정의되어 있으나 코드에서 미사용 (수동 문자열 조합으로 대체됨).

## 일일 제한 시스템 (Phase 4 검증 완료)

- **저장 위치**: localStorage 키 `ftd_ad_daily_limit` (saveData와 분리, 세이브 마이그레이션 불필요)
- **데이터 구조**: `{ date: "YYYY-MM-DD", counts: { diamond: N, goldBoost: N, clearBoost: N } }`
- **리셋 조건**: `_ensureTodayData()`에서 현재 날짜와 저장된 날짜를 비교, 다르면 `{ date: today, counts: {} }`로 초기화 + 즉시 저장
- **에러 내성**: `_loadDailyLimits()` try/catch로 JSON 파싱 실패 시 기본값 반환, `_saveDailyLimits()` try/catch로 저장 실패(용량 초과 등) 시 무시
- **미등록 adType 안전성**: `AD_LIMITS[adType]`가 undefined이면 `isAdLimitReached()` = false, `getRemainingAdCount()` = 0 반환
- **음수 방지**: `getRemainingAdCount()`에서 `Math.max(0, limit - count)`로 음수 방지

### AD_LIMITS 매핑

```javascript
const AD_LIMITS = {
  diamond: AD_LIMIT_DIAMOND,     // 5 (config.js 상수 참조)
  goldBoost: AD_LIMIT_GOLD_BOOST, // 3
  clearBoost: AD_LIMIT_CLEAR_BOOST, // 3
};
```

### 일일 제한 수치

| 광고 유형 | adType 키 | 제한 횟수 | config.js 상수 |
|---|---|---|---|
| Diamond 지급 | `'diamond'` | 5회/일 | `AD_LIMIT_DIAMOND` |
| Gold 2배 부스트 | `'goldBoost'` | 3회/일 | `AD_LIMIT_GOLD_BOOST` |
| 클리어 보상 2배 | `'clearBoost'` | 3회/일 | `AD_LIMIT_CLEAR_BOOST` |
| 부활 | - | 판당 1회 | `revived` 플래그 (일일 제한 아님) |

### 카운터 증가 규칙

- 모든 씬에서 `result.rewarded === true` 일 때만 `incrementDailyAdCount()` 호출
- 광고 실패(`rewarded: false`) 시에는 카운터 미증가
- `incrementDailyAdCount()` 호출 시 `_saveDailyLimits()`로 즉시 영속화

### 각 씬별 사용 현황

| 씬 | adType | 제한 체크 | 잔여 횟수 표시 |
|---|---|---|---|
| MenuScene | `'diamond'` | 버튼 생성 시 + 클릭 시 재확인 | `(N/5)` 형식 |
| LevelSelectScene | `'goldBoost'` | 버튼 생성 시 + 클릭 시 재확인 | 미표시 (버튼 크기 제약) |
| LevelSelectScene | `'clearBoost'` | 버튼 생성 시 + 클릭 시 재확인 | 미표시 (버튼 크기 제약) |
| MapClearScene | `'clearBoost'` | 버튼 표시 조건 + 클릭 시 재확인 | 미표시 |
| GameOverScene | - | `revived` 플래그 (AdManager 일일 제한 미사용) | - |

## 광고 ID

| 광고 유형 | ID | config.js 상수 |
|---|---|---|
| 전면 | `ca-app-pub-9149509805250873/9251091751` | `ADMOB_INTERSTITIAL_ID` |
| 보상형 (Diamond) | `ca-app-pub-9149509805250873/2494111716` | `ADMOB_REWARDED_DIAMOND_ID` |
| 보상형 (부활) | `ca-app-pub-9149509805250873/8867948374` | `ADMOB_REWARDED_REVIVE_ID` |
| 보상형 (Gold 2배) | `ca-app-pub-9149509805250873/9354674749` | `ADMOB_REWARDED_GOLD_BOOST_ID` |
| 보상형 (클리어 2배) | `ca-app-pub-9149509805250873/4751086889` | `ADMOB_REWARDED_CLEAR_BOOST_ID` |

AdMob 앱 ID: `ca-app-pub-9149509805250873~3962271904` (AndroidManifest.xml에 설정)

## 제약사항

- GDPR/UMP 미구현 (추후 별도 스펙)
- iOS 미지원 (Android 전용)
- 배너 광고 없음
- 테스트 광고 ID만 사용 중 (실제 ID 미발급)
- 세이브 마이그레이션 불필요 (일일 제한은 별도 localStorage 키)
