# UI 시스템

HUD, TowerPanel, 일시정지, 게임속도, 통계, 골드 싱크 UI, 모바일 대응, 빌드/패키징.

## HUD (상단)

- Wave 번호, Gold 잔액, 기지 HP 표시
- HP <= 5 시 빨간 깜빡임
- 웨이브 카운트다운: 대기 시간 잔여량 표시
- 다음 웨이브 적 미리보기 도트 표시
- 음소거 토글 버튼
- Pause 버튼 (||) -- 우측 상단 (x=310, y=20)

## TowerPanel (하단)

- 2줄 5열 40px 타워 버튼 배치 (총 10개)
  - 상단 행: 궁수, 마법사, 얼음, 번개, 불꽃
  - 하단 행: 바위, 독안개, 바람, 빛, 드래곤(잠금)
- 판매(S)/속도(x1) 버튼: 상단 행 우측
- 타워 미선택 시: 타워 그리드만 표시
- Lv.1 타워 선택 시: A/B Lv.2 업그레이드 2줄 분기 버튼
- Lv.2 타워 선택 시: A/B Lv.3 업그레이드 2줄 분기 버튼
- Lv.3 타워 선택 시 (강화 가능): 보라색(0x8854d0) 강화 버튼 표시
- Lv.3 타워 선택 시 (최대 강화): 금색 "최대 강화" 텍스트
- Lv.3 타워 선택 시 (강화 불가/기본): "MAX LEVEL" + 판매 버튼
- 타워 이름에 강화 레벨 `+N` 표시 (예: "궁수 Lv.3AA +5")
- 드래곤 잠금: 자물쇠 아이콘, "????G", alpha=0.4, 클릭 불가
- 배치된 타워 선택 시 합성 가능 조합 목록 표시 (isMergeable && enhanceLevel === 0)
- 드래그 시 합성 가능 타워 하이라이트 + 호버 미리보기 말풍선
- 상세: 아래 "머지 프리뷰 UI" 섹션 참조

## 머지 프리뷰 UI

타워 선택 시 조합 목록 표시(기능 A)와 드래그 시 하이라이트 + 호버 미리보기(기능 B)를 제공한다.

### 기능 A: 조합 목록 (infoContainer 내부)

배치된 타워를 선택하면 하단 info 패널에 합성 가능한 레시피 목록을 표시한다.

#### 표시 조건

- `MERGE_RECIPES`가 비어있지 않고, 타워가 `isMergeable`이며 `enhanceLevel === 0`일 때만 표시
- 매칭 레시피가 0건이면 섹션 자체를 표시하지 않음

#### 레이아웃

| 요소 | 위치 | 크기 | 색상 |
|---|---|---|---|
| 섹션 헤더 ("합성 가능") | nextY, x=10 | 9px | #b2bec3 |
| 조합 항목 (최대 5줄) | 헤더+13px부터 12px 간격 | 9px | 결과 타워 color |
| "외 N개" | 마지막 항목+12px | 9px | #636e72 |

- 항목 형식: `+[파트너 타워 이름] -> [결과 타워 이름](T[티어])`
- i18n 키: `ui.mergeList.header` (ko: "합성 가능", en: "Can merge"), `ui.mergeList.more` (ko: "외 {n}개", en: "+{n} more")

#### MAX_SHOW 동적 계산

```
available = (PANEL_Y + PANEL_HEIGHT) - startY - 30
maxShow = Math.max(3, Math.min(5, Math.floor(available / 12)))
```

패널 잔여 공간에 따라 3~5개 범위에서 자동 조절된다.

#### 항목 탭 플래시

조합 목록의 항목을 탭하면 맵 위 해당 파트너 타입 타워에 노란 원 깜빡임 애니메이션을 적용한다.

| 속성 | 값 |
|---|---|
| 원 색상 | 0xffd700 (금색) |
| 반지름 | 20px |
| depth | 40 |
| 애니메이션 | alpha 1->0, 300ms, yoyo, repeat 2 (총 ~1.8초) |

