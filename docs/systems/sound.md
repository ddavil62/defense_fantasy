# 사운드 시스템

Web Audio API 프로시저럴 사운드. 외부 오디오 파일 없음.

## SFX (11종)

| SFX | 트리거 | 비고 |
|---|---|---|
| fire | 타워 발사 | 타워 타입별 음색 구분 |
| hit | 적 피격 | 동시 재생 제한 3 |
| kill | 적 사망 | 동시 재생 제한 2 |
| kill_boss | 보스 사망 | 대형 링 이펙트 동반 |
| boss_appear | 보스 등장 | 카메라 쉐이크 + 경고 텍스트 동반 |
| base_hit | 기지 피격 | 빨간 플래시 이펙트 동반 |
| wave_clear | 웨이브 클리어 | 보너스 Gold 텍스트 동반 |
| game_over | 게임 오버 | 결과 패널 표시 |
| merge_discovery | 신규 합성 발견 | GameScene 합성 시 첫 발견 |
| diamond_reward | 다이아 보상 | MergeCodexScene 보상 수령 |
| map_clear_fanfare | 맵 클리어 | MapClearScene 진입 즉시 재생. 5레이어 합성(멜로디+화음+베이스+sparkle x2), 약 2.2초 |

## BGM (3종)

| BGM | 키/BPM | 사용 씬 |
|---|---|---|
| menu | C minor, BPM 60 (아르페지오) | MenuScene |
| battle | D minor, BPM 120 | GameScene (일반 웨이브) |
| boss | B minor, BPM 160 | GameScene (보스 웨이브) |

- 상황별 BGM 자동 전환 (battle ↔ boss)
- 씬 전환 시 BGM 정지/전환

## 볼륨 & 음소거

- SFX/BGM 개별 볼륨 조절
- 음소거 토글 (HUD 버튼, 메뉴 버튼)
- Pause 오버레이에서 SFX/BGM 슬라이더 조절
- 볼륨 설정 localStorage 저장 (`SOUND_SAVE_KEY`)

## 백그라운드 전환 처리

앱이 백그라운드로 전환되면 BGM을 자동 일시정지하고, 포그라운드 복귀 시 이전 BGM을 재개한다.

### 동작 흐름

```
[홈버튼 누름]
  -> document.visibilitychange (hidden = true)
  -> _bgmIntervalId가 활성(non-null)이면 _bgmIdBeforeBackground에 현재 BGM ID 저장
  -> pauseBgm(): clearInterval + AudioContext.suspend()

[앱 복귀]
  -> document.visibilitychange (hidden = false)
  -> _bgmIdBeforeBackground가 있으면 resumeBgm() 호출
  -> AudioContext.resume() -> playBgm(bgmId) (처음 노트부터 재시작)
  -> _bgmIdBeforeBackground = null
```

### 주요 메서드

| 메서드 | 구분 | 동작 |
|---|---|---|
| `pauseBgm()` | public | 스케줄러(setInterval) 중단 + AudioContext suspend. `_currentBgmId` 유지 |
| `resumeBgm(bgmId)` | public | AudioContext resume 후 playBgm() 호출. `.then()` 콜백에 `document.hidden` 가드 |
| `_initVisibilityHandler()` | private | constructor에서 호출. visibilitychange 이벤트 등록 |

### `pauseBgm()` vs `stopBgm()`

| 항목 | `pauseBgm()` | `stopBgm()` |
|---|---|---|
| 스케줄러 중단 | O | O |
| 활성 노드 정지 | X (AudioContext suspend로 자연 정지) | O (즉시 stop 또는 페이드아웃) |
| `_currentBgmId` 초기화 | X (유지) | O (null로 설정) |
| AudioContext suspend | O | X |
| 용도 | 백그라운드 전환 시 임시 정지 | 씬 전환/일시정지 시 완전 정지 |

### 인게임 일시정지 연동

- `GameScene._pauseGame()`에서 `stopBgm(false)` 호출 -> `_currentBgmId` = null, `_bgmIntervalId` = null
- 이 상태에서 백그라운드 전환 시 visibility handler가 `_bgmIntervalId` null 감지 -> `_bgmIdBeforeBackground` 저장 안 함
- 복귀 시 BGM 재시작 없음 (2중 방어)
- `_resumeGame()`에서 `_bgmIdBeforePause`로 BGM 복원

### 제약사항

- `playBgm()`은 항상 처음 노트부터 시작 (재생 위치 복원 불가)
- `AudioContext.suspend()`는 SFX도 함께 일시정지 (동일 컨텍스트 공유)
- `AudioContext.resume()`은 비동기 -- `.then()` 콜백에서 `document.hidden` 재확인하여 레이스 컨디션 방지

## 기술 구현

- `SoundManager.js` (Web Audio API)
- AudioContext 지연 초기화 (브라우저 자동재생 정책 대응)
- SFX 동시 재생 제한 (hit: 3, kill: 2)
- 프로시저럴 합성: OscillatorNode + GainNode로 런타임 생성
- 백그라운드 전환: `document.visibilitychange` 이벤트 기반 BGM 자동 일시정지/재개
