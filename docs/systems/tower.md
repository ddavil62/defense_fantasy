# 타워 시스템

10종 기본 타워 (Lv.1). 타워 간 드래그&드롭 머지로 상위 티어 합성 (Phase 2 이후 활성화). 강화(+1~+10)로 스탯 추가 보강.

## 타워 목록

| 타워 | 설치비 | 공격 타입 | 핵심 특성 | 잠금 |
|---|---|---|---|---|
| 궁수 | 50G | 단일 | damage:10, fireRate:0.8, range:120 | - |
| 마법사 | 100G | 범위 폭발 | damage:25, fireRate:2.0, range:100, splashRadius:40 | - |
| 얼음 | 75G | 단일 | damage:8, fireRate:1.5, range:100, slow:0.3/2.0s | - |
| 번개 | 120G | 체인 연쇄 즉발 | damage:20, fireRate:1.0, range:120, 4체인 | - |
| 불꽃 | 90G | 단일 도트 | damage:12, fireRate:1.2, range:100, burn:5/3s | - |
| 바위 | 110G | 단일 | damage:40, fireRate:2.5, range:80 | - |
| 독안개 | 95G | 즉발 광역 | damage:5, fireRate:2.0, range:120, poison:4/4s | - |
| 바람 | 80G | 단일 | damage:5, fireRate:1.0, range:100, pushback:80 | - |
| 빛 | 130G | 관통 빔 | damage:20, fireRate:1.5, range:600 | - |
| 드래곤 | 250G | 범위 폭발 | damage:60, fireRate:2.5, range:160, splashRadius:80 | 50 Diamond |

## 공격 타입 (7종)

- `single` -- 단일 대상 투사체
- `splash` -- 범위 폭발 투사체
- `aoe_instant` -- 즉발 원형 광역 (투사체 없음)
- `chain` -- 체인 연쇄 즉발 (번개)
- `dot_single` -- 단일 대상 지속 피해 (투사체)
- `dot_splash` -- 범위 지속 피해
- `piercing_beam` -- 일직선 관통 빔 (즉발)

## 타워 잠금 시스템

`TOWER_STATS[type]`의 `locked`/`unlockCost` 필드로 범용 관리.

- `locked: false` (또는 undefined) = 사용 가능
- `locked: true` = 잠금 상태, Diamond로 해금
- `unlockCost`: 해금에 필요한 Diamond 수량
- 현재 드래곤만 `locked: true`, `unlockCost: 50`
- 해금 정보는 `saveData.unlockedTowers[]` 배열에 저장

## 머지 시스템 (인프라 구축 완료, Phase 2에서 활성화)

기본 10종 타워를 재료로 드래그&드롭 합성하여 상위 티어 타워를 생성하는 시스템.

### 기본 구조

- 1티어: 기본 재료 타워 10종
- 2티어: 기본 타워 2개 조합 (동종 10 + 이종 45 = 55종, Phase 2에서 등록)
- 3~5티어: Phase 3~4에서 정의

### 데이터 구조 (config.js)

- `MERGE_RECIPES`: 합성 레시피 테이블 (키 = typeA+typeB 알파벳 정렬, 값 = { id, tier, displayName, color })
- `MERGED_TOWER_STATS`: 합성 타워 스탯 테이블 (키 = mergeId, 값 = 스탯 객체)
- Phase 1에서 두 객체 모두 빈 상태

### 헬퍼 함수

| 함수 | 역할 |
|---|---|
| `getMergeKey(typeA, typeB)` | 알파벳 오름차순 정렬 후 `+`로 연결한 키 반환 |
| `getMergeResult(typeA, typeB)` | MERGE_RECIPES에서 결과 조회, 없으면 null |
| `isMergeable(tower)` | `tower.enhanceLevel === 0` 체크 |
| `isUsedAsMergeIngredient(id)` | MERGE_RECIPES에서 해당 id가 재료로 쓰이는지 확인 |

### 합성 규칙

