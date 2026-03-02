/**
 * @fileoverview Tower 엔티티 - 그리드에 배치되는 방어 타워를 나타낸다.
 * 타워 도형 렌더링, 공격 쿨다운, 타겟팅(First 우선순위), A/B 분기 업그레이드,
 * 공격 유형 디스패치(single, splash, chain, aoe_instant, piercing_beam, dot_single)를 처리한다.
 */

import {
  TOWER_STATS, SELL_RATIO, COLORS, VISUALS,
  TOWER_SHAPE_SIZE, gridToPixel,
  MAX_ENHANCE_LEVEL, ENHANCE_STAT_BONUS, calcEnhanceCost,
  isMergeable, isUsedAsMergeIngredient, MERGED_TOWER_STATS,
  MERGE_RECIPES,
} from '../config.js';
import { t } from '../i18n.js';

export class Tower {
  /**
   * 타워를 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {string} type - 타워 종류 ('archer', 'mage', 'ice', 'lightning' 등)
   * @param {number} col - 그리드 열 좌표
   * @param {number} row - 그리드 행 좌표
   */
  constructor(scene, type, col, row) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {string} 기본 타워 타입 */
    this.type = type;

    /** @type {number} 합성 티어 (1=기본, 2~5=합성) */
    this.tier = 1;

    /** @type {string|null} 합성 결과 ID (기본 타워는 null) */
    this.mergeId = null;

    /** @type {number} 그리드 열 좌표 */
    this.col = col;

    /** @type {number} 그리드 행 좌표 */
    this.row = row;

    // 그리드 좌표를 픽셀 좌표로 변환
    const pos = gridToPixel(col, row);
    /** @type {number} 픽셀 X 좌표 */
    this.x = pos.x;
    /** @type {number} 픽셀 Y 좌표 */
    this.y = pos.y;

    /** @type {object} 현재 레벨의 스탯 (damage, range, fireRate 등) */
    this.stats = { ...TOWER_STATS[type].levels[1] };

    /** @type {number} 공격 쿨다운 타이머 (초 단위) */
    this.cooldownTimer = 0;

    /** @type {number} 강화 레벨 (0 = 미강화, 최대 10) */
    this.enhanceLevel = 0;

    /** @type {number} 강화에 투자한 총 골드 */
    this.enhanceInvested = 0;

    /** @type {number} 총 투자 골드 (판매가 계산용) */
    this.totalInvested = this.stats.cost;

    // ── 그래픽 초기화 ──
    // Y좌표 기반 depth: 아래쪽 타워(Y값 큰)가 위쪽 타워를 자연스럽게 가림
    const towerDepth = 10 + (this.y / 1000);

    /** @type {Phaser.GameObjects.Graphics} 타워 도형 그래픽 */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(towerDepth);

    // T1 기본 타워 스프라이트 (텍스처가 존재하면 도형 대신 이미지 사용)
    const textureKey = `tower_${type}`;
    if (scene.textures.exists(textureKey)) {
      /** @type {Phaser.GameObjects.Sprite|null} T1 타워 스프라이트 (합성 시 제거) */
      this.sprite = scene.add.sprite(this.x, this.y, textureKey);
      this.sprite.setDisplaySize(64, 64);
      this.sprite.setDepth(towerDepth);
    } else {
      this.sprite = null;
    }

    /** @type {Phaser.GameObjects.Graphics|null} 사거리 원 그래픽 (선택 시 표시) */
    this.rangeGraphics = null;

