# UI 시스템

HUD, TowerPanel, 일시정지, 게임속도, 통계, 모바일 대응, 빌드/패키징.

## HUD (상단)

- Wave 번호, Gold 잔액, 기지 HP 표시
- HP <= 5 시 빨간 깜빡임
- 웨이브 카운트다운: 대기 시간 잔여량 표시
- 다음 웨이브 적 미리보기 도트 표시
- 음소거 토글 버튼
- Pause 버튼 (||) -- 우측 상단 (x=340, y=20)

## TowerPanel (하단)

- 2줄 5열 40px 타워 버튼 배치 (총 10개)
  - 상단 행: 궁수, 마법사, 얼음, 번개, 불꽃
  - 하단 행: 바위, 독안개, 바람, 빛, 드래곤(잠금)
- 판매(S)/속도(x1) 버튼: 상단 행 우측
- 타워 미선택 시: 타워 그리드만 표시
- Lv.1 타워 선택 시: A/B Lv.2 업그레이드 버튼
- Lv.2 타워 선택 시: A/B Lv.3 업그레이드 버튼
- Lv.3 타워 선택 시: "MAX LEVEL" + 판매 버튼
- 드래곤 잠금: 자물쇠 아이콘, "????G", alpha=0.4, 클릭 불가

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
