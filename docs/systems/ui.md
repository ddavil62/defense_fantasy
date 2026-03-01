# UI 시스템

HUD, TowerPanel, TowerInfoOverlay(타워 정보 오버레이), 머지 프리뷰, 일시정지, 게임속도, 통계, 골드 싱크 UI, 월드/레벨 선택, Android 뒤로가기 키(ESC) 내비게이션, UI 이미지 에셋, Galmuri 픽셀 폰트, 모바일 대응, 빌드/패키징.

## HUD (상단)

- Wave 번호, Gold 잔액, 기지 HP 표시
- 캠페인 모드: `Wave: X/Y` 형식 (updateWave(round, total))
- 엔드리스 모드: `Wave: X` 형식 (기존 동작)
- HP <= 5 시 빨간 깜빡임
- 웨이브 카운트다운: 대기 시간 잔여량 표시
- 다음 웨이브 적 미리보기 도트 표시
- 음소거 토글 버튼
- Pause 버튼 (||) -- 우측 상단 (x=310, y=20)
- 배경: `hud_bar_bg` 이미지 (360x40px), 폴백 그라데이션
- 아이콘: `icon_diamond`(다이아), `icon_heart`(HP), `icon_sword`(웨이브) 픽셀아트 이미지, 폴백 유니코드 텍스트

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
- 배치된 타워 선택 시 TowerInfoOverlay(game 모드) 오버레이 열기
- 드래그 시 합성 가능 타워 하이라이트 + 호버 미리보기 말풍선
- 합성 파트너 깜빡이기: `_flashMergeTargets()` (금색 원 300ms yoyo 반복 3회)
- 상세: 아래 "타워 정보 오버레이 (TowerInfoOverlay)" 및 "머지 프리뷰 UI" 섹션 참조

## 타워 정보 오버레이 (TowerInfoOverlay)

인게임 타워 클릭 모달과 합성도감 카드 오버레이를 통합한 단일 컴포넌트. `js/ui/TowerInfoOverlay.js`에 위치한다.

### 모드

| 모드 | 진입 경로 | 추가 기능 | depth |
|---|---|---|---|
| `game` | TowerPanel -> 배치 타워 선택 | 강화/판매 버튼 | 100 |
| `codex` | MergeCodexScene -> 카드 클릭 | 없음 (정보 전용) | 50 |

### 공통 레이아웃

- 반투명 배경막 (alpha 0.96), 패널 300px 너비
- 닫기(X) 버튼: 패널 우상단
- 뒤로(`< 뒤로`) 버튼: 패널 좌상단 (드릴다운 중에만)
- 배경막 클릭: 뒤로가기 (히스토리 없으면 닫기)

### T1 스탯 패널

