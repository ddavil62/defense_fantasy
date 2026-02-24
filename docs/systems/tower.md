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

## 머지 시스템

기본 10종 타워를 재료로 드래그&드롭 합성하여 상위 티어 타워를 생성하는 시스템.

### 기본 구조

- 1티어: 기본 재료 타워 10종
- 2티어: 기본 타워 2개 조합 (동종 10 + 이종 45 = 55종) -- 구현 완료
- 3티어: T2+T2 또는 T2+T1 조합 (12 + 18 = 30종) -- 구현 완료
- 4티어: T3+T1, T3+T2, T3+T3 조합 (6 + 3 + 3 = 12종) -- 구현 완료
- 5티어: T4+T4 조합 (5종 전설) -- 구현 완료

### 데이터 구조 (config.js)

- `MERGE_RECIPES`: 합성 레시피 테이블 (키 = typeA+typeB 알파벳 정렬, 값 = { id, tier, displayName, color })
- `MERGED_TOWER_STATS`: 합성 타워 스탯 테이블 (키 = mergeId, 값 = 스탯 객체)
- 현재 102종 레시피/스탯 등록 완료 (55종 T2 + 30종 T3 + 12종 T4 + 5종 T5)

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

### 2티어 합성 타워 55종

55종 레시피가 MERGE_RECIPES에 등록되어 드래그&드롭 합성이 활성화된 상태.

#### 동종 조합 (10종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| archer+archer | rapid_archer | 연속 사격수 | single | dmg:12, spd:0.4, rng:130 |
| mage+mage | overload_mage | 과충전 술사 | splash | dmg:60, spd:3.5, rng:110, splash:70 |
| ice+ice | zero_field | 절대 영역 | aoe_instant | dmg:4, spd:1.0, rng:130, splash:90, slow:0.5/3.0s |
| lightning+lightning | thunder_lord | 뇌제 | chain | dmg:30, spd:1.0, rng:130, chain:8, decay:0.85 |
| flame+flame | inferno | 업화 | aoe_instant | dmg:6, spd:1.2, rng:110, splash:65, burn:10/4s |
| rock+rock | quake | 지진파 | splash | dmg:80, spd:3.5, rng:90, splash:50, slow:1.0/0.5s |
| poison+poison | plague | 역병의 근원 | aoe_instant | dmg:4, spd:1.8, rng:140, splash:80, poison:8/6s, armor:-50% |
| wind+wind | typhoon | 대태풍 | aoe_instant | dmg:8, spd:2.0, rng:130, splash:70, push:120, targets:6 |
| light+light | solar_burst | 태양 폭발 | aoe_instant | dmg:55, spd:2.5, rng:120, splash:110 |
| dragon+dragon | ancient_dragon | 고대 용왕 | splash | dmg:90, spd:2.5, rng:180, splash:100, burn:12/4s, poison:10/6s |

#### 이종 조합 -- archer 관련 (8종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| archer+mage | arcane_archer | 마법 화살사 | splash | dmg:18, spd:1.0, rng:130, splash:45 |
| archer+ice | cryo_sniper | 냉동 저격수 | single | dmg:15, spd:1.2, rng:150, slow:1.0/1.5s |
| archer+lightning | shock_arrow | 전격 화살 | chain | dmg:14, spd:0.9, rng:130, chain:3, decay:0.8 |
| archer+flame | fire_arrow | 화염 화살 | dot_single | dmg:12, spd:0.9, rng:120, burn:6/4s |
| archer+rock | armor_pierce | 철갑 화살 | single | dmg:40, spd:1.4, rng:130, armorPiercing |
| archer+poison | venom_shot | 독화살 | dot_single | dmg:8, spd:1.0, rng:130, poison:5/5s, armor:-20% |
| archer+wind | gale_arrow | 폭풍 화살 | single | dmg:10, spd:1.0, rng:130, push:100 |
| archer+light | holy_arrow | 신성 화살 | piercing_beam | dmg:22, spd:1.4, rng:600 |

