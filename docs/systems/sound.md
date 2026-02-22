# 사운드 시스템

Web Audio API 프로시저럴 사운드. 외부 오디오 파일 없음.

## SFX (8종)

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

## 기술 구현

- `SoundManager.js` (Web Audio API)
- AudioContext 지연 초기화 (브라우저 자동재생 정책 대응)
- SFX 동시 재생 제한 (hit: 3, kill: 2)
- 프로시저럴 합성: OscillatorNode + GainNode로 런타임 생성