- `getTowers` 콜백이 없으면 스킵
- 애니메이션 완료 후 Graphics 자동 파괴

### 기능 B: 드래그 하이라이트 + 호버 미리보기

#### 드래그 시 하이라이트

드래그 시작 시(`startDrag`) 합성 가능한 모든 타워에 펄스 하이라이트를 적용한다.

| 속성 | 값 |
|---|---|
| 원 스타일 | strokeCircle, lineWidth 3, 0xffd700 |
| 반지름 | 22px |
| depth | 40 |
| 펄스 | alpha 1.0 <-> 0.5, 600ms, yoyo, repeat -1 (무한) |

- `isMergeable(target)` && `getMergeResult(selfId, targetId)` 조건 충족 타워만
- 드래그 타워 자신은 제외
- `_clearMergeHighlights()` 선행 호출로 이전 하이라이트 정리

#### 호버 미리보기 말풍선

드래그 중 포인터가 하이라이트된 타워 셀 위에 올라오면 결과 미리보기 말풍선을 표시한다.

| 요소 | 크기/위치 | 스타일 |
|---|---|---|
| 배경 | 90x32px | fill 0x0a0e1a (alpha 0.9), 결과 color 테두리 (lineWidth 2) |
| 결과 이름 | center y=-5 | 결과 color, 10px bold |
| 티어 | center y=8 | #aaaaaa, 9px |

- Container depth 41
- Y 클리핑: `Math.max(HUD_HEIGHT + 20, tower.y - 34)` -- 맵 상단 침범 방지
- 동일 타워 중복 호출 방지: `_hoveredMergeTarget === tower` 체크
- 포인터가 셀을 벗어나면 즉시 제거

#### 드래그 종료 정리

`endDrag` 호출 시(합성 성공/실패 무관):
- `_clearMergeHighlights()`: 모든 하이라이트 tween 정지 + Graphics 파괴
- `_hideMergePreviewBubble()`: 말풍선 파괴 + 상태 초기화

#### 상태 변수

| 변수 | 타입 | 용도 |
|---|---|---|
| `_mergeHighlights` | `{ tower, graphics, tween, result }[]` | 활성 하이라이트 목록 |
| `_mergePreviewBubble` | `Container\|null` | 현재 표시 중인 말풍선 |
| `_hoveredMergeTarget` | `object\|null` | 현재 호버 중인 타워 (중복 방지) |

### 예외 케이스

| 케이스 | 처리 |
|---|---|
| 강화된 타워(enhanceLevel > 0) 선택 | 조합 목록 미표시 |
| 강화된 타워 드래그 시도 | startDrag early return (기존), 하이라이트 없음 |
| 맵에 합성 가능한 타워 없음 | 하이라이트 없음, 목록 없음 |
| T5 타워 선택 | 레시피 없으므로 목록 미표시 |
| 동종 합성(예: archer+archer) | partnerType = selfId로 정상 표시 |
| 레시피 5개 초과 | MAX_SHOW개만 표시 + "외 N개" |
| getTowers 콜백 미설정 | flash/highlight 스킵, 에러 없이 무시 |
| 말풍선 Y가 HUD 위로 나감 | `Math.max(HUD_HEIGHT + 20, tower.y - 34)` 클리핑 |

## 업그레이드 분기 버튼 (A/B)

Lv.1->Lv.2, Lv.2->Lv.3 업그레이드 시 A/B 분기를 2줄 레이아웃 버튼으로 표시.

### 버튼 구조

```
┌──────────────────────────────────────────────────────────┐
│ A: 폭발 화살  ATK+60% SPD+13%                      60G  │  <- 상단 행 (10px bold)
│    소형 범위 피해 추가 • 범위형                           │  <- 하단 행 (8px #a0a0b0)
└──────────────────────────────────────────────────────────┘
```

### 레이아웃 수치