#### 이종 조합 -- mage 관련 (7종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| ice+mage | frost_mage | 서리 술사 | splash | dmg:28, spd:2.0, rng:110, splash:55, slow:0.35/2.0s |
| lightning+mage | storm_mage | 폭풍 마법사 | splash | dmg:35, spd:1.8, rng:115, splash:50 |
| flame+mage | pyromancer | 화염 술사 | splash | dmg:30, spd:1.8, rng:110, splash:55, burn:6/3s |
| mage+rock | gravity_mage | 중력 마법사 | splash | dmg:40, spd:2.5, rng:100, splash:50, slow:1.0/0.4s |
| mage+poison | toxic_mage | 독기 술사 | aoe_instant | dmg:20, spd:2.0, rng:120, splash:65, poison:5/5s, armor:-20% |
| mage+wind | vacuum_mage | 진공 마법사 | splash | dmg:25, spd:2.2, rng:110, splash:55, push:60 |
| light+mage | radiant_mage | 성광 마법사 | splash | dmg:32, spd:2.0, rng:115, splash:60, burn:4/2s |

#### 이종 조합 -- ice 관련 (6종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| ice+lightning | thunder_frost | 전격 빙결 | chain | dmg:12, spd:1.4, rng:115, chain:4, decay:0.7, slow:0.6/1.5s |
| flame+ice | cryo_flame | 냉열 교차 | dot_single | dmg:10, spd:1.4, rng:110, burn:5/3s, slow:0.3/2.0s |
| ice+rock | glacier | 빙산 | splash | dmg:35, spd:2.8, rng:95, splash:45, slow:1.0/0.6s |
| ice+poison | frost_venom | 동상 독 | aoe_instant | dmg:6, spd:1.8, rng:125, splash:65, slow:0.4/2.5s, poison:4/4s |
| ice+wind | blizzard | 빙풍 | aoe_instant | dmg:5, spd:2.0, rng:120, splash:70, slow:0.45/2.5s, push:50 |
| ice+light | holy_ice | 성빙 | piercing_beam | dmg:16, spd:1.6, rng:600, slow:0.35/2.0s |

#### 이종 조합 -- lightning 관련 (5종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| flame+lightning | thunder_fire | 벼락불 | chain | dmg:22, spd:1.2, rng:125, chain:5, decay:0.7, burn:5/3s |
| lightning+rock | thunder_strike | 천둥 강타 | chain | dmg:28, spd:1.3, rng:125, chain:4, decay:0.7, armorPiercing |
| lightning+poison | toxic_shock | 독전기 | chain | dmg:18, spd:1.2, rng:120, chain:4, decay:0.7, poison:3/4s, armor:-15% |
| lightning+wind | storm_bolt | 폭풍 전격 | chain | dmg:16, spd:1.3, rng:130, chain:4, decay:0.7, push:70 |
| light+lightning | holy_thunder | 신성 번개 | chain | dmg:25, spd:1.5, rng:130, chain:5, decay:0.7 |

#### 이종 조합 -- flame 관련 (4종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| flame+rock | magma_shot | 용암탄 | splash | dmg:38, spd:2.8, rng:95, splash:40, burn:7/3s |
| flame+poison | venom_fire | 맹독 화염 | dot_single | dmg:7, spd:1.6, rng:110, burn:7/4s, poison:4/4s |
| flame+wind | fire_storm | 화염 폭풍 | aoe_instant | dmg:7, spd:1.8, rng:115, splash:55, burn:6/3s, push:45 |
| flame+light | solar_flame | 태양광 화염 | piercing_beam | dmg:20, spd:1.6, rng:600, burn:6/3s |