    this.draw();
  }

  // ── 색상 ──────────────────────────────────────────────────────

  /**
   * 이 타워의 표시 색상을 반환한다.
   * 합성 타워는 MERGE_RECIPES의 색상을, 기본 타워는 TOWER_STATS의 색상을 사용한다.
   * @returns {number} 16진수 색상 값
   * @private
   */
  _getColor() {
    if (this.mergeId) {
      // 합성 ID → 색상 맵을 정적 캐시로 관리 (최초 1회만 생성)
      if (!Tower._mergeColorMap) {
        Tower._mergeColorMap = {};
        for (const recipe of Object.values(MERGE_RECIPES)) {
          Tower._mergeColorMap[recipe.id] = recipe.color;
        }
      }
      const color = Tower._mergeColorMap[this.mergeId];
      if (color !== undefined) return color;
    }
    return TOWER_STATS[this.type].color;
  }

  // ── 도형 렌더링 ────────────────────────────────────────────────

  /**
   * 타워 타입과 레벨에 따라 도형을 그린다.
   * 마법진 발판을 가장 먼저 그리고, 티어 >= 2이면 테두리 표시,
   * 강화 레벨 > 0이면 발광 효과를 추가한다.
   */
  draw() {
    this.graphics.clear();

    // 마법진 발판을 타워 아래에 렌더링
    this._drawRuneBase();

    // 스프라이트가 있으면 도형 그리기를 건너뛴다 (T1 기본 타워)
    if (!this.sprite) {
      const color = this._getColor();
      const sizeScale = 1.0;

      switch (this.type) {
        case 'archer':
          this._drawArcher(color, sizeScale);
          break;
        case 'mage':
          this._drawMage(color, sizeScale);
          break;
        case 'ice':
          this._drawIce(color, sizeScale);
          break;
        case 'lightning':
          this._drawLightning(color, sizeScale);
          break;
        case 'flame':
          this._drawFlame(color, sizeScale);
          break;
        case 'rock':
          this._drawRock(color, sizeScale);
          break;
        case 'poison':
          this._drawPoison(color, sizeScale);
          break;
        case 'wind':
          this._drawWind(color, sizeScale);
          break;
        case 'light':
          this._drawLight(color, sizeScale);
          break;
        case 'dragon':
          this._drawDragon(color, sizeScale);
          break;
      }
    }

    // 티어 2 이상이면 등급별 테두리 표시
    if (this.tier >= 2) {
      this._drawTierBorder();
    }

    // 강화 레벨이 있으면 황금 발광 링 표시
    if (this.enhanceLevel > 0) {
      this._drawEnhanceGlow();
    }
  }

  /**
   * 티어별 테두리 인디케이터를 그린다.
   * 마법진 이미지가 존재하면 마법진으로 대체되므로 생략한다.
   * 티어 2 = 실버, 티어 3 = 골드, 티어 4 = 퍼플, 티어 5 = 레인보우(간략화).
   * @private
   */
  _drawTierBorder() {
    // 마법진 이미지가 있으면 테두리 대신 마법진으로 대체
    if (this.runeSprite) return;
    const tierColors = {
      2: { color: 0xb2bec3, alpha: 0.8, width: 2 },    // 실버
      3: { color: 0xffd700, alpha: 0.7, width: 2.5 },   // 골드
      4: { color: 0xa29bfe, alpha: 0.8, width: 3 },     // 퍼플
    };

    const tierStyle = tierColors[this.tier];
    if (!tierStyle && this.tier < 5) return;

    // 티어 5: 레인보우 효과 대신 퍼플-골드 혼합으로 간략화
    const borderColor = tierStyle ? tierStyle.color : 0xffd700;
    const borderAlpha = tierStyle ? tierStyle.alpha : 0.9;
    const borderWidth = tierStyle ? tierStyle.width : 3;

    this.graphics.lineStyle(borderWidth, borderColor, borderAlpha);
    this.graphics.strokeCircle(this.x, this.y, 20);
  }

  // ── 타워 도형 그리기 ────────────────────────────────────────────

  /**
   * 아처 타워를 그린다 (위를 향한 삼각형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawArcher(color, sizeScale = 1.0) {
    const s = TOWER_SHAPE_SIZE.archer * sizeScale;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillTriangle(
      this.x, this.y - s / 2,
      this.x - s / 2, this.y + s / 2,
      this.x + s / 2, this.y + s / 2
    );
  }

  /**
   * 마법사 타워를 그린다 (원형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawMage(color, sizeScale = 1.0) {
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, TOWER_SHAPE_SIZE.mage * sizeScale);
  }

  /**
   * 얼음 타워를 그린다 (다이아몬드/회전된 정사각형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawIce(color, sizeScale = 1.0) {
    const sz = (TOWER_SHAPE_SIZE.ice * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillPoints([
      { x: this.x, y: this.y - sz },
      { x: this.x + sz, y: this.y },
      { x: this.x, y: this.y + sz },
      { x: this.x - sz, y: this.y },
    ], true);
  }

  /**
   * 번개 타워를 그린다 (지그재그 번개 기호).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawLightning(color, sizeScale = 1.0) {
    const h = TOWER_SHAPE_SIZE.lightning * sizeScale;
    const halfH = h / 2;
    const w = h * 0.35;
    this.graphics.lineStyle(3, color, 1);
    // N자 형태의 지그재그 번개
    this.graphics.lineBetween(this.x - w / 2, this.y - halfH, this.x + w / 2, this.y - halfH * 0.3);
    this.graphics.lineBetween(this.x + w / 2, this.y - halfH * 0.3, this.x - w / 2, this.y + halfH * 0.3);
    this.graphics.lineBetween(this.x - w / 2, this.y + halfH * 0.3, this.x + w / 2, this.y + halfH);
  }

  /**
   * 화염 타워를 그린다 (원형 + 상단 불꽃 삼각형 3개).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawFlame(color, sizeScale = 1.0) {
    const r = TOWER_SHAPE_SIZE.flame * sizeScale;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, r);

    // 상단에 불꽃 삼각형 3개 그리기
    this.graphics.fillStyle(0xfdcb6e, 0.9);
    const flameScale = sizeScale;
    const offsets = [-6 * flameScale, 0, 6 * flameScale];
    for (const ox of offsets) {
      const tx = this.x + ox;
      const ty = this.y - r - 2;
      this.graphics.fillTriangle(
        tx, ty - 6 * flameScale,
        tx - 3 * flameScale, ty + 2,
        tx + 3 * flameScale, ty + 2
      );
    }
  }

  /**
   * 바위 타워를 그린다 (정육각형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawRock(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.rock * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillHexagon(this.x, this.y, r);
  }

  /**
   * 지정 좌표 중심에 정육각형을 채워 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _fillHexagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * 지정 좌표 중심에 정육각형 외곽선을 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _strokeHexagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * 독 타워를 그린다 (정오각형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawPoison(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.poison * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillPentagon(this.x, this.y, r);
  }

  /**
   * 지정 좌표 중심에 정오각형을 채워 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _fillPentagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * 지정 좌표 중심에 정오각형 외곽선을 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _strokePentagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * 바람 타워를 그린다 (상단 반원 + 바람 곡선 3줄).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawWind(color, sizeScale = 1.0) {
    this.graphics.fillStyle(color, 1);
    // 상단 반원
    this.graphics.slice(this.x, this.y, 12 * sizeScale, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    this.graphics.fillPath();

    // 바람을 나타내는 곡선 3줄
    this.graphics.lineStyle(2, color, 0.7);
    for (let i = 0; i < 3; i++) {
      const offsetX = (-6 + i * 6) * sizeScale;
      const startY = this.y + 2;
      this.graphics.lineBetween(
        this.x + offsetX, startY,
        this.x + offsetX + 3 * sizeScale, startY + (6 + i * 2) * sizeScale
      );
    }
  }

  /**
   * 빛 타워를 그린다 (정팔각형).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawLight(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.light * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillOctagon(this.x, this.y, r);
  }

  /**
   * 지정 좌표 중심에 정팔각형을 채워 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _fillOctagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * 지정 좌표 중심에 정팔각형 외곽선을 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} r - 반지름
   * @private
   */
  _strokeOctagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * 드래곤 타워를 그린다 (원형 본체 + X자 날개).
   * @param {number} color - 채움 색상
   * @param {number} sizeScale - 크기 배율
   * @private
   */
  _drawDragon(color, sizeScale = 1.0) {
    const r = 16 * sizeScale;
    // 메인 본체
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, r);

    // 금색 테두리
    this.graphics.lineStyle(2, 0xffd700, 1);
    this.graphics.strokeCircle(this.x, this.y, r);

    // X자 날개
    this.graphics.lineStyle(3, color, 0.8);
    const wx = 14 * sizeScale;
    const wy = 10 * sizeScale;
    this.graphics.lineBetween(this.x - wx, this.y - wy, this.x + wx, this.y + wy);
    this.graphics.lineBetween(this.x + wx, this.y - wy, this.x - wx, this.y + wy);
  }

  // ── 마법진 발판 ───────────────────────────────────────────────

  /**
   * 타워 아래에 티어별 마법진 발판 이미지를 렌더링한다.
   * rune_t1~rune_t5 텍스처가 존재할 때만 표시하며,
   * 타워 스프라이트보다 낮은 depth로 배치한다.
   * @private
   */
  _drawRuneBase() {
    // 기존 마법진 스프라이트가 있으면 먼저 정리
    if (this.runeSprite) {
      this.runeSprite.destroy();
      this.runeSprite = null;
    }

    const runeKey = `rune_t${this.tier}`;
    if (!this.scene.textures.exists(runeKey)) return;

    const towerDepth = 10 + (this.y / 1000);
    this.runeSprite = this.scene.add.image(this.x, this.y, runeKey)
      .setDisplaySize(64, 64)
      .setDepth(towerDepth - 0.5);
  }

  // ── 강화 (Lv.3+ 골드 싱크) ────────────────────────────────────

  /**
   * 강화 레벨에 따른 황금 발광 링을 그린다.
   * 강화 레벨이 높을수록 발광 강도가 증가한다.
   * @private
   */
  _drawEnhanceGlow() {
    // 강화 레벨에 비례하여 알파값 0.2~0.7로 증가
    const alpha = 0.2 + (this.enhanceLevel / MAX_ENHANCE_LEVEL) * 0.5;
    // 발광 반지름도 강화 레벨에 따라 미세하게 증가
    const glowRadius = 22 + this.enhanceLevel * 0.5;
    this.graphics.lineStyle(1.5, 0xffd700, alpha);
    this.graphics.strokeCircle(this.x, this.y, glowRadius);
  }

  /**
   * 타워를 강화한다 (Lv.3 이상만 가능). 복리 스탯 보너스를 적용한다.
   * damage x 1.05, range x 1.025, fireRate x 0.975 (최소 0.3초)
   * @returns {boolean} 강화 성공 여부
   */
  enhance() {
    if (!this.canEnhance()) return false;

    this.enhanceLevel++;
    const cost = calcEnhanceCost(this.enhanceLevel);
    this.enhanceInvested += cost;
    this.totalInvested += cost;

    // 복리 보너스 적용: 데미지 +5%, 사거리 +2.5%, 공격속도 -2.5%
    this.stats.damage = Math.round(this.stats.damage * (1 + ENHANCE_STAT_BONUS));
    this.stats.range = Math.round(this.stats.range * (1 + ENHANCE_STAT_BONUS * 0.5));
    this.stats.fireRate = Math.max(0.3, this.stats.fireRate * (1 - ENHANCE_STAT_BONUS * 0.5));

    this.draw();
    return true;
  }

  /**
   * 다음 강화 레벨에 필요한 비용을 반환한다.
   * @returns {number|null} 비용, 또는 최대 레벨이면 null
   */
  getEnhanceCost() {
    if (!this.canEnhance()) return null;
    return calcEnhanceCost(this.enhanceLevel + 1);
  }

  /**
   * 타워 강화 가능 여부를 확인한다.
   * 강화 레벨이 최대 미만이고, 합성 재료로 사용되지 않는 타워만 강화 가능하다.
   * @returns {boolean} 강화 가능 여부
   */
  canEnhance() {
    const id = this.mergeId || this.type;
    return this.enhanceLevel < MAX_ENHANCE_LEVEL && !isUsedAsMergeIngredient(id);
  }

  // ── 공격 로직 ──────────────────────────────────────────────────

  /**
   * 매 프레임 타워의 공격 로직을 갱신한다.
   * 쿨다운이 끝나면 사거리 내 가장 진행도가 높은 적을 찾아 공격 유형에 맞게 발사한다.
   * @param {number} delta - 프레임 델타 (초 단위, 게임 속도 적용 후)
   * @param {Enemy[]} enemies - 활성 적 배열
   * @param {Function} createProjectile - 투사체 생성 콜백
   * @param {Function} [applyAoeInstant] - 즉시 범위 공격 콜백
   * @param {Function} [applyChain] - 체인 라이트닝 공격 콜백
   * @param {Function} [applyBeam] - 관통 빔 공격 콜백
   */
  update(delta, enemies, createProjectile, applyAoeInstant, applyChain, applyBeam) {
    // 쿨다운 차감
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
      return;
    }

    // First 우선순위 타겟 탐색: 사거리 내에서 경로 진행도가 가장 높은 적
    const target = this._findTarget(enemies);
    if (!target) return;

    // 공격 발사 및 쿨다운 재설정
    this.cooldownTimer = this.stats.fireRate;
    const attackType = this.stats.attackType || 'single';

    switch (attackType) {
      case 'single':
      case 'splash':
      case 'dot_single':
        createProjectile(this, target);
        break;
      case 'dot_splash':
      case 'aoe_instant':
        if (applyAoeInstant) applyAoeInstant(this, target, enemies);
        break;
      case 'chain':
        if (applyChain) applyChain(this, target, enemies);
        break;
      case 'piercing_beam':
        if (applyBeam) applyBeam(this, target, enemies);
        break;
    }
  }

  /**
   * 사거리 내에서 First 타겟팅(경로 진행도가 가장 높은 적)으로 최적 대상을 찾는다.
   * @param {Enemy[]} enemies - 활성 적 목록
   * @returns {Enemy|null} 최적 대상 또는 null
   * @private
   */
  _findTarget(enemies) {
    let bestTarget = null;
    let bestProgress = -1;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.stats.range && enemy.pathProgress > bestProgress) {
        bestProgress = enemy.pathProgress;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }

  // ── 합성 / 판매 ───────────────────────────────────────────────

  /**
   * 합성 결과를 이 타워에 적용하여 합성 타워로 변환한다.
   * @param {object} mergeData - MERGE_RECIPES의 합성 데이터 { id, tier, displayName, color }
   */
  applyMergeResult(mergeData) {
    this.mergeId = mergeData.id;
    this.tier = mergeData.tier;

    // 기존 스프라이트 제거
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    // 합성 타워 스프라이트 로드 (텍스처가 존재하면 이미지 사용)
    const textureKey = `tower_${mergeData.id}`;
    if (this.scene.textures.exists(textureKey)) {
      this.sprite = this.scene.add.sprite(this.x, this.y, textureKey);
      this.sprite.setDisplaySize(64, 64);
      // Y좌표 기반 depth: 아래쪽 타워가 위쪽 타워를 자연스럽게 가림
      this.sprite.setDepth(10 + (this.y / 1000));
    }

    // MERGED_TOWER_STATS에서 합성 타워 스탯 로드
    const mergedStats = MERGED_TOWER_STATS[mergeData.id];
    if (mergedStats) {
      this.stats = { ...mergedStats };
    }

    this.draw();
  }

  /**
   * 판매 가격을 반환한다 (총 투자액의 60%).
   * @returns {number} 골드 환급량
   */
  getSellPrice() {
    return Math.floor(this.totalInvested * SELL_RATIO);
  }

  /**
   * 타워 주변에 사거리 원을 표시한다.
   * 타워 고유 색상으로 반투명 채움 + 이중 테두리 효과를 사용한다.
   */
  showRangeCircle() {
    this.hideRangeCircle();
    const color = this._getColor();
    this.rangeGraphics = this.scene.add.graphics();
    this.rangeGraphics.setDepth(8);
    // 타워 고유 색상으로 반투명 채움
    this.rangeGraphics.fillStyle(color, 0.12);
    this.rangeGraphics.fillCircle(this.x, this.y, this.stats.range);
    // 내부 테두리
    this.rangeGraphics.lineStyle(VISUALS.RANGE_LINE_WIDTH, color, 0.3);
    this.rangeGraphics.strokeCircle(this.x, this.y, this.stats.range);
    // 외부 테두리 (이중 테두리 효과)
    this.rangeGraphics.lineStyle(VISUALS.RANGE_LINE_WIDTH, color, 0.3);
    this.rangeGraphics.strokeCircle(this.x, this.y, this.stats.range + 1);
  }

  /**
   * 사거리 원을 숨긴다.
   */
  hideRangeCircle() {
    if (this.rangeGraphics) {
      this.rangeGraphics.destroy();
      this.rangeGraphics = null;
    }
  }

  /**
   * UI 패널에 표시할 타워 정보를 반환한다.
   * 합성 타워는 i18n 키로, 기본 타워는 TOWER_STATS의 displayName을 사용한다.
   * @returns {object} 타워 정보 객체 (name, damage, fireRate, range, sellPrice 등)
   */
  getInfo() {
    // 표시 이름 결정: 합성 타워는 i18n 키, 기본 타워는 TOWER_STATS 참조
    let name;
    if (this.mergeId) {
      name = t(`tower.${this.mergeId}.name`) || this.mergeId;
    } else {
      name = t(`tower.${this.type}.name`) || TOWER_STATS[this.type].displayName;
    }

    return {
      name,
      type: this.type,
      tier: this.tier,
      mergeId: this.mergeId,
      displayName: name,
      isMergeable: isMergeable(this),
      damage: this.stats.damage,
      fireRate: this.stats.fireRate,
      range: this.stats.range,
      sellPrice: this.getSellPrice(),
      // 강화 정보
      enhanceLevel: this.enhanceLevel,
      canEnhance: this.canEnhance(),
      enhanceCost: this.getEnhanceCost(),
    };
  }

  /**
   * 모든 그래픽을 제거하고 리소스를 정리한다.
   */
  destroy() {
    this.hideRangeCircle();
    if (this.runeSprite) {
      this.runeSprite.destroy();
      this.runeSprite = null;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