- 합성 결과는 확정값 (실패 없음, 미등록 조합은 합성 불가 피드백)
- 조합 순서 무관 (A+B == B+A)
- 강화(`enhanceLevel >= 1`) 타워는 드래그 불가, 드롭 대상으로도 합성 불가
- 합성 비용: 없음 (타워 배치 비용만)
- 합성 결과 위치: 드롭 대상(B) 위치에 생성
- 판매 가격: `floor(totalInvested * 0.6)` -- totalInvested는 두 재료의 투자 비용 합산
- 합성 완료 시 `saveData.discoveredMerges`에 mergeId 등록

### Tower.js 머지 관련 속성/메서드

| 속성/메서드 | 설명 |
|---|---|
| `tier` | 타워 티어 (1=기본, 2~5=합성) |
| `mergeId` | 합성 결과 ID (기본 타워는 null) |
| `applyMergeResult(mergeData)` | mergeId/tier 설정, MERGED_TOWER_STATS에서 스탯 로드 |
| `getInfo()` | tier, mergeId, displayName, isMergeable 포함 |

### 티어별 시각 효과

| 티어 | 테두리 색상 | 두께 | alpha |
|---|---|---|---|
| 2 | 은색 (0xb2bec3) | 2px | 0.8 |
| 3 | 금색 (0xffd700) | 2.5px | 0.7 |
| 4 | 보라 (0xa29bfe) | 3px | 0.8 |
| 5 | 금색 (0xffd700) 정적 | 3px | 0.9 |

### Phase 1 상태

- `MERGE_RECIPES = {}` 이므로 드래그/머지 힌트 비활성화
- `hasRecipes` 가드(`Object.keys(MERGE_RECIPES).length > 0`)로 제어
- Phase 2에서 55종 레시피 추가 시 자동 활성화

## 타워 강화 시스템 (골드 싱크)

추가 골드를 투자하여 스탯을 강화한다.

### 기본 규칙

- **대상**: `canEnhance()` = `enhanceLevel < MAX_ENHANCE_LEVEL && !isUsedAsMergeIngredient(id)`
  - Phase 1: MERGE_RECIPES가 비어있으므로 모든 기본 타워가 강화 가능
  - Phase 2 이후: 레시피 재료로 쓰이는 타워는 강화 불가 (합성 우선)
- **최대 레벨**: +10
- **비용**: `200 + 100 * currentEnhanceLevel` (에스컬레이팅)
- **1기 풀강화 총비용**: 6,500G

### 강화당 스탯 보너스

| 스탯 | 변화 | 비고 |
|---|---|---|
| 공격력 (damage) | x1.05 (+5%) | 복리 적용 |
| 사거리 (range) | x1.025 (+2.5%) | 복리 적용 |
| 공속 (fireRate) | x0.975 (-2.5%) | 최소 0.3초 제한 |

+10 풀강화 시 누적 보너스: 공격력 약 +63%, 사거리 약 +28%, 공속 약 -22%.

### Tower.js 강화 관련 속성/메서드

- `enhanceLevel`: 현재 강화 레벨 (0~10)
- `enhanceInvested`: 강화에 투자한 총 골드
- `enhance()`: 강화 실행 (스탯 적용 + 레벨 증가)
- `canEnhance()`: 강화 가능 여부
- `getEnhanceCost()`: 현재 강화 비용 반환
- `_drawEnhanceGlow()`: 금색 글로우 링 시각 효과 렌더링

### 시각 효과

- 강화된 타워에 금색 글로우 링 표시
- 타워 이름에 `+N` 표시 (예: "Archer +5")
- 최대 강화 시 금색 "최대 강화" 텍스트

## 배치 & 타겟팅

- 그리드 스냅 배치 (40x40px 셀)
- 배치 가능/불가 시각 피드백
- 타겟팅 우선순위: First (경로 진행도 최고)
- 타워 호버 시 사거리 원형 프리뷰 표시

## 메타 업그레이드 (컬렉션 모드)

- 타워당 3티어 x A/B 분기 (총 60개 옵션)
- Diamond 소모, 영구 스탯 보너스 (damage, range, cooldown 등)
- 인게임 타워 배치 시 자동 적용