#### 이종 조합 -- rock 관련 (3종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| poison+rock | toxic_boulder | 독암 | aoe_instant | dmg:25, spd:2.5, rng:105, splash:55, poison:5/5s, armorPiercing |
| rock+wind | stone_gale | 바위 폭풍 | splash | dmg:45, spd:3.0, rng:90, splash:45, slow:1.0/0.4s, push:60 |
| light+rock | holy_stone | 성광 바위 | piercing_beam | dmg:30, spd:2.0, rng:600, armorPiercing |

#### 이종 조합 -- poison 관련 (2종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| poison+wind | toxic_gale | 독풍 | aoe_instant | dmg:4, spd:2.0, rng:130, splash:75, poison:4/5s, armor:-20%, push:40 |
| light+poison | purge_venom | 정화의 독 | piercing_beam | dmg:16, spd:1.8, rng:600, poison:4/4s, armor:-20% |

#### 이종 조합 -- wind 관련 (1종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| light+wind | radiant_gale | 성광 폭풍 | piercing_beam | dmg:18, spd:1.8, rng:600, push:60 |

#### 이종 조합 -- dragon 관련 (9종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| archer+dragon | dragon_rider | 용기병 | splash | dmg:45, spd:2.0, rng:165, splash:75, burn:6/3s |
| dragon+mage | dragon_mage | 용마법사 | splash | dmg:55, spd:2.5, rng:155, splash:85, burn:8/3s |
| dragon+ice | frost_dragon | 빙룡 | aoe_instant | dmg:30, spd:2.5, rng:160, splash:85, slow:0.5/2.5s |
| dragon+lightning | thunder_dragon | 뇌룡 | chain | dmg:40, spd:2.0, rng:155, chain:5, decay:0.7, burn:6/3s |
| dragon+flame | inferno_dragon | 업화룡 | splash | dmg:52, spd:2.5, rng:165, splash:90, burn:14/5s |
| dragon+rock | stone_dragon | 석룡 | splash | dmg:70, spd:2.8, rng:155, splash:80, armorPiercing |
| dragon+poison | venom_dragon | 독룡 | aoe_instant | dmg:35, spd:2.5, rng:165, splash:90, poison:12/6s, maxStacks:3 |
| dragon+wind | storm_dragon | 폭풍룡 | splash | dmg:48, spd:2.5, rng:165, splash:85, burn:8/3s, push:60 |
| dragon+light | holy_dragon | 성룡 | piercing_beam | dmg:40, spd:2.2, rng:600, burn:8/3s |

### 3티어 합성 타워 30종

T2+T2 또는 T2+T1 조합으로 30종의 T3 타워를 생성할 수 있다. 신규 attackType 없이 기존 효과의 강화 조합만 사용.

#### T2+T2 조합 (12종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| ancient_dragon+thunder_lord | thunder_wyrm_king | 용뇌황제 | chain | dmg:65, spd:1.5, rng:190, chain:10, decay:0.85, burn:20/5s, poison:15/7s |
| ancient_dragon+plague | plague_wyrm | 역병용신 | aoe_instant | dmg:45, spd:2.0, rng:200, splash:130, burn:12/4s, poison:20/8s, armor:-60% |
| ancient_dragon+solar_burst | cosmos_dragon | 창세룡 | aoe_instant | dmg:100, spd:3.0, rng:210, splash:150, burn:15/5s, poison:12/6s |
| quake+stone_dragon | tectonic_dragon | 지각파괴룡 | splash | dmg:130, spd:3.5, rng:160, splash:90, slow:1.0/0.8s, armorPiercing |
| stone_dragon+thunder_strike | adamantine_lightning | 아다만 뇌격룡 | chain | dmg:60, spd:1.5, rng:165, chain:7, decay:0.85, armorPiercing |
| plague+venom_dragon | venom_sovereign | 독황 | aoe_instant | dmg:50, spd:2.0, rng:195, splash:120, poison:25/9s, stacks:4, armor:-70% |
| frost_dragon+zero_field | absolute_frost_domain | 절대빙령역 | aoe_instant | dmg:18, spd:1.5, rng:190, splash:140, slow:0.75/4.5s |
| holy_dragon+solar_burst | celestial_judgment | 천상심판 | piercing_beam | dmg:80, spd:2.0, rng:600, burn:12/4s |
| storm_mage+thunder_dragon | superconductor_mage | 초전도뇌마 | chain | dmg:70, spd:1.8, rng:175, chain:7, decay:0.8, burn:10/4s |
| inferno+pyromancer | grand_pyromancer | 대화염마도사 | aoe_instant | dmg:18, spd:1.5, rng:145, splash:100, burn:22/6s |
| storm_mage+thunder_lord | lightning_tempest | 번개대폭풍 | chain | dmg:55, spd:1.2, rng:165, chain:12, decay:0.9 |
| inferno_dragon+quake | hellquake | 지옥균열 | splash | dmg:115, spd:3.0, rng:170, splash:100, slow:1.0/0.5s, burn:18/5s |