- 이름(16px), 색상 원(r=14), T1 배지, 공격 유형 배지
- DMG/SPD/RNG 스탯 (11px, #b2bec3)
- game 모드 원래 타워: Tower 인스턴스의 실시간 스탯 (강화/메타 반영)
- codex 모드: `_applyMetaUpgrades` 옵션 함수로 메타 업그레이드 반영
- 강화 레벨 `+N` 금색 텍스트 (enhanceLevel > 0, game 모드 원래 타워만)

### T2+ 합성 트리 패널

- 결과 노드: r=28, 타워 색상 원 + BTN_PRIMARY 금테
- 재료 노드 2개: r=20, +-55px 오프셋
  - T2+ 재료: 금색 테두리, 클릭 시 드릴다운
  - T1 재료: 회색(0x636e72) 테두리, 클릭 시 T1 스탯 패널
- Y자 연결선: 수직선 + 수평 분기선
- 스탯: 구분선 아래 DMG/SPD/RNG (MERGED_TOWER_STATS 참조)

### 상위 조합 섹션

- `_findUsedInRecipes(id)`: MERGE_RECIPES에서 해당 타워를 재료로 사용하는 레시피 검색
- 구분선 + 헤더("상위 조합") + 드래그 스크롤 리스트 (GeometryMask, 뷰포트 약 68px)
- 항목: "T{tier} {displayName}", hover 시 금색, 클릭 시 드릴다운
- 스크롤 힌트: 콘텐츠 초과 시 하단 `▼` 표시

### 패널 높이 동적 계산

| 조건 | baseH | usedInViewH | actionH (game) | panelH |
|---|---|---|---|---|
| T1, 상위 조합 없음 | 200px | 0 | 90px (원래 타워) / 0 | 200~290px |
| T1, 상위 조합 있음 | 200px | 100px | 90px / 0 | 300~390px |
| T2+, 상위 조합 없음 | 300px | 0 | 90px / 0 | 300~390px |
| T2+, 상위 조합 있음 | 300px | 100px | 90px / 0 | 400~490px |

- game 모드에서 원래 타워(depth 0) 보기 중에만 actionH=90 추가

### 드릴다운 & 히스토리

- 재료 노드/상위 조합 항목 클릭: 현재 entry를 `_history` 스택에 push -> 대상 entry 렌더링
- `< 뒤로` 버튼: `_history.pop()` -> 이전 entry 복원
- X 버튼: `_forceClose()` -- 히스토리 무시, 즉시 닫기
- 오버레이 닫기 후 200ms 이내 재클릭 방지 (`_closedAt` 타임스탬프)

### game 모드 액션 버튼

- **강화 버튼** (200x32, BTN_PRIMARY): `canEnhance && enhanceLevel < MAX_ENHANCE_LEVEL` 조건, 클릭 시 `onEnhance` 콜백
- **판매 버튼** (200x32, BTN_DANGER): 항상 표시, 클릭 시 `onSell` 콜백 + 오버레이 닫기
- **최대 강화 텍스트**: enhanceLevel >= MAX_ENHANCE_LEVEL 시 금색 "최대 강화" 텍스트
- **드릴다운 중**: 강화/판매 버튼 숨김 (원래 타워가 아닌 다른 타워를 보고 있을 때)
- **원래 타워 복귀**: 강화/판매 버튼 다시 표시

### 리스너 정리

- `_scrollMoveHandler`, `_scrollUpHandler`: 인스턴스 변수에 참조 저장
- `_removeScrollListeners()`: `_render()` 시작 시 및 `_forceClose()` 시 호출하여 누수 방지

### 메서드 구조

```
TowerPanel.showTowerInfo(tower) / MergeCodexScene._showCodexCardOverlay(entry)
  -> TowerInfoOverlay.open(towerOrEntry)
       |- _history = []
       |- game: _buildEntryFromTower(tower) -> _render(entry)
       +- codex: _render(entry)
             |- _removeScrollListeners()
             |- _findUsedInRecipes(entry.id) -> usedInList
             |- panelH = baseH + usedInViewH + actionH
             |- tier === 1 -> _renderT1Panel(...)
             +- tier >= 2 -> _renderTreePanel(...)
                               |- 노드 트리 + 스탯
                               +- 재료 클릭 -> push(현재) -> _render(재료)
             |- usedInList.length > 0 -> _renderUsedInSection(...)
             +- isSourceView -> _renderActionButtons(...)

뒤로가기 -> _handleBack() -> _history.pop() -> _render(이전)
닫기 -> _forceClose() -> _removeScrollListeners() -> container.destroy()
```

## 머지 프리뷰 UI

드래그 시 하이라이트 + 호버 미리보기를 제공한다. 배치 타워 선택 시 상세 정보는 TowerInfoOverlay(game 모드)로 표시한다.

### 드래그 하이라이트 + 호버 미리보기

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

#### 유틸리티 카드 레이아웃

카드 크기: UTIL_W=104px x UTIL_H=80px. 수직 배치 (타워 카드와 동일 패턴).

| 요소 | X 좌표 | Y 좌표 | origin | fontSize |
|---|---|---|---|---|
| 아이콘 | cx (카드 중앙) | y + 18 | - | - |
| 이름 | cx | y + 34 | (0.5, 0.5) | 12px |
| Tier | cx | y + 52 | (0.5) | 11px |
| 효과 | cx | y + 66 | (0.5) | 10px |

- 카드 전체 폭(104px)을 텍스트에 활용하여 "Wave Bonus+" 등 긴 텍스트도 카드 내 수용
- 업그레이드(tier > 0)된 카드: 금색 테두리(0xffd700), 미업그레이드: 회색 테두리(0x636e72)

### 탭 2: 합성도감

합성도감 탭 클릭 시 `scene.start('MergeCodexScene', { fromScene: 'CollectionScene' })`로 MergeCodexScene 전용 씬으로 전환한다.

- 기존 CollectionScene 내부의 Codex 관련 메서드/상태 변수/상수는 전부 제거됨
- MergeCodexScene에서 BACK 클릭 시 `scene.start('CollectionScene')`로 복귀
- 상세는 아래 "합성도감 전용 씬 (MergeCodexScene)" 섹션 참조

## 합성도감 전용 씬 (MergeCodexScene)

T1~T5 전체 112종(기본 10 + 합성 102) 타워를 발견 여부와 무관하게 모두 공개하는 전용 씬. GameScene(Pause 오버레이)과 CollectionScene(합성도감 탭) 양쪽에서 진입 가능.

### 진입 경로

| 진입 경로 | 씬 전환 방식 | BACK 동작 |
|---|---|---|
| GameScene Pause 오버레이 -> 합성도감 버튼 | `scene.launch` + `scene.sleep('GameScene')` | `scene.stop('MergeCodexScene')` + `scene.wake('GameScene')` -> Pause 오버레이 재표시 |
| CollectionScene 합성도감 탭 | `scene.start('MergeCodexScene')` | `scene.start('CollectionScene')` |

- `init(data)`: `{ fromScene: 'GameScene' | 'CollectionScene' }` 수신 (미지정 시 CollectionScene 기본값)

### 레이아웃

```
+-----------------------------------+  y=0
| < BACK          합성도감           |  y=0~48  (TopBar, h=48)
+-----------------------------------+  y=48
| [ T1 ][ T2 ][ T3 ][ T4 ][ T5 ]   |  y=48~76  (SubTab Bar, h=28)
+-----------------------------------+  y=76
|    T{n}: {total}종                 |  y=82~100 (Progress)
+-----------------------------------+  y=104
|       카드 그리드 (스크롤)          |  y=104~640
+-----------------------------------+
```

### TopBar (y=0~48)

- 배경: COLORS.HUD_BG, h=48
- BACK 버튼: x=38, y=24, 60x28px, "< BACK", 클릭 시 `_goBack()` 호출
- 타이틀: x=180, y=24, i18n 키 `codex.title` (ko: "합성도감", en: "Merge Codex")

### SubTab Bar (y=48~76)

- T1~T5 서브탭 5개, 각 64px, 간격 4px
- 선택 탭: COLORS.UI_PANEL 배경, COLORS.DIAMOND 테두리, bold
- 비선택 탭: COLORS.BACKGROUND 배경, 0x636e72 테두리
- 기본 선택: T2 (매 씬 진입 시 codexTier=2로 초기화)
- 탭 전환 시 스크롤 위치 초기화 (codexScrollY=0)

### Progress 표시

- 위치: y = PROGRESS_Y + 8 = 90
- 텍스트: i18n 키 `codex.progress` (ko: "T{n}: {total}종", en: "T{n}: {total} towers")
- 발견 카운트 없이 총 개수만 표시
- 색상: #b2bec3, 12px, 중앙 정렬

### 카드 그리드

- 카드 크기: 62x74px, 5열, 간격 6px
- CODEX_GRID_X = (360 - (5*62 + 4*6)) / 2 = 16
- CODEX_GRID_Y = 104
- Geometry Mask로 CODEX_GRID_Y~GAME_HEIGHT 클리핑
- 드래그 스크롤: `this.input.on()` 전역 이벤트 기반, 5px threshold로 클릭/드래그 구분

### 카드 표시 (전부 공개)

모든 카드를 발견된 것처럼 동일하게 표시. ??? 카드 없음.

| 요소 | 스펙 |
|---|---|
| 배경 | COLORS.UI_PANEL, 티어별 테두리 색상, 62x74px |
| 색상 원 | entry.color, 반지름 10px, y+18 위치 |
| 이름 | 6자 초과 시 5자+.. truncate, 9px 흰색 |
| attackType 뱃지 | Single/Splash/AoE/Chain/Beam/DoT, 8px #81ecec |
| 티어 뱃지 | T{n}, 8px #ffd700 |

- 티어별 테두리 색상: T1/T2=0xb2bec3, T3/T5=0xffd700, T4=0xa29bfe

### 카드 클릭 상세 오버레이

카드 클릭 시 `TowerInfoOverlay`(codex 모드)를 통해 상세 정보를 표시한다. 오버레이 상세 사양은 위 "타워 정보 오버레이 (TowerInfoOverlay)" 섹션 참조.

- `_showCodexCardOverlay(entry)` -> `towerInfoOverlay.open(entry)`
- codex 모드: depth 50, 강화/판매 버튼 없음, 메타 업그레이드 반영 (applyMetaUpgrades 옵션 주입)
- 오버레이 닫기 후 200ms 이내 재클릭 방지 (`towerInfoOverlay.getClosedAt()`)
- 오버레이 열린 상태에서 도감 그리드 드래그 차단 (`towerInfoOverlay.isOpen()`)

#### 메타 업그레이드 반영 (`_applyMetaUpgradesToStats`)

T1 카드 오버레이에서 DMG/SPD/RNG 표시 시, `saveData.towerUpgrades`에 저장된 메타 업그레이드 보너스를 적용한 값을 보여준다.

- `_applyMetaUpgradesToStats(towerType, stats)`: `META_UPGRADE_TREE`의 tier1~tier3 선택지 effects를 순차 적용
  - `multiply` 타입: `stats[stat] *= value` (damage, range 등 정수 스탯은 `Math.round` 처리)
  - `add` 타입: `stats[stat] += value`
- 메타 업그레이드가 없으면 기본 `TOWER_STATS[type].levels[1]` 값 그대로 표시

#### shutdown 핸들러

- `create()`에서 `events.on('shutdown', _onShutdown)` 등록
- `_onShutdown()`: `_cleanupCodexDrag()` + `towerInfoOverlay.destroy()` + 자기 해제(`events.off`)

### 데이터 소스

- T1: `TOWER_STATS` 10종 (TOWER_ORDER 순서)
- T2~T5: `MERGE_RECIPES` 102종, `MERGED_TOWER_STATS`에서 attackType 참조
- `_buildTierData()`: 씬 생성 시 1회 캐시 빌드, 티어별 알파벳순 정렬
- 타워 수: T1=10, T2=55, T3=30, T4=12, T5=5 (총 112종)

### i18n 키

| 키 | ko | en |
|---|---|---|
| `codex.title` | 합성도감 | Merge Codex |
| `codex.progress` | T{n}: {total}종 | T{n}: {total} towers |
| `codex.usedIn` | 상위 조합 | Used In |
| `ui.mergeCodex` | 합성도감 | Merge Codex |

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
- Pause 시 BGM 정지: `_pauseGame()`에서 현재 BGM ID를 `_bgmIdBeforePause`에 저장 후 `stopBgm(false)` 호출
- Resume 시 BGM 복원: `_resumeGame()`에서 `_bgmIdBeforePause`로 `playBgm()` 호출
- 오버레이 내용 (패널: 220x260, 중심 x=180, y=310):
  - "PAUSED" 텍스트 (y=220)
  - Resume 버튼 (y=252, 색상 0x00b894 초록, 이전 게임 속도 + BGM 복원 후 재개)
  - 합성도감 버튼 (y=288, 색상 0x6c5ce7 보라, MergeCodexScene 전환)
  - Main Menu 버튼 (y=324, 색상 0xe94560 빨강, MenuScene으로 즉시 이동)
  - SFX/BGM 볼륨 조절 슬라이더 (baseY=360)

### 합성도감 버튼 동작

- 클릭 시: `_hidePauseOverlay()` -> `scene.launch('MergeCodexScene', { fromScene: 'GameScene' })` -> `scene.sleep('GameScene')`
- isPaused는 true 유지 (게임 시간 진행 없음)
- MergeCodexScene에서 BACK 클릭 시: `scene.stop('MergeCodexScene')` -> `scene.wake('GameScene')` -> isPaused=true이므로 `_showPauseOverlay()` 자동 재표시
- `_hidePauseOverlay()`: pauseOverlay 컨테이너 destroy만 수행 (isPaused 변경 없음)
- `_onWake()`: wake 이벤트 핸들러에서 isPaused 상태 확인 후 Pause 오버레이 재표시
- `_cleanup()`에서 wake 리스너 해제

## 게임 속도 제어

- 3단 순환: x1(기본) → x2(2배속) → x3(3배속)
- 모든 요소(이동, 쿨다운, 스폰) 동기화
- `SPEED_TURBO = 3`

## 게임 오버 화면

- 기지 HP 0 시 게임 일시정지 + 결과 패널
- 도달 라운드, 처치 수, 최고 기록(localStorage) 표시
- Diamond 획득량/총량 표시
- 게임 요약 (킬 수, 골드 획득, 데미지 딜량)
- 캠페인 모드 (gameMode === 'campaign'):
  - 패널 높이 420px
  - RETRY (BTN_PRIMARY 골드) + WORLD MAP (BTN_BACK 틸, WorldSelectScene) + MENU (BTN_DANGER 레드 160x30) 3버튼
- 엔드리스 모드 (기존):
  - 패널 높이 380px
  - RETRY (BTN_PRIMARY 골드) + MENU (BTN_DANGER 레드) 2버튼

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

## 월드 선택 (WorldSelectScene)

MenuScene에서 CAMPAIGN 버튼 탭 시 진입하는 월드 선택 화면.

### 레이아웃 (360x640)

- Y 0~50: 헤더 (0x0a0820 배경, 골드 구분선)
  - 좌측 (30, 25): 뒤로가기 "< 뒤로" (틸, MenuScene 이동)
  - 중앙 (180, 25): "월드 선택" (골드, 18px bold)
- Y 58~: 5개 월드 패널 (320x88px, 간격 10px)

### 월드 패널

| 상태 | stroke | alpha | 이름 색상 | 동작 |
|---|---|---|---|---|
| 해금 | 테마 강조색, lineWidth 2 | 1.0 | #ffd700 골드 | 탭 -> LevelSelectScene(worldId) |
| 잠금 | 0x4a4a5a, lineWidth 1 | 0.5 | #636e72 회색 | 반응 없음 |

- 해금 패널: 월드 번호+이름(16px), 설명(12px), 별점 진행도(0/18, 12px), 호버 효과
- 잠금 패널: 잠금 아이콘(U+1F512, 20px), "별 N개 필요" 문구(11px)

### 월드별 테마 강조색

| 월드 | 강조색 |
|---|---|
| forest | 0x2ecc71 (초록) |
| desert | 0xe67e22 (주황) |
| tundra | 0x74b9ff (하늘) |
| volcano | 0xe17055 (적) |
| shadow | 0x9b59b6 (보라) |

### 진행 데이터 (Phase 3 임시)

`_getWorldProgress(worldId)`: forest만 unlocked=true, stars=0, maxStars=18. Phase 4에서 세이브 데이터 연동.

## 레벨 선택 (LevelSelectScene)

WorldSelectScene에서 해금된 월드 패널 탭 시 진입하는 맵 선택 화면.

### 레이아웃 (360x640)

- Y 0~50: 헤더 (0x0a0820 배경, 골드 구분선)
  - 좌측: 뒤로가기 (틸, WorldSelectScene 이동)
  - 중앙: 월드 이름 (골드, 18px bold)
- Y 58~: 6개 맵 카드 (320x86px)

### 맵 카드

| 상태 | stroke | 동작 |
|---|---|---|
| 해금 | BTN_PRIMARY, lineWidth 2 | START 버튼(80x26px) 탭 -> GameScene(mapData, gameMode: campaign) |
| 잠금 | 0x4a4a5a, lineWidth 1 | 반투명 검정 오버레이(alpha 0.55) + 잠금 아이콘 |

해금 카드 표시:
- 좌측: 맵 번호(22px 골드), 이름(14px 흰색), 설명(11px 회색, `wordWrap: { width: 160 }`)
- 우측: 별점 3개(채운 별 #ffd700 / 빈 별 #333340), Wave 수(11px), 난이도 점(최대 3개, 채운 원 골드 / 빈 원 회색)
- 하단 우측: START 버튼 (BTN_PRIMARY, 13px bold)

카드 내부 패딩:
- cardLeft = centerX - cardW/2 + 35 (= 55px) -- 좌측 기둥 장식(~31px) 안쪽
- cardRight = centerX + cardW/2 - 35 (= 305px) -- 우측 기둥 장식(~24px) 안쪽
- 설명 텍스트는 160px 폭에서 자동 줄바꿈, 2줄까지 카드 내 수용(하단 여백 28px)

### 해금 판정 (Phase 3 임시)

`_isMapUnlocked(mapIndex)`: index 0만 true. `_getMapStars(mapId)`: 항상 0. Phase 4에서 세이브 데이터 연동.

## 메뉴 화면 (MenuScene)

### 버튼 배치

| Y | 버튼 | 크기 | 이미지 키 | 동작 |
|---|---|---|---|---|
| 380 | CAMPAIGN | 대형 160x44 | `btn_large_primary` | WorldSelectScene 이동 |
| 435 | ENDLESS (활성) | 대형 160x44 | `btn_large_primary` | EndlessMapSelectScene 이동 |
| 435 | ENDLESS (비활성) | 대형 160x44 | `btn_large_disabled` | 잠금 (setInteractive 미호출) |
| 460 | (잠금 안내) | - | - | "전체 클리어 시 해금" |
| 492 | COLLECTION | 대형 160x44 | `btn_large_meta` | CollectionScene 이동 |
| 544 | STATISTICS | 대형 160x44 | `btn_large_back` | StatsScene 이동 |
| 596 | 음소거 토글 | 소형 80x26 | `btn_small_back` / `btn_small_disabled` | 음소거 ON/OFF |

모든 버튼은 `_createImageButton()`으로 생성. 이미지 텍스처 존재 시 Image, 미존재 시 Rectangle 폴백.

### 종료 확인 다이얼로그 (`_openExitDialog`)

Android 뒤로가기 키(ESC) 입력 시 표시되는 앱 종료 확인 다이얼로그.

| 요소 | 스펙 |
|---|---|
| 오버레이 | 전체 화면, 0x000000, alpha 0.7, 클릭 시 취소 처리 |
| 패널 | 240x140px, 배경 0x05050f, 골드 테두리(0xc0a030, 2px) |
| 텍스트 | "게임을 종료하시겠습니까?", 16px 골드, 중앙 상단 |
| 확인 버튼 | 90x34px, BTN_DANGER(레드), "확인", 좌측 배치 |
| 취소 버튼 | 90x34px, BTN_BACK(틸), "취소", 우측 배치 |

- depth: 100 (Container)
- 중복 방지: `window.__isExitDialogOpen` 플래그
- 확인 시 앱 종료: `navigator.app.exitApp()` -> `window.close()` 폴백
- 취소/외부 클릭: `dialogContainer.destroy()` + 플래그 해제
- i18n: `ui.exitConfirm`, `ui.exitConfirmYes`, `ui.exitConfirmNo`

## UI 이미지 에셋 시스템

모든 UI 요소를 픽셀아트 이미지로 교체. 8~16px 그리드 기반, 계단 엣지(안티에일리어싱 없음), 다크 판타지 테마.

### 렌더 설정

- `js/main.js` Phaser config: `pixelArt: true`, `antialias: false`

### 에셋 로드

- `js/scenes/BootScene.js` preload()에서 46장 일괄 로드
- 경로: `public/assets/ui/` 하위 5개 폴더 (buttons, panels, hud, decorations, icons)

### 버튼 크기 표준 (3등급)

| 등급 | 크기 | 이미지 프리픽스 | 적용 대상 |
|---|---|---|---|
| 대형 (Large) | 160x44px | `btn_large_` | 메뉴 주요 버튼, NEXT MAP, RETRY(주), 결과 화면 1순위 |
| 중형 (Medium) | 160x36px | `btn_medium_` | RETRY(보조), WORLD MAP, 일시정지 패널, 강화/판매 |
| 소형 (Small) | 80x26px | `btn_small_` | START, 음소거 토글 |

### 버튼 색상 변형 (4종 + disabled)

| 색상 | 키 접미사 | 용도 |
|---|---|---|
| Primary (골드) | `_primary_` | 주요 액션 (CAMPAIGN, NEXT MAP 등) |
| Meta (퍼플) | `_meta_` | 컬렉션, 합성도감 |
| Back (틸) | `_back_` | 뒤로가기, RESUME, 음소거 ON |
| Danger (다크레드) | `_danger_` | MENU, WORLD MAP (파괴적 액션) |
| Disabled (그레이) | `_disabled` | 잠금, 비활성 |

- 소형은 primary, back, disabled만 존재 (meta/danger 없음)

### 버튼 상태 전환

- normal: 기본 텍스처 (`_normal.png`)
- pressed: 클릭 시 텍스처 전환 (`_pressed.png`), pointerup/pointerout 시 복귀
- disabled: 단일 텍스처, setInteractive 미호출

### 슬롯 이미지 (별도 계열)

| 유형 | 크기 | 키 | 용도 |
|---|---|---|---|
| 타워 슬롯 | 40x40px | `tower_slot_normal/selected/locked` | 타워 선택 버튼 10개 |
| 액션 슬롯 | 32x32px | `slot_action_normal/pressed` | 판매, 배속, HP 회복 |
| 미니 슬롯 | 24x24px | `slot_mini_normal/pressed` | 소모품 능력 3개 |

### 패널 이미지

| 키 | 크기 | 용도 |
|---|---|---|
| `panel_result` | 280x420px | MapClear/GameOver 결과 패널 |
| `panel_pause` | 220x260px | 일시정지 패널 |
| `panel_world_card` | 320x88px | 월드 선택 카드 |
| `panel_level_card` | 320x86px | 레벨 선택 카드 |
| `panel_info_overlay` | 300x360px | TowerInfoOverlay 패널 |

### HUD 이미지

| 키 | 크기 | 용도 |
|---|---|---|
| `hud_bar_bg` | 360x40px | HUD 상단 배경 |
| `tower_panel_bg` | 360x120px | 하단 타워 패널 배경 |

### 아이콘 이미지

| 키 | 크기 | 대체 대상 |
|---|---|---|
| `icon_diamond` | 16x16px | 유니코드 ◆ |
| `icon_heart` | 16x16px | 유니코드 ♥ |
| `icon_sword` | 16x16px | 유니코드 ⚔ |
| `icon_star_filled` | 20x20px | 유니코드 ★ |
| `icon_star_empty` | 20x20px | 유니코드 ☆ |
| `icon_lock` | 20x20px | 이모지 자물쇠 |

### 장식 이미지 (미사용)

| 키 | 크기 | 비고 |
|---|---|---|
| `divider_gold` | 280x4px | 로드만 됨, 코드에서 미사용 |
| `divider_header` | 360x2px | 로드만 됨, 코드에서 미사용 |
| `corner_deco` | 8x8px | 로드만 됨, 코드에서 미사용 |

### Image/Rectangle 폴백 패턴

모든 이미지 적용 코드에서 `textures.exists()` 체크 후 분기:
- 텍스처 존재: `this.add.image()` 사용
- 텍스처 미존재: 기존 `this.add.rectangle()` 폴백

`instanceof Phaser.GameObjects.Rectangle` 가드로 Rectangle 전용 메서드(`setStrokeStyle`, `setFillStyle`) 호출을 보호. Image 객체에서는 `setTint()`/`clearTint()`로 색상 상태를 표현한다.

### 에셋 총계

- 버튼: 23장 (대형 9 + 중형 9 + 소형 5)
- 패널: 5장
- HUD/슬롯: 9장 (HUD 2 + 타워슬롯 3 + 액션슬롯 2 + 미니슬롯 2)
- 장식: 3장 (미사용)
- 아이콘: 6장
- **합계: 46장**

## Galmuri 픽셀 폰트

시스템 폰트(Arial)를 Galmuri11 비트맵 픽셀 폰트로 전체 교체. 닌텐도 DS 영감의 한국어 완벽 지원 픽셀 폰트로, 다크 판타지 픽셀아트 컨셉과 일관된 타이포그래피를 제공한다.

### 폰트 파일

| 파일 | 용도 | 용량 | 비고 |
|---|---|---|---|
| `public/assets/fonts/Galmuri11.woff2` | 본문 전반 (Regular) | 504KB | preload 대상 |
| `public/assets/fonts/Galmuri11-Bold.woff2` | Bold 강조 텍스트 | 166KB | preload 대상 |
| `public/assets/fonts/Galmuri9.woff2` | 소형 텍스트 확장 여지 | 429KB | 현재 미사용, preload 미포함 |

- 라이선스: SIL OFL (Galmuri v2.40.3, https://github.com/quiple/galmuri)
- APK 빌드 시 `public/` 하위 파일이 `dist/assets/fonts/`에 복사되어 오프라인 동작 보장

### CSS @font-face (`style.css`)

- Galmuri11 Regular (`font-weight: normal`) + Bold (`font-weight: bold`): 동일 `font-family: 'Galmuri11'`로 weight 기반 분기
- Galmuri9 Regular: `font-family: 'Galmuri9'`로 별도 선언 (확장 여지)
- `font-display: block`: 폰트 로딩 중 텍스트 비표시로 FOUT(Flash Of Unstyled Text) 방지
- URL: `/assets/fonts/` (Vite 정적 에셋 서빙 경로)

### HTML preload (`index.html`)

- Galmuri11 Regular, Bold 2개만 preload (`<link rel="preload" as="font" type="font/woff2" crossorigin>`)
- Galmuri9는 미사용이므로 preload 생략 (불필요한 430KB 로드 방지)

### 폰트 로딩 대기 (`BootScene.js`)

- `create()` 메서드를 `async`로 변경
- `await document.fonts.ready`로 CSS @font-face 폰트가 모두 로드될 때까지 대기
- 대기 완료 후 `this.scene.start('MenuScene')` 호출
- Phaser 텍스트 오브젝트는 Canvas 2D API `fillText`로 렌더링하므로, 폰트 로드 전 렌더링 시 fallback(Arial)으로 표시됨. `document.fonts.ready` 대기로 최초 씬 진입 시 Galmuri 보장

### fontFamily 교체

- 모든 Phaser 텍스트 오브젝트의 `fontFamily` 값을 `'Galmuri11, Arial, sans-serif'`로 통일
- Arial은 fallback 폰트로 유지 (Galmuri 로드 실패 시 대비)
- 기존 `fontStyle: 'bold'`는 그대로 유지 -> Galmuri11 Bold @font-face 자동 적용
- `fontSize` 수치 변경 없음

### 교체 대상 파일 (15개, 183개 참조)

| 파일 | fontFamily 수 |
|---|---|
| `js/scenes/CollectionScene.js` | 33 |
| `js/ui/TowerInfoOverlay.js` | 22 |
| `js/scenes/GameOverScene.js` | 16 |
| `js/scenes/GameScene.js` | 15 |
| `js/scenes/StatsScene.js` | 14 |
| `js/scenes/EndlessMapSelectScene.js` | 12 |
| `js/scenes/LevelSelectScene.js` | 11 |
| `js/scenes/MapClearScene.js` | 11 |
| `js/scenes/MenuScene.js` | 11 |
| `js/scenes/WorldSelectScene.js` | 10 |
| `js/ui/TowerPanel.js` | 10 |
| `js/scenes/MergeCodexScene.js` | 7 |
| `js/ui/HUD.js` | 7 |
| `js/managers/WaveManager.js` | 2 |
| `js/managers/MapManager.js` | 2 |

## Android 뒤로가기 키(ESC) 내비게이션

`js/main.js`에서 `document.addEventListener('keydown', handleBackButton)` 리스너로 구현. Capacitor Android WebView에서 하드웨어 뒤로가기 버튼은 ESC 키(keyCode 27)로 매핑되어 keydown 이벤트로 발생한다.

### 핸들러 로직

```
e.key !== 'Escape' && e.keyCode !== 27 -> return
e.preventDefault()
game.scene.getScenes(true)[0] -> 현재 활성 씬 조회
씬별 switch 분기
```

### 씬별 매핑

| 씬 | 동작 | 전환 방식 |
|---|---|---|
| MenuScene | 종료 확인 다이얼로그 | `_openExitDialog()` (이미 열려 있으면 무시) |
| WorldSelectScene | MenuScene | fadeOut(200) + camerafadeoutcomplete |
| LevelSelectScene | WorldSelectScene | fadeOut(200) + camerafadeoutcomplete |
| EndlessMapSelectScene | MenuScene | fadeOut(200) + camerafadeoutcomplete |
| CollectionScene | MenuScene | 즉시 scene.start |
| MergeCodexScene | 호출 씬 복귀 | fromScene='GameScene': stop+wake, 그 외: scene.start('CollectionScene') |
| StatsScene | MenuScene | 즉시 scene.start |
| GameScene | 일시정지 | `_pauseGame()` (isPaused=true 또는 isGameOver=true 시 무시) |
| MapClearScene | WorldSelectScene | fadeOut(200) + camerafadeoutcomplete |
| GameOverScene | MenuScene | fadeOut(200) + camerafadeoutcomplete |
| BootScene | 무시 | switch default break |

### 기술 상세

- `@capacitor/app` 패키지 불필요 (document keydown 이벤트 방식)
- 리스너는 게임 인스턴스 생성 직후 1회만 등록 (removeEventListener 불필요)
- 페이드아웃 씬(WorldSelect, LevelSelect, EndlessMapSelect, MapClear, GameOver)은 기존 코드의 `fadeOut(200) -> camerafadeoutcomplete -> scene.start` 패턴을 동일하게 사용
- 즉시 전환 씬(Collection, Stats)은 기존 코드에서 페이드아웃 없이 scene.start 사용하므로 동일 패턴 적용
- PC 브라우저에서도 ESC 키로 동일하게 동작

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
