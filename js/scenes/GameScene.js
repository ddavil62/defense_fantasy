/**
 * @fileoverview GameScene - 타워 디펜스 핵심 게임플레이 씬.
 * 맵 렌더링, 타워 배치/머지/강화/판매, 적 스폰/이동/피격, 투사체/AoE/체인/빔 전투,
 * 웨이브 진행, 분열(splitter) 적 처리, 게임오버 판정, 일시정지/골드싱크 오버레이,
 * 사운드(SFX/BGM) 통합, 보스 등장 연출 등 게임 루프 전반을 관리한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, GRID_COLS, GRID_ROWS,
  HUD_HEIGHT, PANEL_Y, CELL_SIZE,
  TOWER_STATS, ENEMY_STATS,
  INITIAL_GOLD, BASE_HP, MAX_BASE_HP,
  VISUALS, COLORS,
  pixelToGrid, gridToPixel,
  SPEED_NORMAL,
  META_UPGRADE_CONFIG,
  getMetaBaseHP, getMetaMaxBaseHP,
  getMetaInitialGold, getMetaWaveBonusMultiplier,
  calcHpRecoverCost, HP_RECOVER_AMOUNT,
  CONSUMABLE_ABILITIES,
  getMergeResult, MERGE_RECIPES, MERGED_TOWER_STATS, SAVE_KEY,
  BTN_SELL, BTN_META, BTN_DANGER, BTN_PRIMARY, BTN_BACK,
  getEnemySpriteKey,
  AD_REVIVE_HP_RATIO,
  AD_GOLD_BOOST_MULTIPLIER,
  MERGE_COST,
  calcDrawCost,
} from '../config.js';

// ── 매니저 ──
import { MapManager } from '../managers/MapManager.js';
import { WaveManager } from '../managers/WaveManager.js';
import { GoldManager } from '../managers/GoldManager.js';
import { ProjectilePool } from '../managers/ProjectilePool.js';
// ── UI ──
import { HUD } from '../ui/HUD.js';
import { TowerPanel } from '../ui/TowerPanel.js';
// ── 엔티티 ──
import { Tower } from '../entities/Tower.js';
import { Enemy } from '../entities/Enemy.js';
// ── 유틸 ──
import { t } from '../i18n.js';
// ── 데이터 ──
import { CLASSIC_MAP } from '../data/maps.js';
import { getWorldByMapId } from '../data/worlds.js';

/**
 * 타워 디펜스 핵심 게임플레이 씬.
 * 맵 위에 타워를 배치하고, 웨이브별 적을 스폰하여 전투를 진행하며,
 * 기지 HP가 0이 되면 게임오버를 처리한다.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * 씬 상태 초기화. 매 게임 시작(scene.start)마다 호출되어
   * 모든 런타임 변수를 기본값으로 리셋한다.
   * @param {object} [data={}] - 씬 전환 시 전달된 데이터
   * @param {import('../data/maps.js').MapData} [data.mapData] - 맵 데이터 (기본: CLASSIC_MAP)
   * @param {string} [data.gameMode='endless'] - 게임 모드 ('endless' | 'campaign')
   * @param {boolean} [data.revived=false] - 광고 부활 여부 (true면 재 게임오버 시 부활 불가)
   * @param {number} [data.startWave=0] - 부활 시 재개할 웨이브 번호
   * @param {boolean} [data.goldBoostActive=false] - 광고 골드 2배 부스트 활성 여부
   * @param {boolean} [data.clearBoostActive=false] - 광고 클리어 보상 2배 활성 여부
   */
  init(data = {}) {
    /** @type {import('../data/maps.js').MapData} 현재 맵 데이터 */
    this.mapData = data.mapData || CLASSIC_MAP;

    /** @type {string} 게임 모드 ('endless' = 엔드리스, 'campaign' = 캠페인) */
    this.gameMode = data.gameMode || 'endless';

    /** @type {boolean} 광고 부활 여부 (판당 1회, true이면 재 게임오버 시 부활 불가) */
    this.revived = data.revived || false;

    /** @type {number} 부활 시 재개할 웨이브 번호 (0이면 일반 시작) */
    this._reviveStartWave = data.startWave || 0;

    /** @type {boolean} 광고 골드 2배 부스트 활성 여부 (모든 골드 획득에 AD_GOLD_BOOST_MULTIPLIER 적용) */
    this.goldBoostActive = data.goldBoostActive || false;

    /** @type {boolean} 광고 클리어 보상 2배 활성 여부 (MapClearScene에 전달) */
    this.clearBoostActive = data.clearBoostActive || false;

    /** @type {number|null} 총 웨이브 수 (캠페인: 유한값, 엔드리스: null) */
    this.totalWaves = isFinite(this.mapData.totalWaves) ? this.mapData.totalWaves : null;

    /** @type {Tower[]} 현재 맵에 배치된 타워 목록 */
    this.towers = [];

    /** @type {Enemy[]} 현재 살아있는 적 목록 */
    this.enemies = [];

    /** @type {Projectile[]} 활성 투사체 목록 */
    this.projectiles = [];

    /** @type {number} 현재 기지 HP (create()에서 메타 업그레이드 반영) */
    this.baseHP = BASE_HP;

    /** @type {number} 최대 기지 HP (create()에서 메타 업그레이드 반영) */
    this.maxBaseHP = MAX_BASE_HP;

    /** @type {number} 게임 속도 배율 (1x, 2x, 3x) */
    this.gameSpeed = SPEED_NORMAL;

    /** @type {boolean} 게임오버 플래그 */
    this.isGameOver = false;

    /** @type {number} 누적 처치 수 */
    this.totalKills = 0;

    /** @type {Phaser.GameObjects.Graphics|null} 기지 피격 시 빨간 플래시 오버레이 */
    this.damageFlash = null;

    /** @type {object[]} 분열(splitter) 적 사망 시 생성할 자식 적 대기열 */
    this._splitSpawnQueue = [];

    /** @type {boolean} 일시정지 상태 플래그 */
    this.isPaused = false;

    /** @type {number} 일시정지 직전 저장된 게임 속도 (Resume 시 복원) */
    this.gameSpeed_saved = SPEED_NORMAL;

    /** @type {string|null} 일시정지 직전 재생 중이던 BGM ID (Resume 시 복원) */
    this._bgmIdBeforePause = null;

    /** @type {Phaser.GameObjects.Container|null} 일시정지 오버레이 컨테이너 */
    this.pauseOverlay = null;

    /** @type {boolean} 현재 웨이브에서 보스 등장 연출이 이미 트리거되었는지 여부 */
    this._bossAppearTriggered = false;

    /** @type {object} 게임 내 통계 (게임오버 화면에서 표시) */
    this.gameStats = {
      towersPlaced: 0,
      towersUpgraded: 0,
      towersSold: 0,
      goldEarned: 0,
      goldSpent: 0,
      damageDealt: 0,
      killsByType: {},     // 적 타입별 처치 수
      killsByTower: {},    // 타워 타입별 처치 수
      bossesKilled: 0,
      baseDamageTaken: 0,
      wavesCleared: 0,
      peakGold: 0,         // 게임 중 최고 보유 골드
    };

    /** @type {Phaser.GameObjects.Graphics|null} 타워 배치 시 사거리 미리보기 원 */
    this.rangePreviewGraphics = null;

    // ── 골드 싱크 상태 ──
    /** @type {number} HP 회복 사용 횟수 (사용할수록 비용 증가) */
    this.hpRecoverUseCount = 0;

    /**
     * @type {object} 소모품 능력 상태.
     * 각 키(slowAll, goldRain, lightning)마다 사용 횟수, 쿨다운, 활성 여부, 남은 지속시간을 추적한다.
     */
    this.consumableState = {
      slowAll: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
      goldRain: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
      lightning: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
    };

    /** @type {Phaser.GameObjects.Container|null} 신규 발견 축하 팝업 컨테이너 */
    this._discoveryPopup = null;
  }

  /**
   * 현재 월드의 적 스프라이트를 사전 로드한다.
   * 월드 ID에 맞는 8종 적 이미지를 assets/enemy/ 에서 로드한다.
   */
  preload() {
    const world = getWorldByMapId(this.mapData.id);
    /** @type {string|null} 현재 월드 ID (바이옴 스프라이트 결정용, 알려진 월드만) */
    this.currentWorldId = world ? world.id : null;

    if (this.currentWorldId) {
      // 월드별 적 스프라이트 로드
      const enemyTypes = Object.keys(ENEMY_STATS);
      for (const type of enemyTypes) {
        const key = getEnemySpriteKey(type, this.currentWorldId);
        if (key && !this.textures.exists(key)) {
          this.load.image(key, `assets/enemy/${key}.png`);
        }
      }

      // 월드별 배경 이미지 로드
      const bgKey = `bg_${this.currentWorldId}`;
      if (!this.textures.exists(bgKey)) {
        this.load.image(bgKey, `assets/bg/${bgKey}.png`);
      }
    }
  }

  /**
   * 게임 오브젝트 생성 및 매니저 초기화.
   * 세이브 데이터에서 메타 업그레이드를 불러오고, 맵/HUD/타워 패널/골드싱크 UI를 구성하며,
   * 입력 핸들러를 등록한 뒤 첫 웨이브를 시작한다.
   */
  create() {
    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 씬 종료(shutdown) 시 리소스 정리 핸들러 등록
    this.events.on('shutdown', this._cleanup, this);

    // MergeCodexScene에서 복귀 시 일시정지 오버레이를 다시 표시하기 위한 wake 핸들러
    this.events.on('wake', this._onWake, this);

    // ── 세이브 데이터에서 메타 업그레이드 로드 ──
    const saveData = this.registry.get('saveData');
    /** @type {object} 타워별 메타 업그레이드 선택 정보 (tier1~3) */
    this.towerMetaUpgrades = saveData?.towerUpgrades || {};
    /** @type {object} 유틸리티 업그레이드 티어 정보 (기지 HP, 시작 골드 등) */
    this.utilityUpgrades = saveData?.utilityUpgrades || {};
    /** @type {string[]} 해금된 타워 타입 목록 */
    this.unlockedTowers = saveData?.unlockedTowers || [];

    /** @type {import('../managers/SoundManager.js').SoundManager|null} 사운드 매니저 참조 */
    this.soundManager = this.registry.get('soundManager') || null;

    // ── 유틸리티 메타 업그레이드 적용 (기지 HP, 시작 골드) ──
    const metaBaseHP = getMetaBaseHP(this.utilityUpgrades);
    const metaMaxHP = getMetaMaxBaseHP(this.utilityUpgrades);
    this.maxBaseHP = metaMaxHP;

    // 부활 시 기지 HP를 최대 HP의 절반으로 설정
    if (this.revived && this._reviveStartWave > 0) {
      this.baseHP = Math.ceil(this.maxBaseHP * AD_REVIVE_HP_RATIO);
    } else {
      this.baseHP = metaBaseHP;
    }

    const metaGold = getMetaInitialGold(this.utilityUpgrades);

    // ── 매니저 초기화 ──
    this.mapManager = new MapManager(this, this.mapData);
    this.goldManager = new GoldManager(metaGold);
    this.waveManager = new WaveManager(this, {
      totalWaves: this.mapData.totalWaves,
      waveOverrides: this.mapData.waveOverrides,
    });

    // 투사체 오브젝트 풀 (초기 용량 30, 부족 시 자동 확장)
    this.projectilePool = new ProjectilePool(this, 30);

    // ── 맵 렌더링 ──
    this.mapManager.renderMap();

    // ── HUD 생성 및 초기값 표시 ──
    this.hud = new HUD(this);
    this.hud.updateGold(this.goldManager.getGold());
    this.hud.updateHP(this.baseHP, this.maxBaseHP);
    this.hud.updateWave(1, this.totalWaves);

    // 일시정지 버튼 및 HUD 음소거 버튼 생성
    this._createPauseButton();

    // ── 타워 패널 생성 (하단 UI) ──
    this.towerPanel = new TowerPanel(this, {
      onTowerSelect: (type) => this._onTowerTypeSelect(type),
      onMerge: (towerA, towerB) => this._onTowerMerge(towerA, towerB),
      onEnhance: (tower) => this._onTowerEnhance(tower),
      onSell: (tower) => this._onTowerSell(tower),
      onSpeedToggle: (speed) => this._onSpeedToggle(speed),
      onDeselect: () => this._onDeselect(),
      onMove: (tower, col, row) => this._onTowerMove(tower, col, row),
      onDragStart: () => this.mapManager.showBuildableHighlights(),
      onDragEnd: () => this.mapManager.clearHighlights(),
      getTowers: () => this.towers,
      unlockedTowers: this.unlockedTowers,
    });
    this.towerPanel.updateAffordability(this.goldManager.getGold());

    // ── 골드 싱크 UI (HP 회복 버튼 + 소모품 능력 버튼) ──
    this._createHpRecoverButton();
    this._createConsumableButtons();

    // 기지 피격 플래시 오버레이 (초기 투명, 피격 시 빨간색으로 점멸)
    this.damageFlash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0xff0000
    ).setAlpha(0).setDepth(40);

    // 타워 배치 시 사거리 미리보기용 그래픽스 (매 프레임 재활용)
    this.rangePreviewGraphics = this.add.graphics();
    this.rangePreviewGraphics.setDepth(5);

    // ── 입력 핸들러 등록 ──
    this.input.on('pointerdown', (pointer) => this._onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this._onPointerMove(pointer));
    this.input.on('pointerup', (pointer) => this._onPointerUp(pointer));

    // 전투 BGM 재생 시작
    if (this.soundManager) {
      this.soundManager.playBgm('battle');
    }

    // 캠페인 모드: 맵 클리어 이벤트 리스너 (WaveManager에서 발행)
    this.events.on('mapClear', (clearData) => this._onMapClear(clearData));

    // 웨이브 시작 (부활 시 해당 라운드부터 재개)
    if (this.revived && this._reviveStartWave > 0) {
      this.waveManager.currentWave = this._reviveStartWave;
      this.waveManager._announceWave();
    } else {
      this.waveManager.startFirstWave();
    }
  }

  /**
   * 메인 게임 루프. 매 프레임 호출되어 웨이브/타워/투사체/적을 갱신하고
   * HUD와 소모품 쿨다운을 업데이트한 뒤 게임오버 여부를 판정한다.
   * @param {number} time - 게임 시작 이후 총 경과 시간 (ms)
   * @param {number} rawDelta - 이전 프레임과의 시간 차이 (ms, 속도 미적용)
   */
  update(time, rawDelta) {
    if (this.isPaused || this.isGameOver) return;

    // 탭 전환 후 복귀 시 프레임 간 시간이 크게 점프하는 것을 방지 (최대 100ms)
    const cappedRaw = Math.min(rawDelta, 100);
    // 초 단위로 변환하고 게임 속도 배율 적용
    const delta = (cappedRaw / 1000) * this.gameSpeed;

    // 웨이브 매니저 갱신 (적 스폰 타이밍 및 웨이브 전환)
    this.waveManager.update(
      delta,
      this.enemies,
      (enemyData) => this._spawnEnemy(enemyData),
      (bonusGold) => this._onWaveClear(bonusGold),
      this.baseHP,
      this.maxBaseHP
    );

    // 타워 갱신 (타겟팅 및 발사)
    this._updateTowers(delta);

    // 투사체 갱신 (이동 및 적중 판정)
    this._updateProjectiles(delta);

    // 적 갱신 (이동, 사망/기지 도착 처리, 골드 지급)
    this._updateEnemies(delta);

    // 분열 적 자식 스폰 처리 (적 루프 이후에 실행하여 배열 변경 충돌 방지)
    this._processSplitSpawnQueue();

    // ── HUD 갱신 ──
    this.hud.updateGold(this.goldManager.getGold());
    this.hud.updateHP(this.baseHP, this.maxBaseHP);
    this.hud.updateWave(this.waveManager.currentWave, this.totalWaves);
    this.hud.updateBlink(delta);

    // 웨이브 간 휴식 시간 카운트다운 및 다음 웨이브 미리보기 표시
    const breakTime = this.waveManager.getBreakTimeRemaining();
    const preview = breakTime > 0 ? this.waveManager.getNextWavePreview() : null;
    this.hud.updateCountdown(breakTime, preview);

    // 소모품 능력 쿨다운/지속시간 갱신
    this._updateConsumables(delta);

    // 타워 패널 구매 가능 여부 갱신
    this.towerPanel.updateAffordability(this.goldManager.getGold());

    // 기지 HP가 0 이하이면 게임오버
    if (this.baseHP <= 0) {
      this._gameOver();
    }
  }

  // ── 입력 처리 ─────────────────────────────────────────────────

  /**
   * 포인터(터치/마우스) 다운 이벤트 처리.
   * 게임 영역 내 클릭을 그리드 좌표로 변환하여 타워 선택, 배치, 드래그 준비를 수행한다.
   * @param {Phaser.Input.Pointer} pointer - Phaser 포인터 객체
   * @private
   */
  _onPointerDown(pointer) {
    if (this.isGameOver || this.isPaused || this._resumeCooldown) return;
    // 타워 정보 오버레이가 열려있으면 게임 입력 무시 (오버레이가 이벤트 처리)
    if (this.towerPanel && this.towerPanel.isOverlayOpen()) return;

    const { x, y } = pointer;

    // 하단 UI 패널 영역 클릭 무시
    if (y >= PANEL_Y) return;

    // 상단 HUD 영역 클릭 무시
    if (y < HUD_HEIGHT) return;

    // 픽셀 좌표를 그리드(col, row) 좌표로 변환
    const grid = pixelToGrid(x, y);
    const { col, row } = grid;

    // 그리드 범위 밖이면 선택 해제
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      this.towerPanel.clearSelection();
      return;
    }

    // 기존 타워가 있는 셀을 클릭한 경우
    const existingTower = this.mapManager.getTowerAt(col, row);
    if (existingTower) {
      // 사거리 원을 즉시 표시하되, 정보 모달은 pointerup에서 열어
      // 클릭과 드래그를 구분한다
      this._deselectAllTowers();
      existingTower.showRangeCircle();
      this._pendingTowerClick = { tower: existingTower, startX: pointer.x, startY: pointer.y };
      // 강화(enhance)되지 않은 타워만 머지용 드래그 준비
      // (이동 임계값 초과 시 실제 드래그 시작)
      if (existingTower.enhanceLevel === 0 && Object.keys(MERGE_RECIPES).length > 0) {
        this._pendingDrag = { tower: existingTower, startX: pointer.x, startY: pointer.y };
      }
      return;
    }

    // 타워 타입이 선택된 상태에서 빈 셀 클릭 시 배치 시도
    const selectedType = this.towerPanel.getSelectedTowerType();
    if (selectedType) {
      this._attemptPlaceTower(selectedType, col, row);
      return;
    }

    // 아무것도 선택되지 않은 상태에서 빈 공간 클릭 시 모든 선택 해제
    this.towerPanel.clearSelection();
    this._deselectAllTowers();
  }

  /**
   * 타워 패널에서 타워 타입이 선택되었을 때 호출.
   * 기존 타워 선택을 해제하고 건설 가능 셀을 하이라이트 표시한다.
   * @param {string} type - 선택된 타워 타입 키
   * @private
   */
  _onTowerTypeSelect(type) {
    this._deselectAllTowers();
    this.mapManager.showBuildableHighlights();

    // 뽑기로 선택된 타워인 경우 결과 플로팅 텍스트 표시
    if (this.towerPanel._pendingDrawType === type) {
      const towerName = t(`tower.${type}.name`);
      const msg = t('draw.result').replace('{name}', towerName);
      this._showFloatingDrawResult(msg, type);
    }
  }

  /**
   * 뽑기 결과를 화면 상단에 플로팅 텍스트로 1.5초간 표시한다.
   * @param {string} message - 표시할 메시지
   * @param {string} type - 타워 타입 키 (색상 참조용)
   * @private
   */
  _showFloatingDrawResult(message, type) {
    const color = TOWER_STATS[type]?.color || 0xffffff;
    const colorCSS = '#' + color.toString(16).padStart(6, '0');

    const resultText = this.add.text(
      GAME_WIDTH / 2, HUD_HEIGHT + 40,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        fontStyle: 'bold',
        color: colorCSS,
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(55);

    this.tweens.add({
      targets: resultText,
      y: resultText.y - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => resultText.destroy(),
    });
  }

  /**
   * 타워 패널에서 선택 해제 시 호출.
   * 모든 타워 선택과 맵 하이라이트를 제거한다.
   * @private
   */
  _onDeselect() {
    this._deselectAllTowers();
    this.mapManager.clearHighlights();
    // 뽑기 대기 상태 취소 (비용 차감/횟수 증가 없음)
    this.towerPanel.cancelDraw();
  }

  /**
   * 타워를 드래그하여 빈 셀로 이동시킨다.
   * MapManager에서 그리드 위치를 갱신하고, 타워의 좌표/그래픽을 새 위치로 재설정한다.
   * 이동 비용은 무료(골드 차감 없음).
   * @param {Tower} tower - 이동할 타워 인스턴스
   * @param {number} col - 이동 대상 그리드 열
   * @param {number} row - 이동 대상 그리드 행
   * @private
   */
  _onTowerMove(tower, col, row) {
    // MapManager 내부 타워맵 갱신: 기존 셀 비우기 + 새 셀 등록
    this.mapManager.moveTower(tower.col, tower.row, col, row, tower);

    // 타워의 그리드/픽셀 좌표 갱신
    tower.col = col;
    tower.row = row;
    const pos = gridToPixel(col, row);
    tower.x = pos.x;
    tower.y = pos.y;

    // 스프라이트 위치 갱신 (이미지 타워)
    if (tower.sprite) {
      tower.sprite.setPosition(pos.x, pos.y);
    }

    // 사거리 원 숨기기 및 도형 재그리기 (새 좌표 기준)
    tower.hideRangeCircle();
    tower.draw();
    tower.graphics.setAlpha(1);
  }

  /**
   * 배치된 타워를 선택하여 정보 패널을 표시한다.
   * 사거리 원을 보여주고 타워 패널에 상세 정보를 전달한다.
   * @param {Tower} tower - 선택할 타워
   * @private
   */
  _selectPlacedTower(tower) {
    this._deselectAllTowers();
    tower.showRangeCircle();
    this.towerPanel.showTowerInfo(tower);
  }

  /**
   * 모든 타워의 사거리 원을 숨긴다 (선택 해제).
   * @private
   */
  _deselectAllTowers() {
    for (const tower of this.towers) {
      tower.hideRangeCircle();
    }
  }

  /**
   * 지정된 그리드 위치에 타워 배치를 시도한다.
   * 건설 불가 셀이거나 골드가 부족하면 배치 실패 연출을 표시한다.
   * @param {string} type - 타워 타입 키
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @private
   */
  _attemptPlaceTower(type, col, row) {
    if (!this.mapManager.isBuildable(col, row)) {
      this.mapManager.showInvalidPlacement(col, row);
      return;
    }

    // 뽑기 경유 배치인지 판별하여 비용 분기
    const isPendingDraw = this.towerPanel._pendingDrawType === type;
    const cost = isPendingDraw
      ? calcDrawCost(this.towerPanel.drawCount)
      : TOWER_STATS[type].levels[1].cost;

    if (!this.goldManager.canAfford(cost)) {
      this.mapManager.showInvalidPlacement(col, row);
      return;
    }

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    const tower = new Tower(this, type, col, row);
    // 메타 업그레이드(영구 강화)를 새 타워에 적용
    this._applyMetaUpgradesToTower(tower);
    this.towers.push(tower);
    this.mapManager.placeTower(col, row, tower);
    this.gameStats.towersPlaced++;

    // 뽑기 배치 성공 시 횟수 증가
    if (isPendingDraw) {
      this.towerPanel.incrementDrawCount();
    }

    this.towerPanel.clearSelection();
    this.mapManager.clearHighlights();
    // 배치 완료 후 사거리 미리보기 제거
    if (this.rangePreviewGraphics) this.rangePreviewGraphics.clear();
  }

  /**
   * 타워 머지 처리. 드래그한 타워(A)를 대상 타워(B) 위에 놓으면
   * A를 제거하고 B를 머지 결과 타워로 변환한다.
   * @param {Tower} towerA - 드래그된 타워 (제거됨)
   * @param {Tower} towerB - 드롭 대상 타워 (머지 결과로 변환됨)
   * @private
   */
  _onTowerMerge(towerA, towerB) {
    const idA = towerA.mergeId || towerA.type;
    const idB = towerB.mergeId || towerB.type;
    const mergeResult = getMergeResult(idA, idB);
    if (!mergeResult) return;

    // 합성 비용 체크 (밸런스 오버홀: 티어별 골드 비용 부과)
    const mergeCost = MERGE_COST[mergeResult.tier] || 0;
    if (mergeCost > 0 && !this.goldManager.canAfford(mergeCost)) {
      // 드래그로 숨겨진 타워를 복원 (alpha=0 상태 방지)
      if (towerA.graphics) towerA.graphics.setAlpha(1);
      this._showFloatingWarning(t('merge.noGold'));
      return;
    }
    if (mergeCost > 0) {
      this.goldManager.spend(mergeCost);
      this.gameStats.goldSpent += mergeCost;
    }

    // 두 타워의 누적 투자 골드를 합산 (판매가 산정에 사용, 합성 비용 포함)
    const combinedInvested = towerA.totalInvested + towerB.totalInvested + mergeCost;

    // towerB를 머지 결과 타워로 변환
    towerB.totalInvested = combinedInvested;
    towerB.applyMergeResult(mergeResult);

    // 머지된 타워에 메타 업그레이드 재적용
    this._applyMetaUpgradesToTower(towerB);

    // towerA를 맵과 타워 목록에서 제거
    this.mapManager.removeTower(towerA.col, towerA.row);
    this.towers = this.towers.filter(t => t !== towerA);
    towerA.destroy();

    // 머지 레시피 발견을 세이브 데이터에 기록 (도감용)
    this._registerMergeDiscovery(mergeResult.id);

    // 머지된 타워의 사거리만 표시 (오버레이는 열지 않음 — 합성은 정보 조회 의도가 아님)
    this._deselectAllTowers();
    towerB.showRangeCircle();
  }

  /**
   * 머지 발견을 세이브 데이터에 기록한다.
   * 이미 발견된 머지 ID는 중복 추가하지 않으며, localStorage에 즉시 저장한다.
   * 신규 발견 시 축하 팝업을 표시하고 newDiscoveries에도 추가한다.
   * @param {string} mergeId - 발견된 머지 결과 ID
   * @returns {boolean} 신규 발견이면 true, 이미 발견이면 false
   * @private
   */
  _registerMergeDiscovery(mergeId) {
    const saveData = this.registry.get('saveData');
    if (!saveData) return false;
    if (!saveData.discoveredMerges) saveData.discoveredMerges = [];
    if (!saveData.discoveredMerges.includes(mergeId)) {
      saveData.discoveredMerges.push(mergeId);
      if (!saveData.newDiscoveries) saveData.newDiscoveries = [];
      saveData.newDiscoveries.push(mergeId);
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      } catch (e) {
        // localStorage 쓰기 실패 무시 (용량 초과 등)
      }

      // 신규 발견 축하 팝업 표시
      this._showDiscoveryPopup(mergeId);
      return true;
    }
    return false;
  }

  /**
   * 신규 합성 발견 시 축하 오버레이 팝업을 표시한다.
   * 반투명 배경 위에 타워 아이콘, 이름, 티어, "확인" 버튼을 표시한다.
   * 게임은 일시정지하지 않으며, 확인 버튼 또는 배경 클릭 시 닫힌다.
   * @param {string} mergeId - 발견된 합성 타워 ID
   * @private
   */
  _showDiscoveryPopup(mergeId) {
    // 이미 팝업이 열려 있으면 무시
    if (this._discoveryPopup) return;

    // 레시피와 스탯 정보 찾기
    let recipe = null;
    for (const [, r] of Object.entries(MERGE_RECIPES)) {
      if (r.id === mergeId) { recipe = r; break; }
    }
    if (!recipe) return;

    const mergedStats = MERGED_TOWER_STATS[mergeId];

    const container = this.add.container(0, 0).setDepth(95);
    this._discoveryPopup = container;

    // 반투명 배경
    const backdrop = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x000000
    ).setAlpha(0.6).setInteractive();
    container.add(backdrop);

    // 중앙 패널
    const panelW = 280;
    const panelH = 320;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1040)
      .setStrokeStyle(2, 0xffd700)
      .setInteractive(); // 패널 내부 클릭이 배경으로 전파되지 않도록
    container.add(panelBg);

    // 상단 타이틀
    const titleText = this.add.text(panelX, panelY - panelH / 2 + 30, t('discovery.new'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // 타워 아이콘 (큰 사이즈)
    const iconY = panelY - 30;
    const iconTexKey = `tower_${mergeId}`;
    if (this.textures.exists(iconTexKey)) {
      const iconImg = this.add.image(panelX, iconY, iconTexKey)
        .setDisplaySize(80, 80);
      container.add(iconImg);
    } else {
      const circleG = this.add.graphics();
      circleG.fillStyle(recipe.color, 1);
      circleG.fillCircle(panelX, iconY, 36);
      circleG.lineStyle(3, 0xffd700, 1);
      circleG.strokeCircle(panelX, iconY, 36);
      container.add(circleG);
    }

    // 타워 이름
    const nameText = this.add.text(panelX, iconY + 52, recipe.displayName, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(nameText);

    // 티어 배지
    const tierText = this.add.text(panelX, iconY + 74, `T${recipe.tier}`, {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    container.add(tierText);

    // 공격 유형 배지
    if (mergedStats) {
      const atkTypeMap = {
        'single': 'Single', 'splash': 'Splash', 'aoe_instant': 'AoE',
        'chain': 'Chain', 'piercing_beam': 'Beam', 'dot_single': 'DoT',
      };
      const badgeStr = atkTypeMap[mergedStats.attackType] || mergedStats.attackType;
      const badgeText = this.add.text(panelX, iconY + 90, badgeStr, {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#81ecec',
        backgroundColor: '#0d1117',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      container.add(badgeText);
    }

    // 확인 버튼
    const btnY = panelY + panelH / 2 - 40;
    const btnBg = this.add.rectangle(panelX, btnY, 120, 36, BTN_PRIMARY)
      .setStrokeStyle(1, 0xffd700)
      .setInteractive({ useHandCursor: true });
    container.add(btnBg);

    const btnText = this.add.text(panelX, btnY, t('discovery.confirm'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(btnText);

    // 닫기 처리
    const closePopup = () => {
      if (this._discoveryPopup) {
        this._discoveryPopup.destroy();
        this._discoveryPopup = null;
      }
    };

    btnBg.on('pointerdown', closePopup);
    backdrop.on('pointerdown', closePopup);

    // 스케일 애니메이션 (0.8 -> 1.0)
    container.setScale(0.8);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 화면 중앙 상단에 경고 메시지를 떠오르며 표시한다.
   * 1.5초간 위로 떠오르며 페이드아웃된 후 자동 제거된다.
   * @param {string} message - 표시할 경고 메시지
   * @private
   */
  _showFloatingWarning(message) {
    const warnText = this.add.text(
      GAME_WIDTH / 2, HUD_HEIGHT + 40,
      message,
      {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ff4757',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(55);

    // 위로 떠오르며 페이드아웃
    this.tweens.add({
      targets: warnText,
      y: warnText.y - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => warnText.destroy(),
    });
  }

  /**
   * 타워 강화(enhance) 처리. Lv.3 이상 타워에 골드를 소모하여 스탯을 추가 강화한다.
   * @param {Tower} tower - 강화할 타워
   * @private
   */
  _onTowerEnhance(tower) {
    const cost = tower.getEnhanceCost();
    if (cost === null) return;
    if (!this.goldManager.canAfford(cost)) return;

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    tower.enhance();

    // enhance()가 스탯을 직접 수정하므로 메타 업그레이드 재적용 불필요

    // 타워 정보 패널 갱신
    this._selectPlacedTower(tower);
  }

  /**
   * 타워 판매 처리. 투자 골드의 일정 비율을 환불받고 타워를 제거한다.
   * @param {Tower} tower - 판매할 타워
   * @private
   */
  _onTowerSell(tower) {
    const sellPrice = tower.getSellPrice();
    this.goldManager.earn(sellPrice);
    this.gameStats.towersSold++;

    this.mapManager.removeTower(tower.col, tower.row);
    this.towers = this.towers.filter(t => t !== tower);
    tower.destroy();

    this.towerPanel.clearSelection();
    this.mapManager.clearHighlights();
  }

  /**
   * 게임 속도 변경 처리.
   * @param {number} speed - 새 속도 배율 (1, 2, 3)
   * @private
   */
  _onSpeedToggle(speed) {
    this.gameSpeed = speed;
  }

  // ── 엔티티 갱신 ─────────────────────────────────────────────────

  /**
   * 웨이브 데이터를 기반으로 적을 스폰한다.
   * 분열(splitter) 적은 사망 콜백을 등록하고, 보스는 등장 연출을 트리거한다.
   * @param {object} enemyData - 적 생성 데이터 (type, hp, speed, gold, resistance, damage)
   * @private
   */
  _spawnEnemy(enemyData) {
    const path = this.mapManager.getPath();
    const enemy = new Enemy(this, enemyData.type, path, {
      hp: enemyData.hp,
      speed: enemyData.speed,
      gold: enemyData.gold,
      resistance: enemyData.resistance,
      damage: enemyData.damage,
      worldId: this.currentWorldId,
    });

    // 분열 적(splitter)은 사망 시 자식 적을 스폰하는 콜백 등록
    if (enemyData.type === 'splitter') {
      enemy.onSplit = (deadEnemy) => this._onSplitterDeath(deadEnemy);
    }

    this.enemies.push(enemy);

    // 보스 첫 등장 시 연출(BGM 전환, 카메라 흔들림, 경고 텍스트) 트리거
    if ((enemyData.type === 'boss' || enemyData.type === 'boss_armored') && !this._bossAppearTriggered) {
      this._bossAppearTriggered = true;
      this._playBossAppearSequence();
    }
  }

  /**
   * 특정 위치에 자식 적을 스폰한다 (분열 적 사망 시 사용).
   * 부모의 위치와 경로 진행도를 이어받아 경로 중간에서 스폰된다.
   * @param {object} enemyData - 적 생성 데이터 (type, hp, speed, gold)
   * @param {number} x - 스폰 X 위치 (부모 사망 지점)
   * @param {number} y - 스폰 Y 위치
   * @param {number} waypointIndex - 부모의 현재 웨이포인트 인덱스
   * @private
   */
  _spawnChildEnemy(enemyData, x, y, waypointIndex) {
    const path = this.mapManager.getPath();
    const enemy = new Enemy(this, enemyData.type, path, {
      hp: enemyData.hp,
      speed: enemyData.speed,
      gold: enemyData.gold,
      worldId: this.currentWorldId,
    });

    // 부모의 위치에서 시작
    enemy.x = x;
    enemy.y = y;
    enemy.waypointIndex = waypointIndex;

    // 웨이포인트 사이의 보간 위치를 고려한 정확한 경로 진행도 계산
    if (waypointIndex < path.length - 1) {
      const wp1 = path[waypointIndex];
      const wp2 = path[waypointIndex + 1];
      const segDx = wp2.x - wp1.x;
      const segDy = wp2.y - wp1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      const toDx = x - wp1.x;
      const toDy = y - wp1.y;
      const toLen = Math.sqrt(toDx * toDx + toDy * toDy);
      // 현재 세그먼트에서의 비율 (0~1)
      const fraction = segLen > 0 ? Math.min(1, toLen / segLen) : 0;
      enemy.pathProgress = (waypointIndex + fraction) / (path.length - 1);
    } else {
      enemy.pathProgress = waypointIndex / (path.length - 1);
    }

    this.enemies.push(enemy);
  }

  /**
   * 분열(splitter) 적 사망 시 자식 적 스폰을 대기열에 등록한다.
   * 실제 스폰은 _processSplitSpawnQueue()에서 적 갱신 루프 이후에 처리된다.
   * @param {Enemy} deadEnemy - 사망한 분열 적
   * @private
   */
  _onSplitterDeath(deadEnemy) {
    const splitCount = ENEMY_STATS.splitter.splitCount || 3;
    for (let i = 0; i < splitCount; i++) {
      this._splitSpawnQueue.push({
        type: 'swarm',
        hp: ENEMY_STATS.swarm.hp,
        speed: ENEMY_STATS.swarm.speed,
        gold: 0, // 분열 생성된 swarm은 골드를 주지 않음
        x: deadEnemy.x,
        y: deadEnemy.y,
        waypointIndex: deadEnemy.waypointIndex,
      });
    }
  }

  /**
   * 분열 적 자식 스폰 대기열을 처리한다.
   * 적 갱신 루프 이후에 호출하여 배열 변경 중 충돌을 방지한다.
   * @private
   */
  _processSplitSpawnQueue() {
    for (const spawnData of this._splitSpawnQueue) {
      this._spawnChildEnemy(
        { type: spawnData.type, hp: spawnData.hp, speed: spawnData.speed, gold: spawnData.gold },
        spawnData.x,
        spawnData.y,
        spawnData.waypointIndex
      );
    }
    this._splitSpawnQueue = [];
  }

  /**
   * 모든 적의 이동, 기지 도착, 사망을 처리한다.
   * 역순 순회하여 배열에서 안전하게 splice할 수 있다.
   * @param {number} delta - 프레임 시간 (초 단위, 속도 배율 적용됨)
   * @private
   */
  _updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);

      if (enemy.reachedBase) {
        // 적이 기지에 도달: 기지 HP 감소
        this.baseHP -= enemy.damage;
        this.gameStats.baseDamageTaken += enemy.damage;
        if (this.baseHP < 0) this.baseHP = 0;

        this._playDamageFlash();

        // 기지 피격 효과음 (HP 비율에 따라 긴급도 변화)
        if (this.soundManager) {
          this.soundManager.playSfx('sfx_base_hit', {
            hpRatio: this.baseHP / this.maxBaseHP,
          });
        }

        enemy.destroy();
        this.enemies.splice(i, 1);
      } else if (!enemy.alive) {
        // 적 처치: 골드 지급 (Gold Rain 활성 시 2배, 광고 골드 부스트 시 추가 2배)
        const goldRainMultiplier = this.consumableState.goldRain.active ? 2 : 1;
        const adGoldMultiplier = this.goldBoostActive ? AD_GOLD_BOOST_MULTIPLIER : 1;
        const killGold = Math.floor(enemy.gold * goldRainMultiplier * adGoldMultiplier);
        this.goldManager.earn(killGold);
        this.gameStats.goldEarned += killGold;
        this.totalKills++;
        this.waveManager.totalKills++;

        // 적 타입별 처치 통계 기록
        this.gameStats.killsByType[enemy.type] = (this.gameStats.killsByType[enemy.type] || 0) + 1;
        if (enemy.type === 'boss' || enemy.type === 'boss_armored') {
          this.gameStats.bossesKilled++;
        }

        // 처치 효과음 (보스는 별도)
        if (this.soundManager) {
          if (enemy.type === 'boss' || enemy.type === 'boss_armored') {
            this.soundManager.playSfx('sfx_kill_boss');
          } else {
            this.soundManager.playSfx('sfx_kill');
          }
        }

        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  /**
   * 모든 타워의 공격 로직을 갱신한다.
   * 각 타워에 공격 타입별 콜백(투사체/AoE/체인/빔)을 전달한다.
   * @param {number} delta - 프레임 시간 (초 단위, 속도 배율 적용됨)
   * @private
   */
  _updateTowers(delta) {
    for (const tower of this.towers) {
      tower.update(
        delta,
        this.enemies,
        (towerRef, target) => this._createProjectile(towerRef, target),
        (towerRef, target, enemies) => this._applyAoeInstant(towerRef, target, enemies),
        (towerRef, target, enemies) => this._applyChain(towerRef, target, enemies),
        (towerRef, target, enemies) => this._applyBeam(towerRef, target, enemies)
      );
    }
  }

  /**
   * 타워에서 대상 적을 향해 투사체를 생성한다.
   * 타워의 스탯에 따라 스플래시, 슬로우, 화상, 관통, 밀치기, 방어력 감소, 독 등의
   * 부가 효과를 투사체에 설정한다.
   * @param {Tower} tower - 발사하는 타워
   * @param {Enemy} target - 대상 적
   * @private
   */
  _createProjectile(tower, target) {
    // 투사체에 전달할 부가 효과 정보
    const extra = {
      attackType: tower.stats.attackType || 'single',
    };

    // 스플래시(범위 폭발) 반경
    if (tower.stats.splashRadius) {
      extra.splashRadius = tower.stats.splashRadius;
    }

    // 슬로우(이동속도 감소) 효과
    if (tower.stats.slowAmount) {
      extra.slowAmount = tower.stats.slowAmount;
      extra.slowDuration = tower.stats.slowDuration;
    }

    // 화상(DoT) 효과
    if (tower.stats.burnDamage) {
      extra.burnDamage = tower.stats.burnDamage;
      extra.burnDuration = tower.stats.burnDuration;
    }

    // 방어력 관통 (저항 무시)
    if (tower.stats.armorPiercing) {
      extra.armorPiercing = true;
    }

    // 밀치기 (경로 역행)
    if (tower.stats.pushbackDistance) {
      extra.pushbackDistance = tower.stats.pushbackDistance;
    }

    // 방어력 감소 디버프
    if (tower.stats.armorReduction) {
      extra.armorReduction = tower.stats.armorReduction;
      extra.armorReductionDuration = tower.stats.armorReductionDuration;
    }

    // 독(DoT, 중첩 가능) 효과
    if (tower.stats.poisonDamage) {
      extra.poisonDamage = tower.stats.poisonDamage;
      extra.poisonDuration = tower.stats.poisonDuration;
      extra.maxPoisonStacks = tower.stats.maxPoisonStacks || 1;
    }

    // 오브젝트 풀에서 투사체를 가져와 초기화
    const projectile = this.projectilePool.acquire(
      tower.type,
      tower.x,
      tower.y,
      target,
      tower.stats.damage,
      tower.stats.projectileSpeed,
      extra
    );
    this.projectiles.push(projectile);

    // 발사 효과음
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * 즉발 AoE(범위) 공격을 적용한다 (ice 2b, flame 2b, poison, wind 2b, light 2b 등).
   * AoE 중심을 트리거 대상 적의 위치에 놓아, 사거리 > 스플래시 반경일 때
   * 사각지대가 발생하는 것을 방지한다.
   * @param {Tower} tower - 공격하는 타워
   * @param {Enemy} triggerTarget - 공격을 트리거한 적 (AoE 중심점)
   * @param {Enemy[]} enemies - 모든 활성 적 목록
   * @private
   */
  _applyAoeInstant(tower, triggerTarget, enemies) {
    const splashRadius = tower.stats.splashRadius || tower.stats.range;
    const damage = tower.stats.damage;

    // AoE 중심을 타워가 아닌 트리거 대상의 위치로 설정
    // (사거리 > 스플래시 반경일 때 사각지대 방지)
    const centerX = triggerTarget.x;
    const centerY = triggerTarget.y;

    // 스플래시 반경 내 모든 적을 수집
    let targets = [];
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= splashRadius) {
        targets.push(enemy);
      }
    }

    // wind 2b: 가장 가까운 N개 대상으로 제한 (밀치기 타겟 수 제한)
    if (tower.stats.pushbackTargets) {
      targets.sort((a, b) => {
        const dA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
        const dB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        return dA - dB;
      });
      targets = targets.slice(0, tower.stats.pushbackTargets);
    }

    for (const enemy of targets) {
      const armorPiercing = tower.stats.armorPiercing || false;
      const wasAlive = enemy.alive;
      enemy.takeDamage(damage, armorPiercing);
      this.gameStats.damageDealt += damage;

      // AoE 처치 시 타워별 킬 통계 기록
      if (wasAlive && !enemy.alive) {
        this.gameStats.killsByTower[tower.type] =
          (this.gameStats.killsByTower[tower.type] || 0) + 1;
      }

      // 슬로우 디버프 적용
      if (tower.stats.slowAmount && enemy.alive) {
        enemy.applySlow(tower.stats.slowAmount, tower.stats.slowDuration);
      }

      // 화상 DoT 적용
      if (tower.stats.burnDamage && enemy.alive) {
        enemy.applyBurn(tower.stats.burnDamage, tower.stats.burnDuration);
      }

      // 독 DoT 적용 (중첩 가능)
      if (tower.stats.poisonDamage && enemy.alive) {
        const maxStacks = tower.stats.maxPoisonStacks || 1;
        enemy.applyPoison(tower.stats.poisonDamage, tower.stats.poisonDuration, maxStacks);
      }

      // 방어력 감소 디버프 적용
      if (tower.stats.armorReduction && enemy.alive) {
        enemy.applyArmorReduction(tower.stats.armorReduction, tower.stats.armorReductionDuration);
      }

      // 밀치기 적용 (경로를 일정 거리 역행)
      if (tower.stats.pushbackDistance && enemy.alive) {
        enemy.pushBack(tower.stats.pushbackDistance);
      }
    }

    // AoE 시각 효과 (확장되는 원형 이펙트)
    this._playAoeEffect(centerX, centerY, splashRadius, tower.type);

    // AoE 발사 효과음
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * 체인 라이트닝 공격을 적용한다.
   * 첫 번째 대상부터 시작하여, 체인 반경 내 가장 가까운 다음 적으로 연쇄하며
   * 피해가 chainDecay 비율만큼 감소한다. 이미 맞은 적은 다시 대상이 되지 않는다.
   * @param {Tower} tower - 공격하는 타워
   * @param {Enemy} firstTarget - 체인의 첫 번째 대상
   * @param {Enemy[]} enemies - 모든 활성 적 목록
   * @private
   */
  _applyChain(tower, firstTarget, enemies) {
    const chainCount = tower.stats.chainCount || 4;    // 최대 연쇄 횟수
    const chainDecay = tower.stats.chainDecay || 0.7;  // 연쇄마다 데미지 감소 비율
    const chainRadius = tower.stats.chainRadius || 80; // 다음 대상 탐색 반경 (px)
    let currentDamage = tower.stats.damage;
    const armorPiercing = tower.stats.armorPiercing || false;

    const hitEnemies = new Set(); // 이미 맞은 적을 추적하여 중복 피격 방지
    let currentTarget = firstTarget;
    const chainPoints = [{ x: tower.x, y: tower.y }]; // 시각 효과용 체인 경로 좌표

    for (let i = 0; i < chainCount && currentTarget; i++) {
      hitEnemies.add(currentTarget);
      chainPoints.push({ x: currentTarget.x, y: currentTarget.y });

      const wasAlive = currentTarget.alive;
      currentTarget.takeDamage(currentDamage, armorPiercing);
      this.gameStats.damageDealt += currentDamage;

      // 체인 처치 시 타워별 킬 통계 기록
      if (wasAlive && !currentTarget.alive) {
        this.gameStats.killsByTower[tower.type] =
          (this.gameStats.killsByTower[tower.type] || 0) + 1;
      }

      // 슬로우 디버프
      if (tower.stats.slowAmount && currentTarget.alive) {
        currentTarget.applySlow(tower.stats.slowAmount, tower.stats.slowDuration);
      }

      // 화상 DoT
      if (tower.stats.burnDamage && currentTarget.alive) {
        currentTarget.applyBurn(tower.stats.burnDamage, tower.stats.burnDuration);
      }

      // 독 DoT (중첩 가능)
      if (tower.stats.poisonDamage && currentTarget.alive) {
        const maxStacks = tower.stats.maxPoisonStacks || 1;
        currentTarget.applyPoison(tower.stats.poisonDamage, tower.stats.poisonDuration, maxStacks);
      }

      // 방어력 감소 디버프
      if (tower.stats.armorReduction && currentTarget.alive) {
        currentTarget.applyArmorReduction(tower.stats.armorReduction, tower.stats.armorReductionDuration);
      }

      // 밀치기
      if (tower.stats.pushbackDistance && currentTarget.alive) {
        currentTarget.pushBack(tower.stats.pushbackDistance);
      }

      // 연쇄마다 감쇠 가속: hit i에서 decay^(i+1)씩 추가 적용 (삼각수 지수 공식)
      // 결과적으로 hit i의 데미지 = damage × decay^(i*(i+1)/2)
      currentDamage *= Math.pow(chainDecay, i + 1);

      // 체인 반경 내에서 아직 맞지 않은 가장 가까운 적을 다음 대상으로 선택
      let nextTarget = null;
      let minDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.alive || enemy.reachedBase || hitEnemies.has(enemy)) continue;
        const dx = enemy.x - currentTarget.x;
        const dy = enemy.y - currentTarget.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= chainRadius && dist < minDist) {
          minDist = dist;
          nextTarget = enemy;
        }
      }

      currentTarget = nextTarget;
    }

    // 체인 전격 시각 효과 (연결선 + 노드 광점)
    this._playChainEffect(chainPoints);

    // 체인 발사 효과음
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * 관통 빔 공격을 적용한다 (light 타워).
   * 타워에서 첫 번째 대상 방향으로 사거리만큼 빔을 쏘아,
   * 빔 선분 근처(hitRadius 이내)의 모든 적에게 데미지를 준다.
   * @param {Tower} tower - 공격하는 타워
   * @param {Enemy} firstTarget - 빔 방향을 결정하는 첫 번째 대상
   * @param {Enemy[]} enemies - 모든 활성 적 목록
   * @private
   */
  _applyBeam(tower, firstTarget, enemies) {
    // 타워에서 대상까지의 방향 벡터 계산
    const dx = firstTarget.x - tower.x;
    const dy = firstTarget.y - tower.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // 정규화된 방향 벡터
    const nx = dx / len;
    const ny = dy / len;

    // 빔은 사거리만큼 연장 (실질적으로 맵 대각선 길이)
    const beamLength = tower.stats.range;
    const beamEndX = tower.x + nx * beamLength;
    const beamEndY = tower.y + ny * beamLength;
    const hitRadius = 10; // 빔 적중 판정 반경 (px)

    const armorPiercing = tower.stats.armorPiercing || false;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;

      // 적과 빔 선분 사이의 최단 거리 계산
      const dist = this._pointToSegmentDist(
        enemy.x, enemy.y,
        tower.x, tower.y,
        beamEndX, beamEndY
      );

      if (dist <= hitRadius) {
        const wasAlive = enemy.alive;
        enemy.takeDamage(tower.stats.damage, armorPiercing);
        this.gameStats.damageDealt += tower.stats.damage;

        // 빔 처치 시 타워별 킬 통계 기록
        if (wasAlive && !enemy.alive) {
          this.gameStats.killsByTower[tower.type] =
            (this.gameStats.killsByTower[tower.type] || 0) + 1;
        }

        // 화상 DoT
        if (tower.stats.burnDamage && enemy.alive) {
          enemy.applyBurn(tower.stats.burnDamage, tower.stats.burnDuration);
        }

        // 슬로우 디버프
        if (tower.stats.slowAmount && enemy.alive) {
          enemy.applySlow(tower.stats.slowAmount, tower.stats.slowDuration);
        }

        // 독 DoT (중첩 가능)
        if (tower.stats.poisonDamage && enemy.alive) {
          const maxStacks = tower.stats.maxPoisonStacks || 1;
          enemy.applyPoison(tower.stats.poisonDamage, tower.stats.poisonDuration, maxStacks);
        }

        // 방어력 감소 디버프
        if (tower.stats.armorReduction && enemy.alive) {
          enemy.applyArmorReduction(tower.stats.armorReduction, tower.stats.armorReductionDuration);
        }

        // 밀치기
        if (tower.stats.pushbackDistance && enemy.alive) {
          enemy.pushBack(tower.stats.pushbackDistance);
        }
      }
    }

    // 빔 시각 효과 (발광 선 + 끝점 플래시)
    this._playBeamEffect(tower.x, tower.y, beamEndX, beamEndY);

    // 빔 발사 효과음
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * 점에서 선분까지의 최단 거리를 계산한다 (빔 적중 판정에 사용).
   * 선분 AB 위의 투영점을 구하고, 투영점이 선분 범위를 벗어나면
   * 가장 가까운 끝점까지의 거리를 반환한다.
   * @param {number} px - 점 X
   * @param {number} py - 점 Y
   * @param {number} ax - 선분 시작점 X
   * @param {number} ay - 선분 시작점 Y
   * @param {number} bx - 선분 끝점 X
   * @param {number} by - 선분 끝점 Y
   * @returns {number} 최단 거리
   * @private
   */
  _pointToSegmentDist(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;

    // 선분 길이가 0이면 점까지의 거리 반환
    if (abLenSq === 0) return Math.sqrt(apx * apx + apy * apy);

    // 투영 비율 t를 [0, 1]로 클램프하여 선분 범위 내로 제한
    let t = (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = ax + t * abx;
    const closestY = ay + t * aby;
    const distX = px - closestX;
    const distY = py - closestY;

    return Math.sqrt(distX * distX + distY * distY);
  }

  /**
   * 모든 투사체의 이동 및 적중 판정을 갱신한다.
   * 역순 순회하여 배열에서 안전하게 제거하고, 소진된 투사체는 풀로 반환한다.
   * @param {number} delta - 프레임 시간 (초 단위, 속도 배율 적용됨)
   * @private
   */
  _updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const result = proj.update(delta, this.enemies);

      if (result.hit || !proj.active) {
        // 투사체 적중 시 효과음
        if (result.hit && this.soundManager) {
          this.soundManager.playSfx('sfx_hit');
        }

        // 적중 데미지 및 처치 통계 기록
        if (result.hit) {
          this.gameStats.damageDealt += proj.damage;
          if (result.kills && result.kills.length > 0) {
            this.gameStats.killsByTower[proj.towerType] =
              (this.gameStats.killsByTower[proj.towerType] || 0) + result.kills.length;
          }
        }

        // 투사체를 오브젝트 풀로 반환 (destroy 대신 재활용)
        this.projectilePool.release(proj);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ── 시각 효과 ──────────────────────────────────────────────────

  /**
   * 적이 기지에 도달했을 때 화면 전체에 빨간 플래시를 재생한다.
   * @private
   */
  _playDamageFlash() {
    if (!this.damageFlash) return;
    this.damageFlash.setAlpha(0.3);
    this.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: VISUALS.DAMAGE_FLASH_DURATION,
      ease: 'Power2',
    });
  }

  /**
   * AoE 시각 효과를 재생한다. 확장되는 원, 내부 원, 회전하는 파티클 8개로 구성된다.
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {number} radius - 최대 반경
   * @param {string} towerType - 타워 타입 (색상 결정에 사용)
   * @private
   */
  _playAoeEffect(x, y, radius, towerType) {
    // 타워 타입별 이펙트 색상 매핑
    const colorMap = {
      ice: COLORS.ICE_TOWER,
      flame: COLORS.BURN_TINT,
      poison: COLORS.POISON_TINT,
      wind: COLORS.PUSHBACK_COLOR,
      light: COLORS.BEAM_COLOR,
    };
    const effectColor = colorMap[towerType] || COLORS.EXPLOSION;
    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = VISUALS.DEATH_EFFECT_DURATION;

    // 16ms 간격 타이머로 프레임별 이펙트 애니메이션 구동
    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;        // 0~1 진행도
        const currentRadius = radius * progress;    // 확장되는 반경
        const alpha = 0.4 * (1 - progress);         // 서서히 투명해짐
        const rotation = (elapsed / 1000) * 1;      // 파티클 회전 (1 rad/s)

        effectGraphics.clear();

        // 외부 채움 원
        effectGraphics.fillStyle(effectColor, alpha);
        effectGraphics.fillCircle(x, y, currentRadius);

        // 외곽선 (시간에 따라 두께 감소)
        const strokeWidth = 2 * (1 - progress) + 1;
        effectGraphics.lineStyle(strokeWidth, effectColor, alpha * 0.8);
        effectGraphics.strokeCircle(x, y, currentRadius);

        // 내부 원 (외부의 50% 반경)
        const innerRadius = currentRadius * 0.5;
        effectGraphics.fillStyle(effectColor, alpha * 0.5);
        effectGraphics.fillCircle(x, y, innerRadius);
        effectGraphics.lineStyle(1, effectColor, alpha * 0.4);
        effectGraphics.strokeCircle(x, y, innerRadius);

        // 외곽 원 위를 회전하는 8개 파티클 점
        effectGraphics.fillStyle(0xffffff, alpha * 0.9);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + rotation;
          const px = x + Math.cos(angle) * currentRadius;
          const py = y + Math.sin(angle) * currentRadius;
          effectGraphics.fillCircle(px, py, 2);
        }

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  /**
   * 체인 라이트닝 시각 효과를 재생한다.
   * 연결 노드 사이에 전격 선(두꺼운 외곽 + 밝은 내부)을 그리고,
   * 각 적중 지점에 발광 포인트를 표시한다.
   * @param {{ x: number, y: number }[]} points - 체인 경유 좌표 (타워 -> 적1 -> 적2 -> ...)
   * @private
   */
  _playChainEffect(points) {
    if (points.length < 2) return;

    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = 200; // 이펙트 지속 시간 (ms)

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const alpha = 1 - (elapsed / duration);

        effectGraphics.clear();

        // 외곽 체인 선 (3px 두께)
        effectGraphics.lineStyle(3, COLORS.CHAIN_COLOR, alpha);
        for (let i = 0; i < points.length - 1; i++) {
          effectGraphics.lineBetween(
            points[i].x, points[i].y,
            points[i + 1].x, points[i + 1].y
          );
        }

        // 내부 밝은 선 오버레이 (1px 흰색)
        effectGraphics.lineStyle(1, 0xffffff, alpha * 0.5);
        for (let i = 0; i < points.length - 1; i++) {
          effectGraphics.lineBetween(
            points[i].x, points[i].y,
            points[i + 1].x, points[i + 1].y
          );
        }

        // 각 체인 노드(적 적중점)에 발광 포인트 (타워 원점 index 0은 제외)
        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          // 외부 글로우
          effectGraphics.fillStyle(COLORS.CHAIN_COLOR, alpha * 0.6);
          effectGraphics.fillCircle(p.x, p.y, 8);
          // 내부 밝은 점
          effectGraphics.fillStyle(0xffffff, alpha * 0.9);
          effectGraphics.fillCircle(p.x, p.y, 4);
        }

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  /**
   * 관통 빔 시각 효과를 재생한다.
   * 발사 직후 두꺼운 빔이 시간에 따라 가늘어지며 사라지고,
   * 빔 끝점에 적중 플래시를 표시한다.
   * @param {number} startX - 빔 시작점 X (타워 위치)
   * @param {number} startY - 빔 시작점 Y
   * @param {number} endX - 빔 끝점 X
   * @param {number} endY - 빔 끝점 Y
   * @private
   */
  _playBeamEffect(startX, startY, endX, endY) {
    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = 250; // 이펙트 지속 시간 (ms)

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const alpha = 1 - (elapsed / duration);

        // 빔 두께: 처음 80ms는 최대(5px), 이후 서서히 감소
        let thickness;
        if (elapsed < 80) {
          thickness = 5;
        } else {
          thickness = 5 - (4 * (elapsed - 80) / (duration - 80));
          if (thickness < 1) thickness = 1;
        }

        effectGraphics.clear();

        // 메인 빔 선
        effectGraphics.lineStyle(thickness, COLORS.BEAM_COLOR, alpha);
        effectGraphics.lineBetween(startX, startY, endX, endY);

        // 내부 밝은 선 오버레이
        effectGraphics.lineStyle(1, 0xffffff, alpha * 0.8);
        effectGraphics.lineBetween(startX, startY, endX, endY);

        // 빔 끝점 적중 플래시 (축소되며 사라짐)
        const flashScale = Math.max(0, 1 - elapsed / duration);
        effectGraphics.fillStyle(0xffffff, Math.min(1, alpha * 1.2));
        effectGraphics.fillCircle(endX, endY, 8 * flashScale);
        effectGraphics.fillStyle(COLORS.BEAM_COLOR, alpha * 0.7);
        effectGraphics.fillCircle(endX, endY, 16 * flashScale);

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  // ── 보스 등장 연출 ──────────────────────────────────────────────

  /**
   * 보스 웨이브 등장 연출을 재생한다.
   * BGM을 보스 전용으로 전환하고, 효과음/카메라 흔들림/경고 텍스트(점멸 후 페이드아웃)를 표시한다.
   * @private
   */
  _playBossAppearSequence() {
    // BGM을 보스 전투곡으로 전환 + 보스 등장 효과음
    if (this.soundManager) {
      this.soundManager.playBgm('boss');
      this.soundManager.playSfx('sfx_boss_appear');
    }

    // 카메라 흔들림 (800ms, 강도 0.01)
    this.cameras.main.shake(800, 0.01, true);

    // 100ms 딜레이 후 경고 텍스트 표시
    this.time.delayedCall(100, () => {
      const warnText = this.add.text(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
        '\u26A0 BOSS WAVE \u26A0',
        {
          fontSize: '26px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          fontStyle: 'bold',
          color: '#ff4757',
          stroke: '#000000',
          strokeThickness: 5,
        }
      ).setOrigin(0.5).setDepth(55).setAlpha(0).setScale(0.5);

      // 팝인 애니메이션 (0.5x -> 1.0x 스케일)
      this.tweens.add({
        targets: warnText,
        alpha: 1,
        scale: 1.0,
        duration: 200,
        ease: 'Back.Out',
      });

      // 250ms 간격 점멸 효과
      const blinkTimer = this.time.addEvent({
        delay: 250,
        callback: () => {
          if (warnText && warnText.active) {
            warnText.alpha = warnText.alpha > 0.5 ? 0.2 : 1.0;
          }
        },
        loop: true,
      });

      // 약 2초 후 페이드아웃 및 파괴
      this.time.delayedCall(1900, () => {
        blinkTimer.remove();
        if (warnText && warnText.active) {
          this.tweens.add({
            targets: warnText,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              if (warnText && warnText.active) {
                warnText.destroy();
              }
            },
          });
        }
      });
    });
  }

  // ── 웨이브 이벤트 ──────────────────────────────────────────────

  /**
   * 웨이브 클리어 이벤트 처리.
   * 유틸리티 메타 업그레이드의 보너스 배율을 적용한 골드를 지급하고,
   * 보스 웨이브였으면 BGM을 일반 전투곡으로 복원한다.
   * @param {number} bonusGold - 기본 보너스 골드
   * @returns {number} 배율 적용 후 실제 지급된 골드
   * @private
   */
  _onWaveClear(bonusGold) {
    // 유틸리티 업그레이드의 웨이브 보너스 배율 적용 + 광고 골드 부스트
    const multiplier = getMetaWaveBonusMultiplier(this.utilityUpgrades);
    const adGoldMultiplier = this.goldBoostActive ? AD_GOLD_BOOST_MULTIPLIER : 1;
    const adjustedBonus = Math.floor(bonusGold * multiplier * adGoldMultiplier);
    this.goldManager.earn(adjustedBonus);
    this.gameStats.goldEarned += adjustedBonus;
    this.gameStats.wavesCleared++;
    // 최고 보유 골드 갱신
    const currentGold = this.goldManager.getGold();
    if (currentGold > this.gameStats.peakGold) {
      this.gameStats.peakGold = currentGold;
    }

    // 웨이브 클리어 효과음
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_wave_clear', {
        bossRound: this.waveManager.isBossRound,
      });
    }

    // 보스 웨이브 클리어 시 BGM을 일반 전투곡으로 복원
    if (this.waveManager.isBossRound) {
      if (this.soundManager) {
        this.soundManager.playBgm('battle');
      }
      this.waveManager.isBossRound = false;
    }
    this._bossAppearTriggered = false;

    return adjustedBonus;
  }

  // ── 맵 클리어 (캠페인 모드) ──────────────────────────────────

  /**
   * 캠페인 모드에서 모든 웨이브 클리어 시 호출된다.
   * BGM을 멈추고, 1초 후 MapClearScene으로 전환한다.
   * @param {object} clearData - WaveManager에서 전달된 클리어 데이터
   * @param {number} clearData.currentHP - 클리어 시점 HP
   * @param {number} clearData.maxBaseHP - 최대 HP
   * @param {number} clearData.wavesCleared - 클리어한 웨이브 수
   * @private
   */
  _onMapClear(clearData) {
    this.isGameOver = true;

    if (this.soundManager) {
      this.soundManager.playSfx('sfx_wave_clear', { bossRound: false });
      this.soundManager.stopBgm(true);
    }

    this.waveManager.destroy();

    this.time.delayedCall(1000, () => {
      this.scene.start('MapClearScene', {
        currentHP: clearData.currentHP,
        maxHP: clearData.maxBaseHP,
        wavesCleared: clearData.wavesCleared,
        kills: this.totalKills,
        gameStats: { ...this.gameStats },
        mapData: this.mapData,
        gameMode: this.gameMode,
        clearBoostActive: this.clearBoostActive,
      });
    });
  }

  // ── 게임오버 ──────────────────────────────────────────────────

  /**
   * 게임오버 시퀀스를 트리거한다.
   * BGM을 멈추고, 전면 광고를 표시한 뒤 GameOverScene으로 전환하며
   * 최종 라운드/킬 수/통계를 전달한다.
   * 광고 실패 시에도 정상적으로 GameOverScene으로 전환된다.
   * @private
   */
  _gameOver() {
    this.isGameOver = true;

    // 게임오버 효과음 + BGM 정지
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_game_over');
      this.soundManager.stopBgm(true);
    }

    const finalRound = this.waveManager.currentWave;
    const finalKills = this.totalKills;

    this.waveManager.destroy();

    // 전면 광고 표시 후 GameOverScene 전환
    // 광고 표시 시간이 기존 0.5초 딜레이 역할을 대체한다
    const sceneData = {
      round: finalRound,
      kills: finalKills,
      gameStats: { ...this.gameStats },
      mapData: this.mapData,
      gameMode: this.gameMode,
      revived: this.revived,
    };

    const adManager = this.registry.get('adManager');
    if (adManager) {
      adManager.showInterstitial().then(() => {
        this.scene.start('GameOverScene', sceneData);
      }).catch(() => {
        // 광고 실패 시에도 정상 전환
        this.scene.start('GameOverScene', sceneData);
      });
    } else {
      // AdManager가 없으면 기존 딜레이 방식 유지
      this.time.delayedCall(500, () => {
        this.scene.start('GameOverScene', sceneData);
      });
    }
  }

  /**
   * 세이브 데이터의 영구 메타 업그레이드를 타워 스탯에 적용한다.
   * 타워 배치 시와 머지 후에 호출된다. damage/fireRate/range 3개 슬롯의
   * 레벨에 따라 누적 곱연산(1.1^n 또는 0.9^n)으로 보너스를 적용한다.
   * @param {Tower} tower - 보너스를 적용할 타워 인스턴스
   * @private
   */
  _applyMetaUpgradesToTower(tower) {
    const upgrades = this.towerMetaUpgrades[tower.type];
    if (!upgrades) return;

    const { BONUS_PER_LEVEL } = META_UPGRADE_CONFIG;

    // 공격력 보너스: 1.1^n (레벨당 +10%)
    const damageLevel = upgrades.damage || 0;
    if (damageLevel > 0) {
      tower.stats.damage *= Math.pow(1 + BONUS_PER_LEVEL, damageLevel);
      tower.stats.damage = Math.round(tower.stats.damage);
    }

    // 공격속도 보너스: 0.9^n (fireRate 값이 작을수록 빠름)
    const fireRateLevel = upgrades.fireRate || 0;
    if (fireRateLevel > 0) {
      tower.stats.fireRate *= Math.pow(1 - BONUS_PER_LEVEL, fireRateLevel);
    }

    // 사거리 보너스: 1.1^n (레벨당 +10%)
    const rangeLevel = upgrades.range || 0;
    if (rangeLevel > 0) {
      tower.stats.range *= Math.pow(1 + BONUS_PER_LEVEL, rangeLevel);
      tower.stats.range = Math.round(tower.stats.range);
    }

    // 메타 업그레이드 참조를 타워에 저장 (향후 확장용)
    tower._metaUpgrades = this.towerMetaUpgrades;
  }

  // ── 일시정지 시스템 ──────────────────────────────────────────

  /**
   * 일시정지 버튼과 HUD 음소거 버튼을 생성한다.
   * @private
   */
  _createPauseButton() {
    // 일시정지 버튼 - 원형 배경 + 아이콘 (depth 31+: HUD 배경(30) 위에 표시)
    this.pauseBtnBg = this.add.graphics();
    this.pauseBtnBg.setDepth(31);
    this.pauseBtnBg.fillStyle(BTN_SELL, 0.9);
    this.pauseBtnBg.fillCircle(310, 20, 12);
    this.pauseBtnBg.lineStyle(1, 0xffffff, 0.5);
    this.pauseBtnBg.strokeCircle(310, 20, 12);

    // 투명한 인터랙티브 원 (히트 영역)
    this.pauseBtn = this.add.circle(310, 20, 12)
      .setInteractive({ useHandCursor: true })
      .setDepth(31)
      .setAlpha(0.01);

    // 일시정지 아이콘 이미지 또는 텍스트 폴백
    if (this.textures.exists('icon_pause')) {
      this.pauseBtnIcon = this.add.image(310, 20, 'icon_pause')
        .setDisplaySize(18, 18).setDepth(32);
      this.pauseBtnText = null;
    } else {
      this.pauseBtnIcon = null;
      this.pauseBtnText = this.add.text(310, 20, '||', {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(32);
    }

    this.pauseBtn.on('pointerdown', () => {
      if (!this.isPaused && !this.isGameOver) {
        this._pauseGame();
      }
    });

    // HUD 음소거 버튼 (일시정지 버튼 왼쪽)
    const sm = this.soundManager;
    const isMuted = sm ? sm.muted : false;

    this.muteBtn = this.add.rectangle(278, 20, 24, 22, 0x636e72)
      .setStrokeStyle(2, isMuted ? 0xb2bec3 : 0x55efc4)
      .setInteractive({ useHandCursor: true })
      .setDepth(31);

    // 음소거 아이콘 이미지 또는 텍스트 폴백
    if (this.textures.exists('icon_sound_on')) {
      this.muteBtnIcon = this.add.image(278, 20,
        isMuted ? 'icon_sound_off' : 'icon_sound_on'
      ).setDisplaySize(16, 16).setDepth(32);
      this.muteBtnText = null;
    } else {
      this.muteBtnIcon = null;
      this.muteBtnText = this.add.text(278, 20, isMuted ? 'M' : '\u266A', {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: isMuted ? '#b2bec3' : '#55efc4',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(32);
    }

    this.muteBtn.on('pointerdown', () => {
      if (!sm) return;
      sm.setMuted(!sm.muted);
      this._updateMuteButton();
    });
  }

  /**
   * HUD 음소거 버튼의 시각 상태를 갱신한다 (아이콘/색상 전환).
   * @private
   */
  _updateMuteButton() {
    const sm = this.soundManager;
    if (!sm || !this.muteBtn) return;
    const isMuted = sm.muted;
    this.muteBtn.setStrokeStyle(2, isMuted ? 0xb2bec3 : 0x55efc4);
    // 아이콘 이미지 모드: 텍스처 전환
    if (this.muteBtnIcon) {
      this.muteBtnIcon.setTexture(isMuted ? 'icon_sound_off' : 'icon_sound_on');
    }
    // 텍스트 폴백 모드
    if (this.muteBtnText) {
      this.muteBtnText.setText(isMuted ? 'M' : '\u266A');
      this.muteBtnText.setColor(isMuted ? '#b2bec3' : '#55efc4');
    }
  }

  /**
   * 씬 wake 이벤트 핸들러. MergeCodexScene에서 복귀 시
   * 일시정지 상태였으면 오버레이를 다시 표시한다.
   * @private
   */
  _onWake() {
    if (this.isPaused) {
      this._showPauseOverlay();
    }
  }

  /**
   * 게임을 일시정지하고 오버레이를 표시한다.
   * 현재 게임 속도를 저장하여 Resume 시 복원한다.
   * BGM도 함께 정지하여 백그라운드 전환 시 불일치를 방지한다.
   * @private
   */
  _pauseGame() {
    this.isPaused = true;
    this.gameSpeed_saved = this.gameSpeed;

    // BGM 정지: 일시정지 전 BGM ID를 저장 후 stopBgm 호출
    if (this.soundManager) {
      this._bgmIdBeforePause = this.soundManager._currentBgmId;
      this.soundManager.stopBgm(false);
    }

    this._showPauseOverlay();
  }

  /**
   * 게임을 재개하고 오버레이를 숨긴다.
   * 일시정지 전 게임 속도와 BGM을 복원한다.
   * @private
   */
  _resumeGame() {
    this.isPaused = false;
    // Resume 후 입력 쿨다운: 오버레이 파괴 시 같은 좌표의 타워에
    // 클릭이 관통되는 것을 방지 (모바일 터치 이벤트 특성)
    this._resumeCooldown = true;
    this.time.delayedCall(100, () => { this._resumeCooldown = false; });
    this.gameSpeed = this.gameSpeed_saved;
    this._hidePauseOverlay();

    // 일시정지 전 재생 중이던 BGM 복원
    if (this.soundManager && this._bgmIdBeforePause) {
      this.soundManager.playBgm(this._bgmIdBeforePause);
      this._bgmIdBeforePause = null;
    }

    // 일시정지 중 변경되었을 수 있는 음소거 버튼 갱신
    this._updateMuteButton();
  }

  /**
   * 일시정지 상태에서 메인 메뉴로 복귀한다.
   * BGM을 정지하고 MenuScene으로 전환한다.
   * @private
   */
  _returnToMainMenu() {
    this.isPaused = false;
    this._hidePauseOverlay();

    // 씬 전환 전 BGM 정지
    if (this.soundManager) {
      this.soundManager.stopBgm(false);
    }

    this.scene.start('MenuScene');
  }

  /**
   * 일시정지 오버레이용 이미지 버튼을 생성한다.
   * 에셋이 없으면 기존 rectangle 폴백을 사용한다.
   * @param {number} x - 중심 X
   * @param {number} y - 중심 Y
   * @param {string} textureBase - 텍스처 기본 키
   * @param {number} w - 폴백 너비
   * @param {number} h - 폴백 높이
   * @param {number} fillColor - 폴백 채우기 색상
   * @param {number} strokeColor - 폴백 테두리 색상
   * @returns {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle}
   * @private
   */
  _createPauseImageButton(x, y, textureBase, w, h, fillColor, strokeColor) {
    const normalKey = `${textureBase}_normal`;
    const pressedKey = `${textureBase}_pressed`;

    if (this.textures.exists(normalKey)) {
      const btn = this.add.image(x, y, normalKey)
        .setInteractive({ useHandCursor: true }).setDepth(52);
      if (this.textures.exists(pressedKey)) {
        btn.on('pointerdown', () => btn.setTexture(pressedKey));
        btn.on('pointerup', () => btn.setTexture(normalKey));
        btn.on('pointerout', () => btn.setTexture(normalKey));
      }
      return btn;
    }

    return this.add.rectangle(x, y, w, h, fillColor)
      .setInteractive({ useHandCursor: true }).setDepth(52);
  }

  /**
   * 일시정지 오버레이를 표시한다.
   * 어두운 배경 위에 Resume / 머지 도감 / Main Menu 버튼과
   * 볼륨 컨트롤(SFX/BGM/MUTE)을 배치한다.
   * @private
   */
  _showPauseOverlay() {
    this.pauseOverlay = this.add.container(0, 0).setDepth(50);

    // 전체 화면 어두운 배경 (입력 차단용 setInteractive)
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x05050f
    ).setAlpha(0.97).setInteractive();
    this.pauseOverlay.add(overlay);

    // 중앙 패널 (이미지 또는 폴백 사각형)
    const panel = this.textures.exists('panel_pause')
      ? this.add.image(180, 310, 'panel_pause').setDepth(51)
      : this.add.rectangle(180, 310, 220, 260, 0x05050f)
          .setStrokeStyle(2, BTN_PRIMARY).setDepth(51);
    this.pauseOverlay.add(panel);

    // "PAUSED" 텍스트 (금색 + 글로우)
    const pausedText = this.add.text(180, 220, t('pause.title'), {
      fontSize: '20px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ffd700',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(pausedText);

    // Resume(재개) 버튼 (중형 높이 36으로 표준화, 너비 180 유지)
    const resumeBtn = this._createPauseImageButton(
      180, 252, 'btn_medium_back', 180, 36, BTN_BACK, 0x1a9c7e
    );
    this.pauseOverlay.add(resumeBtn);

    const resumeText = this.add.text(180, 252, t('pause.resume'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(resumeText);

    resumeBtn.on('pointerdown', () => {
      this._resumeGame();
    });

    // 머지 도감 버튼 (중형 높이 36으로 표준화)
    const codexBtn = this._createPauseImageButton(
      180, 292, 'btn_medium_meta', 180, 36, BTN_META, COLORS.DIAMOND
    );
    this.pauseOverlay.add(codexBtn);

    const codexText = this.add.text(180, 292, t('ui.mergeCodex'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(codexText);

    codexBtn.on('pointerdown', () => {
      this._hidePauseOverlay();
      // isPaused는 true 유지 (도감에서 돌아올 때 오버레이 다시 표시)
      this.scene.launch('MergeCodexScene', { fromScene: 'GameScene' });
      this.scene.sleep('GameScene');
    });

    // 메인 메뉴 버튼 (중형 높이 36으로 표준화)
    const menuBtn = this._createPauseImageButton(
      180, 332, 'btn_medium_danger', 180, 36, BTN_DANGER, 0x636e72
    );
    this.pauseOverlay.add(menuBtn);

    const menuText = this.add.text(180, 332, t('pause.mainMenu'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(menuText);

    menuBtn.on('pointerdown', () => {
      this._returnToMainMenu();
    });

    // 볼륨 컨트롤 (SFX/BGM/MUTE)
    const sm = this.soundManager;
    if (sm) {
      this._createVolumeControls(sm);
    }
  }

  /**
   * 일시정지 오버레이에 SFX/BGM 볼륨 조절 및 MUTE 토글 컨트롤을 생성한다.
   * +/- 버튼으로 10% 단위로 볼륨을 조절할 수 있다.
   * @param {import('../managers/SoundManager.js').SoundManager} sm - SoundManager 인스턴스
   * @private
   */
  _createVolumeControls(sm) {
    const baseY = 370;
    const labelStyle = {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
    };
    const valueStyle = {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    };

    // ── SFX 볼륨 조절 행 ──
    const sfxLabel = this.add.text(100, baseY, t('pause.sfx'), labelStyle).setOrigin(0, 0.5).setDepth(52);
    this.pauseOverlay.add(sfxLabel);

    const sfxValText = this.add.text(180, baseY, `${Math.round(sm.sfxVolume * 100)}%`, valueStyle)
      .setOrigin(0.5, 0.5).setDepth(52);
    this.pauseOverlay.add(sfxValText);

    const sfxDown = this.add.rectangle(150, baseY, 24, 20, BTN_SELL)
      .setStrokeStyle(1, BTN_PRIMARY).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(sfxDown);
    const sfxDownT = this.add.text(150, baseY, '-', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(sfxDownT);

    const sfxUp = this.add.rectangle(210, baseY, 24, 20, BTN_SELL)
      .setStrokeStyle(1, BTN_PRIMARY).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(sfxUp);
    const sfxUpT = this.add.text(210, baseY, '+', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(sfxUpT);

    sfxDown.on('pointerdown', () => {
      sm.setSfxVolume(sm.sfxVolume - 0.1);
      sfxValText.setText(`${Math.round(sm.sfxVolume * 100)}%`);
    });
    sfxUp.on('pointerdown', () => {
      sm.setSfxVolume(sm.sfxVolume + 0.1);
      sfxValText.setText(`${Math.round(sm.sfxVolume * 100)}%`);
    });

    // ── BGM 볼륨 조절 행 ──
    const bgmY = baseY + 30;
    const bgmLabel = this.add.text(100, bgmY, t('pause.bgm'), labelStyle).setOrigin(0, 0.5).setDepth(52);
    this.pauseOverlay.add(bgmLabel);

    const bgmValText = this.add.text(180, bgmY, `${Math.round(sm.bgmVolume * 100)}%`, valueStyle)
      .setOrigin(0.5, 0.5).setDepth(52);
    this.pauseOverlay.add(bgmValText);

    const bgmDown = this.add.rectangle(150, bgmY, 24, 20, BTN_SELL)
      .setStrokeStyle(1, BTN_PRIMARY).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(bgmDown);
    const bgmDownT = this.add.text(150, bgmY, '-', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(bgmDownT);

    const bgmUp = this.add.rectangle(210, bgmY, 24, 20, BTN_SELL)
      .setStrokeStyle(1, BTN_PRIMARY).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(bgmUp);
    const bgmUpT = this.add.text(210, bgmY, '+', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(bgmUpT);

    bgmDown.on('pointerdown', () => {
      sm.setBgmVolume(sm.bgmVolume - 0.1);
      bgmValText.setText(`${Math.round(sm.bgmVolume * 100)}%`);
    });
    bgmUp.on('pointerdown', () => {
      sm.setBgmVolume(sm.bgmVolume + 0.1);
      bgmValText.setText(`${Math.round(sm.bgmVolume * 100)}%`);
    });

    // ── 전체 음소거 토글 ──
    const muteY = bgmY + 35;
    const muteBtn = this.add.rectangle(180, muteY, 100, 24, sm.muted ? BTN_SELL : BTN_SELL)
      .setStrokeStyle(1, sm.muted ? BTN_DANGER : BTN_PRIMARY)
      .setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(muteBtn);

    const muteTxt = this.add.text(180, muteY, sm.muted ? t('pause.unmute') : t('pause.mute'), {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(muteTxt);

    muteBtn.on('pointerdown', () => {
      sm.setMuted(!sm.muted);
      muteTxt.setText(sm.muted ? t('pause.unmute') : t('pause.mute'));
      muteBtn.setFillStyle(BTN_SELL);
      muteBtn.setStrokeStyle(1, sm.muted ? BTN_DANGER : BTN_PRIMARY);
    });
  }

  /**
   * 일시정지 오버레이를 숨기고 파괴한다.
   * @private
   */
  _hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  // ── 골드 싱크: HP 회복 ──────────────────────────────────────────

  /**
   * HP 회복 버튼을 하단 패널에 생성한다.
   * 속도 버튼 옆(2행 오른쪽)에 배치되며, 사용할수록 비용이 증가한다.
   * @private
   */
  _createHpRecoverButton() {
    const x = GAME_WIDTH - 38;
    const y = PANEL_Y + 86;
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;

    // HP 회복 버튼 배경 (액션 슬롯 이미지 또는 사각형 폴백)
    if (this.textures.exists('slot_action_normal')) {
      this.hpRecoverBg = this.add.image(x, y, 'slot_action_normal')
        .setInteractive({ useHandCursor: true })
        .setDepth(31);
    } else {
      this.hpRecoverBg = this.add.rectangle(x, y, btnSize, btnSize, BTN_META)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true })
        .setDepth(31);
    }

    this.hpRecoverText = this.add.text(x, y, '+HP', {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.hpRecoverCostText = this.add.text(x, y + 14, '', {
      fontSize: '7px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(31);

    this._updateHpRecoverButton();

    this.hpRecoverBg.on('pointerdown', () => {
      this._onHpRecover();
    });
  }

  /**
   * HP 회복 버튼의 표시를 갱신한다 (비용, 구매 가능 여부, HP 만충전 상태).
   * @private
   */
  _updateHpRecoverButton() {
    if (!this.hpRecoverBg) return;
    const cost = calcHpRecoverCost(this.hpRecoverUseCount);
    const isFull = this.baseHP >= this.maxBaseHP;

    if (isFull) {
      // Image 객체에는 setFillStyle이 없으므로 setTint로 대체
      if (this.hpRecoverBg instanceof Phaser.GameObjects.Rectangle) {
        this.hpRecoverBg.setFillStyle(BTN_SELL);
      } else {
        this.hpRecoverBg.setTint(0x888888);
      }
      this.hpRecoverBg.setAlpha(0.4);
      this.hpRecoverCostText.setText(t('ui.hpRecoverFull'));
      this.hpRecoverCostText.setColor('#636e72');
    } else {
      const canAfford = this.goldManager.canAfford(cost);
      if (this.hpRecoverBg instanceof Phaser.GameObjects.Rectangle) {
        this.hpRecoverBg.setFillStyle(canAfford ? BTN_META : BTN_SELL);
      } else {
        // Image: 구매 가능하면 원래 색, 불가하면 어둡게
        if (canAfford) {
          this.hpRecoverBg.clearTint();
        } else {
          this.hpRecoverBg.setTint(0x888888);
        }
      }
      this.hpRecoverBg.setAlpha(canAfford ? 1 : 0.5);
      this.hpRecoverCostText.setText(`${cost}G`);
      this.hpRecoverCostText.setColor(canAfford ? '#ffd700' : '#ff4757');
    }
  }

  /**
   * HP 회복 버튼 클릭 처리. 골드를 소모하여 기지 HP를 일정량 회복한다.
   * 사용 횟수에 따라 비용이 점진적으로 증가한다.
   * @private
   */
  _onHpRecover() {
    if (this.isGameOver || this.isPaused) return;
    if (this.baseHP >= this.maxBaseHP) return;

    const cost = calcHpRecoverCost(this.hpRecoverUseCount);
    if (!this.goldManager.canAfford(cost)) return;

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    this.hpRecoverUseCount++;

    // HP 회복 (최대 HP 초과 방지)
    this.baseHP = Math.min(this.baseHP + HP_RECOVER_AMOUNT, this.maxBaseHP);

    // 초록색 플래시로 시각 피드백
    this._playAbilityFlash(0x00b894);
    this._updateHpRecoverButton();
  }

  // ── 골드 싱크: 소모품 능력 ──────────────────────────────────────

  /**
   * 3종 소모품 능력 버튼(전체 감속, 골드 비, 번개)을 생성한다.
   * HP 회복 버튼 왼쪽에 일렬로 배치된다.
   * @private
   */
  _createConsumableButtons() {
    const keys = ['slowAll', 'goldRain', 'lightning'];
    const y = PANEL_Y + 86;  // HP 회복 버튼과 같은 행
    const btnSize = 24;
    const spacing = 26;
    // HP 회복 버튼(x=322) 왼쪽에 배치
    const baseX = GAME_WIDTH - 38 - spacing * 3;

    /** @type {object} 각 능력의 버튼 UI 참조 */
    this.consumableButtons = {};

    /** @type {boolean} 터치 디바이스 여부 */
    const isTouch = this.sys.game.device.input.touch;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const def = CONSUMABLE_ABILITIES[key];
      const x = baseX + i * spacing;

      // 소모품 버튼 배경 (미니 슬롯 이미지 또는 사각형 폴백)
      let bg;
      if (this.textures.exists('slot_mini_normal')) {
        bg = this.add.image(x, y, 'slot_mini_normal')
          .setInteractive({ useHandCursor: true })
          .setDepth(31);
      } else {
        bg = this.add.rectangle(x, y, btnSize, btnSize, BTN_META)
          .setStrokeStyle(1, 0x636e72)
          .setInteractive({ useHandCursor: true })
          .setDepth(31);
      }

      // 아이콘: 텍스처가 존재하면 이미지, 없으면 텍스트 폴백
      let iconImage = null;
      let iconText = null;
      if (this.textures.exists(def.icon)) {
        iconImage = this.add.image(x, y - 2, def.icon)
          .setDisplaySize(16, 16)
          .setOrigin(0.5)
          .setDepth(31);
      } else {
        // 에셋 로드 실패 시 기존 텍스트 방식 폴백
        iconText = this.add.text(x, y - 2, def.iconFallback || def.icon, {
          fontSize: '12px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(31);
      }

      const costText = this.add.text(x, y + 10, '', {
        fontSize: '6px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(31);

      // 쿨다운 카운트 오버레이 텍스트
      const cdText = this.add.text(x, y, '', {
        fontSize: '9px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(32).setAlpha(0);

      // ── 툴팁 오브젝트 생성 (초기 비표시) ──
      const tooltipBg = this.add.rectangle(x, y - 44, 130, 52, 0x000000)
        .setAlpha(0.85).setOrigin(0.5).setDepth(50).setVisible(false);
      const tooltipTitle = this.add.text(x, y - 62, '', {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(50).setVisible(false);
      const tooltipDesc = this.add.text(x, y - 48, '', {
        fontSize: '8px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
        wordWrap: { width: 120 },
      }).setOrigin(0.5).setDepth(50).setVisible(false);
      const tooltipMeta = this.add.text(x, y - 28, '', {
        fontSize: '7px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(50).setVisible(false);

      this.consumableButtons[key] = {
        bg, iconImage, iconText, costText, cdText, x, y,
        tooltipBg, tooltipTitle, tooltipDesc, tooltipMeta,
        longPressTimer: null,
      };

      // ── 이벤트 등록 ──
      if (isTouch) {
        // 모바일: 롱프레스(500ms) 시 툴팁 표시, 짧은 탭은 능력 발동
        bg.on('pointerdown', () => {
          const timer = this.time.delayedCall(500, () => {
            this._showConsumableTooltip(key);
            this.consumableButtons[key]._tooltipShown = true;
          });
          this.consumableButtons[key].longPressTimer = timer;
          this.consumableButtons[key]._tooltipShown = false;
        });
        bg.on('pointerup', () => {
          const btn = this.consumableButtons[key];
          if (btn.longPressTimer) {
            btn.longPressTimer.remove(false);
            btn.longPressTimer = null;
          }
          // 툴팁이 표시되지 않았으면 능력 발동
          if (!btn._tooltipShown) {
            this._useConsumable(key);
          }
          this._hideConsumableTooltip(key);
        });
        bg.on('pointerout', () => {
          const btn = this.consumableButtons[key];
          if (btn.longPressTimer) {
            btn.longPressTimer.remove(false);
            btn.longPressTimer = null;
          }
          this._hideConsumableTooltip(key);
        });
      } else {
        // PC: 호버 시 툴팁 표시, 클릭 시 능력 발동
        bg.on('pointerover', () => {
          this._showConsumableTooltip(key);
        });
        bg.on('pointerout', () => {
          this._hideConsumableTooltip(key);
        });
        bg.on('pointerdown', () => {
          this._useConsumable(key);
        });
      }
    }

    this._updateConsumableButtons();
  }

  /**
   * 소모품 능력 버튼의 표시를 갱신한다 (비용, 쿨다운, 활성 상태 표시).
   * @private
   */
  _updateConsumableButtons() {
    if (!this.consumableButtons) return;

    for (const key of Object.keys(this.consumableButtons)) {
      const btn = this.consumableButtons[key];
      const state = this.consumableState[key];
      const def = CONSUMABLE_ABILITIES[key];
      const cost = def.baseCost + state.useCount * def.costIncrement;
      const onCooldown = state.cooldownTimer > 0;

      if (onCooldown) {
        // Image 객체에는 setFillStyle이 없으므로 setTint로 대체
        if (btn.bg instanceof Phaser.GameObjects.Rectangle) {
          btn.bg.setFillStyle(BTN_SELL);
        } else {
          btn.bg.setTint(0x888888);
        }
        btn.bg.setAlpha(0.3);
        // 아이콘 이미지 또는 텍스트 폴백의 알파 처리
        if (btn.iconImage) btn.iconImage.setAlpha(0.3);
        if (btn.iconText) btn.iconText.setAlpha(0.3);
        btn.costText.setText('');
        btn.cdText.setText(`${Math.ceil(state.cooldownTimer)}`);
        btn.cdText.setAlpha(1);
      } else {
        const canAfford = this.goldManager.canAfford(cost);
        if (btn.bg instanceof Phaser.GameObjects.Rectangle) {
          btn.bg.setFillStyle(canAfford ? BTN_META : BTN_SELL);
        } else {
          // Image: 구매 가능하면 원래 색, 불가하면 어둡게
          if (canAfford) {
            btn.bg.clearTint();
          } else {
            btn.bg.setTint(0x888888);
          }
        }
        btn.bg.setAlpha(canAfford ? 1 : 0.5);
        // 아이콘 이미지 또는 텍스트 폴백의 알파 복원
        if (btn.iconImage) btn.iconImage.setAlpha(1);
        if (btn.iconText) btn.iconText.setAlpha(1);
        btn.costText.setText(`${cost}G`);
        btn.costText.setColor(canAfford ? '#ffd700' : '#ff4757');
        btn.cdText.setAlpha(0);
      }

      // 활성 중인 능력은 시각 효과로 강조 표시
      if (btn.bg instanceof Phaser.GameObjects.Rectangle) {
        if (key === 'goldRain' && state.active) {
          btn.bg.setStrokeStyle(2, 0xffd700);
        } else if (key === 'slowAll' && state.active) {
          btn.bg.setStrokeStyle(2, 0x74b9ff);
        } else {
          btn.bg.setStrokeStyle(1, 0x636e72);
        }
      } else {
        // Image: 활성 중인 능력은 밝은 tint로 강조
        if ((key === 'goldRain' && state.active) || (key === 'slowAll' && state.active)) {
          const activeTint = key === 'goldRain' ? 0xffd700 : 0x74b9ff;
          btn.bg.setTint(activeTint);
        } else if (!onCooldown) {
          // 쿨다운이 아니고 활성도 아니면 원래 색상 복원
          const canAfford = this.goldManager.canAfford(cost);
          if (canAfford) {
            btn.bg.clearTint();
          }
          // 구매 불가 시에는 위 분기에서 이미 tint 적용됨
        }
      }
    }
  }

  /**
   * 소모품 능력 버튼의 툴팁을 표시한다.
   * 능력 이름, 효과 설명, 현재 비용, 쿨다운 정보를 갱신하고 보이도록 한다.
   * 화면 좌우 경계(0~360px)를 벗어나지 않도록 위치를 보정한다.
   * @param {string} key - 능력 키 ('slowAll' | 'goldRain' | 'lightning')
   * @private
   */
  _showConsumableTooltip(key) {
    if (!this.consumableButtons || !this.consumableButtons[key]) return;
    const btn = this.consumableButtons[key];
    const def = CONSUMABLE_ABILITIES[key];
    const state = this.consumableState[key];

    // i18n으로 이름 및 설명 조회
    const name = t(`ui.${key}`);
    const desc = t(`consumable.${key}.desc`);
    const cost = def.baseCost + state.useCount * def.costIncrement;
    const metaStr = `${cost}G | ${t('ui.cooldown').replace('{sec}', def.cooldown)}`;

    // 텍스트 갱신
    btn.tooltipTitle.setText(name);
    btn.tooltipDesc.setText(desc);
    btn.tooltipMeta.setText(metaStr);

    // 기본 위치: 버튼 중심 x, 버튼 위쪽 44px
    let tx = btn.x;
    const ty = btn.y - 44;

    // 화면 좌우 경계 보정 (툴팁 폭 130px의 절반 = 65)
    const halfW = 65;
    if (tx - halfW < 0) tx = halfW;
    if (tx + halfW > GAME_WIDTH) tx = GAME_WIDTH - halfW;

    // 위치 적용
    btn.tooltipBg.setPosition(tx, ty);
    btn.tooltipTitle.setPosition(tx, ty - 18);
    btn.tooltipDesc.setPosition(tx, ty - 4);
    btn.tooltipMeta.setPosition(tx, ty + 16);

    // 표시
    btn.tooltipBg.setVisible(true);
    btn.tooltipTitle.setVisible(true);
    btn.tooltipDesc.setVisible(true);
    btn.tooltipMeta.setVisible(true);
  }

  /**
   * 소모품 능력 버튼의 툴팁을 숨긴다.
   * @param {string} key - 능력 키 ('slowAll' | 'goldRain' | 'lightning')
   * @private
   */
  _hideConsumableTooltip(key) {
    if (!this.consumableButtons || !this.consumableButtons[key]) return;
    const btn = this.consumableButtons[key];
    btn.tooltipBg.setVisible(false);
    btn.tooltipTitle.setVisible(false);
    btn.tooltipDesc.setVisible(false);
    btn.tooltipMeta.setVisible(false);
  }

  /**
   * 소모품 능력을 사용한다. 쿨다운 중이거나 골드가 부족하면 무시된다.
   * 즉발 능력(slowAll, lightning)은 적이 없을 때 사용 낭비를 방지한다.
   * @param {string} key - 능력 키 ('slowAll' | 'goldRain' | 'lightning')
   * @private
   */
  _useConsumable(key) {
    if (this.isGameOver || this.isPaused) return;

    const state = this.consumableState[key];
    const def = CONSUMABLE_ABILITIES[key];
    if (state.cooldownTimer > 0) return;

    // 비용 = 기본 비용 + (사용 횟수 * 증가분)
    const cost = def.baseCost + state.useCount * def.costIncrement;
    if (!this.goldManager.canAfford(cost)) return;

    // 즉발 능력은 적이 없으면 사용 불가 (골드 비는 지속형이므로 미리 발동 가능)
    if (key !== 'goldRain') {
      const hasAliveEnemies = this.enemies.some(e => e.alive && !e.reachedBase);
      if (!hasAliveEnemies) return;
    }

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    state.useCount++;
    state.cooldownTimer = def.cooldown;

    // 능력 실행
    switch (key) {
      case 'slowAll':
        this._executeSlowAll();
        state.active = true;
        state.remainingDuration = def.duration;
        break;
      case 'goldRain':
        this._executeGoldRain();
        state.active = true;
        state.remainingDuration = def.duration;
        break;
      case 'lightning':
        this._executeLightningStrike();
        break;
    }

    this._updateConsumableButtons();
  }

  /**
   * 전체 감속 능력 실행: 모든 적에게 50% 이동속도 감소를 5초간 적용한다.
   * @private
   */
  _executeSlowAll() {
    const def = CONSUMABLE_ABILITIES.slowAll;
    for (const enemy of this.enemies) {
      if (enemy.alive && !enemy.reachedBase) {
        enemy.applySlow(def.slowAmount, def.duration);
      }
    }
    this._playAbilityFlash(0x74b9ff);
  }

  /**
   * 골드 비 능력 실행: 10초간 적 처치 골드가 2배가 된다.
   * 실제 2배 적용은 _updateEnemies()에서 goldRain.active 상태로 처리된다.
   * @private
   */
  _executeGoldRain() {
    this._playAbilityFlash(0xffd700);
  }

  /**
   * 번개 능력 실행: 모든 적에게 고정 데미지를 입히고 카메라를 흔든다.
   * @private
   */
  _executeLightningStrike() {
    const def = CONSUMABLE_ABILITIES.lightning;
    for (const enemy of this.enemies) {
      if (enemy.alive && !enemy.reachedBase) {
        enemy.takeDamage(def.damage, false);
        this.gameStats.damageDealt += def.damage;
      }
    }
    // 카메라 흔들림으로 타격감 연출
    this.cameras.main.shake(400, 0.008, true);
    this._playAbilityFlash(0xfdcb6e);
  }

  /**
   * 능력 사용 시 전체 화면 플래시 효과를 재생한다.
   * 0.25 알파에서 시작하여 0.4초에 걸쳐 투명해진다.
   * @param {number} color - 플래시 색상 (16진수)
   * @private
   */
  _playAbilityFlash(color) {
    const flash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      color
    ).setAlpha(0.25).setDepth(40);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * 매 프레임 소모품 능력의 쿨다운과 지속시간을 갱신한다.
   * 지속시간이 만료되면 능력을 비활성화하고, 버튼 표시도 함께 갱신한다.
   * @param {number} delta - 프레임 시간 (초 단위, 속도 배율 적용됨)
   * @private
   */
  _updateConsumables(delta) {
    for (const key of Object.keys(this.consumableState)) {
      const state = this.consumableState[key];

      // 쿨다운 타이머 감소
      if (state.cooldownTimer > 0) {
        state.cooldownTimer = Math.max(0, state.cooldownTimer - delta);
      }

      // 활성 능력의 남은 지속시간 감소 (만료 시 비활성화)
      if (state.active && state.remainingDuration > 0) {
        state.remainingDuration -= delta;
        if (state.remainingDuration <= 0) {
          state.active = false;
          state.remainingDuration = 0;
        }
      }
    }

    this._updateConsumableButtons();
    this._updateHpRecoverButton();
  }

  /**
   * 씬 종료(shutdown) 시 커스텀 리소스를 정리한다.
   * 모든 엔티티를 파괴하고, 오브젝트 풀/오버레이/UI 요소를 해제하며,
   * 이벤트 리스너를 제거한다.
   * @private
   */
  _cleanup() {
    // 모든 타워와 적 파괴
    for (const tower of this.towers) tower.destroy();
    for (const enemy of this.enemies) enemy.destroy();

    // 투사체 오브젝트 풀 파괴 (내부 투사체 포함)
    if (this.projectilePool) this.projectilePool.destroy();

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this._splitSpawnQueue = [];

    this._hidePauseOverlay();

    // 일시정지/음소거 아이콘 이미지 정리
    if (this.pauseBtnIcon) { this.pauseBtnIcon.destroy(); this.pauseBtnIcon = null; }
    if (this.muteBtnIcon) { this.muteBtnIcon.destroy(); this.muteBtnIcon = null; }

    if (this.rangePreviewGraphics) {
      this.rangePreviewGraphics.destroy();
      this.rangePreviewGraphics = null;
    }

    // 골드 싱크 UI 요소 파괴
    if (this.hpRecoverBg) { this.hpRecoverBg.destroy(); this.hpRecoverBg = null; }
    if (this.hpRecoverText) { this.hpRecoverText.destroy(); this.hpRecoverText = null; }
    if (this.hpRecoverCostText) { this.hpRecoverCostText.destroy(); this.hpRecoverCostText = null; }
    if (this.consumableButtons) {
      for (const key of Object.keys(this.consumableButtons)) {
        const btn = this.consumableButtons[key];
        if (btn.bg) btn.bg.destroy();
        if (btn.iconImage) btn.iconImage.destroy();
        if (btn.iconText) btn.iconText.destroy();
        if (btn.costText) btn.costText.destroy();
        if (btn.cdText) btn.cdText.destroy();
        // 툴팁 오브젝트 파괴
        if (btn.tooltipBg) btn.tooltipBg.destroy();
        if (btn.tooltipTitle) btn.tooltipTitle.destroy();
        if (btn.tooltipDesc) btn.tooltipDesc.destroy();
        if (btn.tooltipMeta) btn.tooltipMeta.destroy();
        // 롱프레스 타이머 정리
        if (btn.longPressTimer) {
          btn.longPressTimer.remove(false);
          btn.longPressTimer = null;
        }
      }
      this.consumableButtons = null;
    }

    if (this.waveManager) this.waveManager.destroy();

    // 이벤트 리스너 해제
    this.events.off('wake', this._onWake, this);
    this.events.off('shutdown', this._cleanup, this);
  }

  /**
   * 포인터 업(터치/마우스 해제) 이벤트 처리.
   * 드래그 중이었으면 머지 드롭을 완료하고,
   * 드래그가 아닌 클릭이었으면 타워 정보 모달을 연다.
   * @param {Phaser.Input.Pointer} pointer - Phaser 포인터 객체
   * @private
   */
  _onPointerUp(pointer) {
    // 타워 정보 오버레이가 열려있으면 게임 입력 무시
    if (this.towerPanel && this.towerPanel.isOverlayOpen()) return;
    // Resume 직후 클릭 관통 방지
    if (this._resumeCooldown) return;
    const wasDragging = this.towerPanel && this.towerPanel.isDragging();
    this._pendingDrag = null;
    if (wasDragging) {
      this.towerPanel.endDrag(
        pointer,
        (col, row) => this.mapManager.getTowerAt(col, row),
        (col, row) => this.mapManager.isBuildable(col, row)
      );
    }

    // 드래그 없이 깨끗한 클릭(이동 10px 이내)이었을 때만 타워 정보 모달 표시
    if (this._pendingTowerClick && !wasDragging) {
      const { tower, startX, startY } = this._pendingTowerClick;
      const dx = pointer.x - startX;
      const dy = pointer.y - startY;
      if (dx * dx + dy * dy <= 100) { // 10px 임계값 (제곱 거리)
        this._selectPlacedTower(tower);
      }
    }
    this._pendingTowerClick = null;
  }

  /**
   * 포인터 이동 이벤트 처리.
   * 드래그 임계값 초과 시 머지 드래그를 시작하고,
   * 타워 타입이 선택된 상태에서는 사거리 미리보기를 표시한다.
   * @param {Phaser.Input.Pointer} pointer - Phaser 포인터 객체
   * @private
   */
  _onPointerMove(pointer) {
    // 타워 정보 오버레이가 열려있으면 게임 입력 무시
    if (this.towerPanel && this.towerPanel.isOverlayOpen()) return;
    // 드래그 대기 중: 이동 거리가 10px 초과하면 실제 드래그 시작
    if (this._pendingDrag) {
      const dx = pointer.x - this._pendingDrag.startX;
      const dy = pointer.y - this._pendingDrag.startY;
      if (dx * dx + dy * dy > 100) { // 10px 임계값 (제곱 거리)
        this.towerPanel.startDrag(this._pendingDrag.tower, pointer);
        this._pendingDrag = null;
        this._pendingTowerClick = null; // 클릭 취소 -- 이것은 드래그
      }
    }

    // 드래그 중이면 고스트(반투명 타워 아이콘) 위치 갱신
    if (this.towerPanel && this.towerPanel.isDragging()) {
      this.towerPanel.updateDrag(pointer);
      return;
    }

    if (!this.rangePreviewGraphics) return;
    this.rangePreviewGraphics.clear();

    if (this.isGameOver || this.isPaused) return;

    const selectedType = this.towerPanel.getSelectedTowerType();
    if (!selectedType) return;

    const { x, y } = pointer;
    if (y >= PANEL_Y || y < HUD_HEIGHT) return;

    const grid = pixelToGrid(x, y);
    const { col, row } = grid;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const canBuild = this.mapManager.isBuildable(col, row);
    const towerData = TOWER_STATS[selectedType];
    if (!towerData) return;

    // Lv.1 사거리로 미리보기 원 표시
    const range = towerData.levels[1].range;
    const centerX = col * CELL_SIZE + CELL_SIZE / 2;
    const centerY = row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

    if (canBuild) {
      // 건설 가능: 초록색 사거리 원
      this.rangePreviewGraphics.fillStyle(COLORS.RANGE_FILL, 0.1);
      this.rangePreviewGraphics.fillCircle(centerX, centerY, range);
      this.rangePreviewGraphics.lineStyle(1, COLORS.BUILDABLE_HIGHLIGHT, 0.4);
      this.rangePreviewGraphics.strokeCircle(centerX, centerY, range);
    } else {
      // 건설 불가: 빨간 X 표시
      this.rangePreviewGraphics.lineStyle(2, COLORS.INVALID_PLACEMENT, 0.6);
      this.rangePreviewGraphics.lineBetween(
        centerX - 8, centerY - 8, centerX + 8, centerY + 8
      );
      this.rangePreviewGraphics.lineBetween(
        centerX + 8, centerY - 8, centerX - 8, centerY + 8
      );
    }
  }
}