#### T2+T1 조합 (18종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| ancient_dragon+dragon | primal_dragon_lord | 원시용왕 | splash | dmg:140, spd:2.5, rng:200, splash:120, burn:18/6s, poison:15/7s |
| flame+inferno_dragon | molten_hell | 용화지옥 | aoe_instant | dmg:14, spd:1.8, rng:155, splash:110, burn:28/7s |
| rock+stone_dragon | iron_dragon | 철갑룡 | splash | dmg:115, spd:2.8, rng:170, splash:100, armorPiercing |
| frost_dragon+ice | eternal_blizzard | 영구동설 | aoe_instant | dmg:30, spd:2.0, rng:185, splash:130, slow:0.85/4.0s |
| lightning+thunder_dragon | storm_deity | 뇌신 | chain | dmg:75, spd:1.8, rng:180, chain:8, decay:0.85, burn:10/4s |
| poison+venom_dragon | great_poison_king | 독제왕 | aoe_instant | dmg:40, spd:2.0, rng:190, splash:130, poison:22/8s, stacks:3, armor:-50% |
| storm_dragon+wind | wind_dragon_king | 풍신룡왕 | splash | dmg:80, spd:2.0, rng:190, splash:115, burn:12/4s, push:100 |
| holy_dragon+light | divine_sun_ray | 태양성룡포 | piercing_beam | dmg:70, spd:2.0, rng:600, burn:14/5s |
| dragon_mage+mage | arcane_dragon_sage | 용마도사 | splash | dmg:95, spd:2.5, rng:175, splash:110, burn:14/5s |
| archer+dragon_rider | sky_lancer | 천룡창기 | splash | dmg:75, spd:1.8, rng:190, splash:100, burn:10/4s |
| plague+poison | death_miasma | 사령역병 | aoe_instant | dmg:10, spd:1.8, rng:170, splash:120, poison:16/8s, armor:-55% |
| lightning+thunder_lord | thunderstorm_king | 천뢰지배자 | chain | dmg:50, spd:1.0, rng:175, chain:12, decay:0.9 |
| light+solar_burst | solar_cannon | 태양포 | aoe_instant | dmg:95, spd:2.5, rng:170, splash:140 |
| typhoon+wind | great_typhoon | 거대태풍신 | aoe_instant | dmg:15, spd:1.8, rng:180, splash:110, push:180, targets:10 |
| quake+rock | earth_shatterer | 대지파괴자 | splash | dmg:145, spd:3.2, rng:110, splash:70, slow:1.0/0.8s |
| ice+zero_field | permafrost | 만년설원 | aoe_instant | dmg:8, spd:1.2, rng:175, splash:130, slow:0.8/4.0s |
| holy_thunder+light | sacred_judgement_beam | 신성심판광 | chain | dmg:55, spd:1.5, rng:160, chain:8, decay:0.85 |
| mage+overload_mage | arcane_cannon | 마법대포 | splash | dmg:110, spd:3.2, rng:135, splash:100 |