- 버튼 크기: 340x32px
- infoBg: 패널 전체 영역 (GAME_WIDTH x PANEL_HEIGHT), alpha 0.92
- 타워 정보 텍스트: Y = PANEL_Y + 8 (패널 내부 상단, 10px)
- A 버튼 centerY: PANEL_Y + 42 (= 562)
- B 버튼 centerY: PANEL_Y + 78 (= 598)
- 판매 버튼 Y: PANEL_Y + 106 (= 626)
- A 분기 색상: COLORS.BUTTON_ACTIVE (파랑), B 분기 색상: 0x2d8a4e (초록)

### 상단 행

- `{분기라벨}: {분기이름}  {스탯변화}` (좌측 정렬, 10px bold 흰색)
- `{비용}G` (우측 정렬, 10px bold)

### 하단 행

- `{branchDesc} bullet {특화태그}` (좌측 정렬, 8px #a0a0b0)

### 스탯 변화율 (`_calcStatDiff`)

| 스탯 | 계산식 | 표시 조건 |
|---|---|---|
| ATK | `(branch.damage / current.damage - 1) * 100` | 변화 != 0% |
| SPD | `(1 - branch.fireRate / current.fireRate) * 100` | 변화 != 0% |
| RNG | `(branch.range / current.range - 1) * 100` | 변화 != 0% |

- fireRate 감소 = 공속 증가이므로 부호 반전 표시

### 특화 태그 (`_getBranchTags`)

| 조건 | 태그 (ko/en) |
|---|---|
| `attackType === 'splash'/'aoe_instant'` 또는 `splashRadius` | 범위형/AOE |
| `slowAmount >= 0.5` | 강감속/Stun |
| `slowAmount > 0 && < 0.5` | 감속형/Slow |
| `burnDamage` 존재 | 화상형/Burn |
| `poisonDamage` 존재 | 독형/Poison |
| `armorPiercing === true` | 관통형/Pierce |
| `armorReduction` 존재 | 약화형/Debuff |
| `pushbackDistance` 존재 | 밀치기형/Push |
| `chainCount` 존재 | 연쇄형/Chain |
| 해당 없음 | 단일형/Single |

- 최대 2개 태그, 공백으로 구분

### 골드 부족 표시

- 버튼 alpha: 0.35 (어둡게)
- 비용 텍스트 색상: #ff4757 (빨간색)
- `showTowerInfo()` 호출 시점에 계산 (실시간 갱신 미지원)

### Lv.1/Lv.2 통합

`isLv1` 플래그로 분기. Lv.1->2는 `2a`/`2b` 키, Lv.2->3는 `3{branch}a`/`3{branch}b` 키 사용.

## 컬렉션 모드 (CollectionScene)

이중 탭 구조로 메타업그레이드와 합성도감을 제공한다.

### 전체 레이아웃

```
┌─────────────────────────────────┐  y=0
│ < BACK     COLLECTION    ◆ 0   │  y=0~48 (TopBar)
├─────────────────────────────────┤  y=48
│  [메타업그레이드]   [합성도감]    │  y=48~84 (탭 버튼 바)
├─────────────────────────────────┤  y=84
│        탭 콘텐츠 영역            │  y=84~640
└─────────────────────────────────┘
```

### 탭 바 (y=48, h=36)

- 2개 버튼: "메타업그레이드" (W=165), "합성도감" (W=165)
- 선택 탭: 배경 COLORS.UI_PANEL, 하단 강조선 2px (COLORS.DIAMOND)
- 비선택 탭: 배경 COLORS.BACKGROUND, 텍스트 #636e72
- 기본 선택: 메타업그레이드
- i18n 키: `collection.tab.meta`, `collection.tab.codex`

### 탭 1: 메타업그레이드

기존 컬렉션 모드 기능 유지 (타워 카드 4-4-2 레이아웃, 유틸리티 업그레이드).
META_GRID_Y=96 (탭 바 아래).

### 탭 2: 합성도감

T1~T5 전 타워 카탈로그. saveData.discoveredMerges 기반 발견/미발견 표시.

#### 서브탭 (y=88, h=28)

- [ T1 ] [ T2 ] [ T3 ] [ T4 ] [ T5 ] -- 각 64px, 간격 4px
- 선택 시: COLORS.UI_PANEL 배경, COLORS.DIAMOND 테두리, bold
- 비선택 시: COLORS.BACKGROUND 배경, 0x636e72 테두리

#### 진행률 (y=122, h=16)

- "T{n}: {count} / {total} 발견" 중앙 정렬, 12px, #b2bec3
- i18n 키: `collection.codex.progress`

#### 카드 그리드 (y=142~640)

- 카드: 62x74px, 5열, 간격 6px
- 자동 중앙정렬: CODEX_GRID_X = (360 - (5*62 + 4*6)) / 2 = 16
- Geometry Mask로 CODEX_GRID_Y~GAME_HEIGHT 클리핑

| 상태 | 표시 내용 |
|---|---|
| 발견 | 타워 색상 원 + 이름(6자 초과 truncate) + attackType 뱃지 + 티어 뱃지, 티어별 테두리 색상 |
| 미발견 | 검은 배경(0x0d1117) + "???" + 티어 뱃지, 회색 테두리 |

- 티어 테두리 색상: T1/T2=은색(0xb2bec3), T3/T5=금색(0xffd700), T4=보라(0xa29bfe)
- attackType 뱃지: Single, Splash, AoE, Chain, Beam, DoT

#### 카드 클릭 오버레이

| 티어 | 발견 | 미발견 |
|---|---|---|
| T1 | 타워 기본 정보 (이름, 색상원, attackType, DMG/SPD/RNG) | -- (항상 발견) |
| T2~T3 | 레시피 공개 ("재료A + 재료B -> 결과") + attackType + Tier | 재료 힌트 ("재료A + 재료B -> ???") |
| T4~T5 | "레시피 비공개" + attackType + Tier | 반응 없음 |

- i18n 키: `collection.codex.unknown`, `collection.codex.recipeHidden`
- 재료명 표시: `_getDisplayNameById()`로 i18n 기반 조회 (한국어/영어 통일)

#### 드래그 스크롤

- `this.input.on('pointerdown/move/up')` 전역 이벤트 기반
- 5px threshold: 이동량 5px 미만은 클릭, 이상은 드래그
- `activeTab !== 'codex'` 가드로 메타탭에서 간섭 없음
- `pointer.y < CODEX_GRID_Y` 가드로 서브탭 영역 드래그 차단
- `_cleanupCodexDrag()`에서 3개 리스너 해제

### 데이터 소스

- T1: `TOWER_STATS` 10종 (항상 발견)
- T2~T5: `MERGE_RECIPES` 102종, `MERGED_TOWER_STATS`에서 attackType 참조
- 발견 여부: `saveData.discoveredMerges` Set 기반 판정
- `_buildTierData()`: 씬 생성 시 1회 캐시 빌드, 티어별 알파벳순 정렬

## 타워 설명 팝업

- **진입**: 하단 패널 타워 버튼을 400ms 이상 롱프레스
- **위치**: 패널 바로 위, 캔버스 중앙 (320×110px)
- **내용**:
  - 타워명 (타워 고유 색상, bold)
  - 플레이버 텍스트 (회색, 11px)
  - Lv.1 스탯: 공격력 / 사거리 / 공속 / 특수
  - 비용 (드래곤 잠금 시 🔒 50💎 표시)
- **배경**: 반투명 다크 (0x0a0e1a, alpha 0.92) + 타워 색상 테두리
- **닫기**: 화면 아무 곳 탭
- **짧은 탭(400ms 미만)**: 기존 동작(타워 선택) 유지
- **잠금 타워**: 롱프레스 시 설명 표시 가능 (짧은 탭은 무시)
- **i18n**: 타워명·플레이버·스탯 라벨은 `js/i18n.js`에서 로케일별 문자열 참조

## 일시정지 시스템 (Phase 4)

- HUD 우측 상단 Pause 버튼 (||)
- Pause 시 게임 루프 완전 중단 + 반투명 오버레이
- 오버레이 내용:
  - "PAUSED" 텍스트
  - Resume 버튼 (이전 게임 속도 복원 후 재개)
  - Main Menu 버튼 (MenuScene으로 즉시 이동)
  - SFX/BGM 볼륨 조절 슬라이더

## 게임 속도 제어

- 3단 순환: x1(기본) → x2(2배속) → x3(3배속)
- 모든 요소(이동, 쿨다운, 스폰) 동기화
- `SPEED_TURBO = 3`

## 게임 오버 화면

- 기지 HP 0 시 게임 일시정지 + 결과 패널
- 도달 라운드, 처치 수, 최고 기록(localStorage) 표시
- Diamond 획득량/총량 표시
- 게임 요약 (킬 수, 골드 획득, 데미지 딜량)
- RETRY 버튼 (GameScene 재시작)
- MENU 버튼 (MenuScene 이동)

## 통계 시스템 (Phase 6)

- 메뉴의 STATISTICS 버튼으로 StatsScene 진입
- 스크롤 가능 UI
- 표시 항목: killsByType, killsByTower, goldEarned, damageDealt
- 게임 히스토리: 최근 20게임 기록 열람
- 영구 누적 통계 (세이브 데이터에 저장)

## 골드 싱크 UI (하단 패널)

### HP 회복 버튼

- **위치**: 하단 패널 우측 (x=322, y=588)
- **크기**: 32x32px
- **라벨**: "+HP"
- **비용 표시**: 버튼 아래 현재 비용 표시
- **HP 최대 시**: 비용 텍스트가 "HP 최대"로 변경 (i18n: `ui.hpRecoverFull`)
- **연출**: HP 회복 시 초록 플래시

### 소모품 능력 버튼 (3종)

- **위치**: 하단 패널, HP 회복 버튼 좌측에 나란히 배치 (y=588)
- **크기**: 각 24x24px, 간격 26px
- **버튼 구성**:
  - S (Slow): x=244 -- 전체 적 슬로우
  - $ (Gold Rain): x=270 -- 킬 골드 2배 (10초)
  - Z (Lightning): x=296 -- 전체 적 100 피해

| 버튼 | 라벨 | 색상 | 쿨다운 | 초기 비용 |
|---|---|---|---|---|
| 슬로우 | S | - | 30초 | 300G |
| 황금비 | $ | - | 45초 | 400G |
| 번개 | Z | - | 60초 | 500G |

- **쿨다운 표시**: 쿨다운 중 버튼에 잔여 시간 표시
- **적 없을 때**: 즉시형(S, Z)은 사용 불가, 지속형($)은 사전 활성화 가능
- **연출**: 능력 사용 시 화면 플래시 (`_playAbilityFlash`)

### 레이아웃 참고

```
하단 패널 (y=520~640)
┌─────────────────────────────────────┐
│ [타워 버튼 2줄 5열]  [Sell][Speed]  │ y=548
│ [타워 row2]     [S][$][Z] [+HP]    │ y=588
│ (타워 정보 영역)                     │ y=616~
└─────────────────────────────────────┘
```

## 모바일 대응

- viewport 메타 태그 (핀치 줌 비활성화)
- Phaser.Scale.FIT + CENTER_BOTH 자동 스케일링
- `touch-action: none`, `tap-highlight` 제거
- safe-area 패딩: `env(safe-area-inset-*)` (노치/홈 바 대응)

## 빌드 & 패키징 (Phase 6)

### Vite

- dev 서버: `npm run dev`
- 프로덕션 번들링: `npm run build`
- Phaser CDN → npm 패키지로 전환
- 모듈 로딩 최적화

### Capacitor

- Android + iOS 네이티브 빌드 지원
- `capacitor.config.json` 앱 설정
- 빌드 플로우:
  ```bash
  npm run build
  npx cap sync
  npx cap open android  # 또는 npx cap open ios
  ```

## 퍼포먼스 최적화 (Phase 6)

- **ProjectilePool**: 30개 투사체 사전 할당 오브젝트 풀 (acquire/release)
- **delta 캡 100ms**: 탭 전환 복귀 시 프레임 스파이크 방지
- **Vite 번들링**: ES 모듈 로딩 최적화
