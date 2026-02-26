# Fantasy Tower Defense 변경 이력

모든 주요 변경사항을 날짜순으로 기록한다.

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
