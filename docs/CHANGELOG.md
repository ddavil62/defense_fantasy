# Fantasy Tower Defense 변경 이력

모든 주요 변경사항을 날짜순으로 기록한다.

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
