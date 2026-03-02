# 광고 시스템 (AdMob)

Google AdMob 기반 광고 수익화 시스템. `@capacitor-community/admob` 플러그인을 사용하며, 웹 환경에서는 Mock 모드로 동작한다.

## 상태

- Phase 1: 완료 (AdManager 기반 + 전면 광고)
- Phase 2: 완료 (보상형 광고: Diamond 지급 + 부활)
- Phase 3: 미구현 (보상형 광고: Gold 2배 부스트 + 클리어 보상 2배)
- Phase 4: 미구현 (통합 QA)

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

## 보상형 광고 3: Gold 2배 부스트 -- Phase 3 (미구현)

- LevelSelectScene "2배 골드" 버튼
- 해당 판 전체 골드 획득량 2배 (`AD_GOLD_BOOST_MULTIPLIER`)
- 일일 3회 제한 (`AD_LIMIT_GOLD_BOOST`)

## 보상형 광고 4: 클리어 보상 2배 -- Phase 3 (미구현)

- LevelSelectScene / MapClearScene "보상 2배" 버튼
- 클리어 Diamond 보상 2배 (`AD_CLEAR_BOOST_MULTIPLIER`)
- 일일 3회 제한 (`AD_LIMIT_CLEAR_BOOST`)

## i18n 키 (Phase 2)

| 키 | ko | en |
|---|---|---|
| `ui.ad.revive` | 광고 보고 부활 | Revive (Ad) |
| `ui.ad.diamond` | Diamond 받기 | Get Diamond |
| `ui.ad.loading` | 광고 로딩 중... | Loading ad... |
| `ui.ad.failed` | 광고를 불러올 수 없습니다 | Ad unavailable |
| `ui.ad.limitReached` | 오늘 한도 초과 | Daily limit reached |
| `ui.ad.remaining` | ({count}/{max}) | ({count}/{max}) |

`ui.ad.remaining`은 정의되어 있으나 코드에서 미사용 (수동 문자열 조합으로 대체됨).

## 일일 제한 시스템

- **저장 위치**: localStorage 키 `ftd_ad_daily_limit` (saveData와 분리)
- **데이터 구조**: `{ date: "YYYY-MM-DD", counts: { diamond: N, goldBoost: N, clearBoost: N } }`
- **리셋 조건**: 현재 날짜가 저장된 날짜와 다르면 카운터 초기화
- **에러 내성**: localStorage 접근 불가 시 에러 무시, JSON 파싱 실패 시 기본값 반환

### 일일 제한 수치

| 광고 유형 | 제한 횟수 | config.js 상수 |
|---|---|---|
| Diamond 지급 | 5회/일 | `AD_LIMIT_DIAMOND` |
| Gold 2배 부스트 | 3회/일 | `AD_LIMIT_GOLD_BOOST` |
| 클리어 보상 2배 | 3회/일 | `AD_LIMIT_CLEAR_BOOST` |

## 광고 ID (테스트용)

| 광고 유형 | ID | config.js 상수 |
|---|---|---|
| 전면 | `ca-app-pub-3940256099942544/1033173712` | `ADMOB_INTERSTITIAL_ID` |
| 보상형 (Diamond) | `ca-app-pub-3940256099942544/5224354917` | `ADMOB_REWARDED_DIAMOND_ID` |
| 보상형 (부활) | `ca-app-pub-3940256099942544/5224354917` | `ADMOB_REWARDED_REVIVE_ID` |
| 보상형 (Gold 2배) | `ca-app-pub-3940256099942544/5224354917` | `ADMOB_REWARDED_GOLD_BOOST_ID` |
| 보상형 (클리어 2배) | `ca-app-pub-3940256099942544/5224354917` | `ADMOB_REWARDED_CLEAR_BOOST_ID` |

모든 ID는 Google 공식 테스트 ID. 실제 배포 시 `config.js` 상수만 교체.

## 제약사항

- GDPR/UMP 미구현 (추후 별도 스펙)
- iOS 미지원 (Android 전용)
- 배너 광고 없음
- 테스트 광고 ID만 사용 중 (실제 ID 미발급)
- 세이브 마이그레이션 불필요 (일일 제한은 별도 localStorage 키)