### T3 타워 공격 타입별 분포

| 공격 타입 | 수량 | 타워 ID |
|---|---|---|
| chain | 8 | thunder_wyrm_king, adamantine_lightning, superconductor_mage, lightning_tempest, storm_deity, thunderstorm_king, sacred_judgement_beam |
| aoe_instant | 13 | plague_wyrm, cosmos_dragon, venom_sovereign, absolute_frost_domain, grand_pyromancer, molten_hell, eternal_blizzard, great_poison_king, death_miasma, solar_cannon, great_typhoon, permafrost |
| splash | 7 | tectonic_dragon, hellquake, primal_dragon_lord, iron_dragon, wind_dragon_king, arcane_dragon_sage, sky_lancer, earth_shatterer, arcane_cannon |
| piercing_beam | 2 | celestial_judgment, divine_sun_ray |

### 4티어 합성 타워 12종

T3+T1, T3+T2, T3+T3 조합으로 12종의 T4 타워를 생성할 수 있다. 보라색 테두리(0xa29bfe) 표시.

#### T3+T1 조합 (6종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| archer+cosmos_dragon | void_sniper | 허공 저격자 | chain | dmg:180, spd:1.0, rng:230, chain:12, decay:0.9, burn:20/6s, poison:15/8s |
| primal_dragon_lord+wind | annihilation_gale | 소멸 폭풍신 | aoe_instant | dmg:90, spd:1.5, rng:240, splash:180, burn:20/7s, push:140/12 |
| flame+hellquake | magma_core | 마그마 핵 | aoe_instant | dmg:180, spd:2.5, rng:200, splash:130, burn:50/8s |
| absolute_frost_domain+ice | glacial_epoch | 빙하 시대 | aoe_instant | dmg:40, spd:1.2, rng:230, splash:180, slow:0.95/6.0s |
| poison+venom_sovereign | apex_toxin | 독점 지배자 | aoe_instant | dmg:60, spd:1.8, rng:240, splash:160, poison:40/12s, stacks:5, armor:-80% |
| celestial_judgment+light | radiant_ruin | 성광 붕괴 | piercing_beam | dmg:160, spd:1.8, rng:600, burn:20/6s |

#### T3+T2 조합 (3종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| thunder_lord+thunder_wyrm_king | storm_dominion | 폭풍 지배신 | chain | dmg:120, spd:1.0, rng:220, chain:16, decay:0.9, burn:25/6s |
| lightning_tempest+typhoon | maelstrom_herald | 회오리 전령 | aoe_instant | dmg:25, spd:1.5, rng:220, splash:140, push:220/14 |
| grand_pyromancer+solar_burst | solar_cremation | 태양 소각로 | aoe_instant | dmg:30, spd:1.2, rng:200, splash:180, burn:45/8s |

#### T3+T3 조합 (3종)

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| earth_shatterer+tectonic_dragon | world_breaker | 세계 파괴자 | splash | dmg:280, spd:3.0, rng:200, splash:110, slow:1.0/1.0s, armorPiercing |
| celestial_judgment+cosmos_dragon | genesis_verdict | 창세 심판 | piercing_beam | dmg:200, spd:2.0, rng:600, burn:25/7s, poison:20/8s |
| plague_wyrm+venom_sovereign | pandemic_sovereign | 역병 군주 | aoe_instant | dmg:60, spd:1.8, rng:250, splash:180, poison:50/14s, stacks:6, armor:-90%, burn:20/6s |

### T4 타워 공격 타입별 분포

| 공격 타입 | 수량 | 타워 ID |
|---|---|---|
| chain | 2 | void_sniper, storm_dominion |
| aoe_instant | 7 | annihilation_gale, magma_core, glacial_epoch, apex_toxin, maelstrom_herald, solar_cremation, pandemic_sovereign |
| splash | 1 | world_breaker |
| piercing_beam | 2 | radiant_ruin, genesis_verdict |

