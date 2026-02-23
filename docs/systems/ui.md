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