### 5티어 전설 합성 타워 5종

T4+T4 조합으로 5종의 T5 전설 타워를 생성할 수 있다. 무지개 테두리 표시. 극강 스탯과 복합 효과를 보유.

| 조합 키 | ID | 이름 | 공격 타입 | 주요 스탯 |
|---|---|---|---|---|
| genesis_verdict+void_sniper | omega_herald | 오메가 전령 | chain | dmg:350, spd:0.8, rng:600, chain:20, decay:0.92, burn:40/10s, poison:30/12s, armorPiercing |
| pandemic_sovereign+world_breaker | extinction_engine | 소멸 기관 | aoe_instant | dmg:120, spd:1.5, rng:280, splash:220, poison:80/18s, stacks:8, armor:-100%, burn:35/9s |
| glacial_epoch+storm_dominion | absolute_dominion | 절대 지배 | chain | dmg:200, spd:0.8, rng:260, chain:18, decay:0.92, slow:0.9/5.0s, push:180/15 |
| magma_core+solar_cremation | star_forge | 항성 용광로 | aoe_instant | dmg:60, spd:1.0, rng:260, splash:220, burn:100/12s |
| annihilation_gale+maelstrom_herald | void_maelstrom | 공허 소용돌이 | piercing_beam | dmg:150, spd:1.2, rng:600, burn:50/10s, poison:40/12s, push:300, armorPiercing |

### T5 타워 공격 타입별 분포

| 공격 타입 | 수량 | 타워 ID |
|---|---|---|
| chain | 2 | omega_herald, absolute_dominion |
| aoe_instant | 2 | extinction_engine, star_forge |
| piercing_beam | 1 | void_maelstrom |

### 공격 핸들러별 지원 효과

각 공격 타입의 핸들러가 지원하는 추가 효과 목록. 모든 효과는 해당 속성 존재 여부를 `if` 가드로 확인 후 적용하므로, 해당 속성이 없는 T1 타워에는 영향 없음.

| 핸들러 (파일) | 지원 효과 |
|---|---|
| `_hitSingle` (Projectile.js) | slow, pushback, armorReduction |
| `_hitSplash` (Projectile.js) | slow, burn, poison, armorReduction, pushback |
| `_hitDotSingle` (Projectile.js) | burn, poison, slow, armorReduction |
| `_applyAoeInstant` (GameScene.js) | slow, burn, poison, armorReduction, pushback |
| `_applyChain` (GameScene.js) | slow, burn, poison, armorReduction, pushback |
| `_applyBeam` (GameScene.js) | burn, slow, poison, armorReduction, pushback |

### T2 타워 공격 타입별 분포

| 공격 타입 | 수량 | 타워 ID |
|---|---|---|
| single | 4 | rapid_archer, cryo_sniper, armor_pierce, gale_arrow |
| splash | 18 | overload_mage, quake, arcane_archer, frost_mage, storm_mage, pyromancer, gravity_mage, vacuum_mage, radiant_mage, glacier, magma_shot, stone_gale, dragon_rider, dragon_mage, inferno_dragon, stone_dragon, storm_dragon, ancient_dragon |
| aoe_instant | 13 | zero_field, inferno, plague, typhoon, solar_burst, toxic_mage, frost_venom, blizzard, fire_storm, toxic_boulder, toxic_gale, frost_dragon, venom_dragon |
| chain | 9 | thunder_lord, shock_arrow, thunder_frost, thunder_fire, thunder_strike, toxic_shock, storm_bolt, holy_thunder, thunder_dragon |
| dot_single | 4 | fire_arrow, venom_shot, cryo_flame, venom_fire |
| piercing_beam | 7 | holy_arrow, holy_ice, solar_flame, holy_stone, purge_venom, radiant_gale, holy_dragon |

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
