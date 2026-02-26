/**
 * @fileoverview Enemy 엔티티 - 경로를 따라 기지로 이동하는 적 유닛을 나타낸다.
 * 웨이포인트 이동, 감속 디버프, 화상/독 DoT, 방어력(resistance), 분열체 콜백,
 * HP 바 렌더링, 사망 이펙트를 처리한다.
 */

import {
  COLORS, VISUALS, ENEMY_STATS,
} from '../config.js';

/** @const {number} 보스 시각적 반지름 (충돌 판정에는 영향 없음, 렌더링 전용) */
const VISUAL_BOSS_RADIUS = 26;

/** @const {number} 장갑 보스 시각적 반지름 (충돌 판정에는 영향 없음, 렌더링 전용) */
const VISUAL_BOSS_ARMORED_RADIUS = 30;

export class Enemy {
  /**
   * 적 유닛을 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {string} type - 적 타입 ('normal','fast','tank','boss','swarm','splitter','armored','boss_armored')
   * @param {{ x: number, y: number }[]} path - 픽셀 웨이포인트 경로 배열
   * @param {object} [overrides] - 스케일링용 스탯 오버라이드 (hp, speed, gold 등)
   */
  constructor(scene, type, path, overrides = {}) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {string} 적 타입 */
    this.type = type;

    /** @type {{ x: number, y: number }[]} 이동 경로 (픽셀 좌표 배열) */
    this.path = path;

    /** @type {number} 현재 웨이포인트 인덱스 */
    this.waypointIndex = 0;

    // ── 스탯 초기화 (스케일링 오버라이드 적용) ──
    const baseStats = ENEMY_STATS[type];
    /** @type {number} 최대 체력 */
    this.maxHp = overrides.hp || baseStats.hp;
    /** @type {number} 현재 체력 */
    this.hp = this.maxHp;
    /** @type {number} 기본 이동속도 (디버프 해제 시 복원용) */
    this.baseSpeed = overrides.speed || baseStats.speed;
    /** @type {number} 현재 이동속도 */
    this.speed = this.baseSpeed;
    /** @type {number} 처치 시 골드 보상 */
    this.gold = overrides.gold != null ? overrides.gold : baseStats.gold;
    /** @type {number} 기지 도달 시 가하는 데미지 */
    this.damage = overrides.damage || baseStats.damage;

    // ── 위치 초기화 ──
    /** @type {number} 현재 픽셀 X 좌표 */
    this.x = path[0].x;
    /** @type {number} 현재 픽셀 Y 좌표 */
    this.y = path[0].y;

    // ── 감속 디버프 ──
    /** @type {number} 감속 잔여 시간 (초) */
    this.slowTimer = 0;
    /** @type {number} 감속 비율 (0~1, 예: 0.3 = 30% 감속) */
    this.slowAmount = 0;

    // ── 화상 DoT (화염/빛 타워) ──
    /** @type {number} 초당 화상 데미지 */
    this.burnDamage = 0;
    /** @type {number} 화상 잔여 시간 (초) */
    this.burnTimer = 0;

    // ── 독 DoT (독 타워) ──
    /** @type {number} 스택당 초당 독 데미지 */
    this.poisonDamage = 0;
    /** @type {number} 독 잔여 시간 (초) */
    this.poisonTimer = 0;
    /** @type {number} 독 중첩 수 (최대 2) */
    this.poisonStacks = 0;

    // ── 방어력 감소 디버프 (독 타워) ──
    /** @type {number} 방어력 감소 비율 (0.0~1.0) */
    this.armorReduction = 0;
    /** @type {number} 방어력 감소 잔여 시간 (초) */
    this.armorReductionTimer = 0;

    // ── 방어력 (장갑 적) ──
    /** @type {number} 데미지 저항 비율 (0.0~1.0, 예: 0.4 = 40% 감소) */
    this.resistance = overrides.resistance != null ? overrides.resistance : (baseStats.resistance || 0);

    // ── 면역 (데이터 기반 상태이상 면역) ──
    /** @type {Set<string>} 면역 상태이상 목록 ('slow','burn','poison' 등) */
    this.immunities = new Set(baseStats.immunities || []);

    // ── 분열 콜백 ──
    /** @type {Function|null} 분열체 사망 시 호출되는 콜백 */
    this.onSplit = null;

    // ── 밀치기 잠금 ──
    /** @type {boolean} 밀치기 처리 중 여부 (중복 밀치기 방지) */
    this.isPushed = false;

    // ── 상태 플래그 ──
    /** @type {boolean} 생존 여부 */
    this.alive = true;
    /** @type {boolean} 기지 도달 여부 */
    this.reachedBase = false;

    // ── 경로 진행도 (타겟팅 우선순위: 높을수록 기지에 가까움) ──
    /** @type {number} 경로 진행도 (0.0 = 스폰, 1.0 = 기지) */
    this.pathProgress = 0;

    // ── 그래픽 초기화 ──
    /** @type {Phaser.GameObjects.Graphics} 적 도형 그래픽 */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);

    /** @type {Phaser.GameObjects.Graphics} HP 바 그래픽 */
    this.hpBarGraphics = scene.add.graphics();
    this.hpBarGraphics.setDepth(16);

    this.draw();
  }

  // ── 도형 렌더링 ────────────────────────────────────────────────

  /**
   * 적 타입에 따라 도형을 그린다.
   * 디버프 인디케이터와 HP 바도 함께 갱신한다.
   */
  draw() {
    this.graphics.clear();

    switch (this.type) {
      case 'normal':
        this.graphics.fillStyle(COLORS.ENEMY_NORMAL, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.normal.radius);
        break;

      case 'fast':
        this.graphics.fillStyle(COLORS.ENEMY_FAST, 1);
        this._drawTriangle(this.x, this.y, ENEMY_STATS.fast.size);
        break;

      case 'tank':
        this.graphics.fillStyle(COLORS.ENEMY_TANK, 1);
        this.graphics.fillRect(
          this.x - ENEMY_STATS.tank.size / 2,
          this.y - ENEMY_STATS.tank.size / 2,
          ENEMY_STATS.tank.size,
          ENEMY_STATS.tank.size
        );
        break;

      case 'boss':
        this.graphics.fillStyle(COLORS.ENEMY_BOSS, 1);
        this.graphics.fillCircle(this.x, this.y, VISUAL_BOSS_RADIUS);
        this.graphics.lineStyle(2, COLORS.BOSS_BORDER, 1);
        this.graphics.strokeCircle(this.x, this.y, VISUAL_BOSS_RADIUS);
        break;

      case 'swarm':
        this.graphics.fillStyle(COLORS.ENEMY_SWARM, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.swarm.radius);
        break;

      case 'splitter':
        this.graphics.fillStyle(COLORS.ENEMY_SPLITTER, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.splitter.radius);
        // 흰색 세로선 (분열 가능 표시)
        this.graphics.lineStyle(1, 0xffffff, 0.7);
        this.graphics.lineBetween(
          this.x, this.y - ENEMY_STATS.splitter.radius + 2,
          this.x, this.y + ENEMY_STATS.splitter.radius - 2
        );
        break;

      case 'armored': {
        const sz = ENEMY_STATS.armored.size;
        this.graphics.fillStyle(COLORS.ENEMY_ARMORED, 1);
        this.graphics.fillRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
        // 흰색 테두리 (장갑 표시)
        this.graphics.lineStyle(2, 0xffffff, 0.8);
        this.graphics.strokeRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
        // 방패 아이콘 (내부 X자)
        this.graphics.lineStyle(1, 0xffffff, 0.5);
        const inner = sz * 0.3;
        this.graphics.lineBetween(this.x - inner, this.y - inner, this.x + inner, this.y + inner);
        this.graphics.lineBetween(this.x + inner, this.y - inner, this.x - inner, this.y + inner);
        break;
      }

      case 'boss_armored': {
        const r = VISUAL_BOSS_ARMORED_RADIUS;
        this.graphics.fillStyle(COLORS.ENEMY_ARMORED, 1);
        this.graphics.fillCircle(this.x, this.y, r);
        // 금색 테두리 (보스 표시)
        this.graphics.lineStyle(3, COLORS.BOSS_BORDER, 1);
        this.graphics.strokeCircle(this.x, this.y, r);
        // 흰색 방패 X자
        this.graphics.lineStyle(2, 0xffffff, 0.6);
        const ir = r * 0.4;
        this.graphics.lineBetween(this.x - ir, this.y - ir, this.x + ir, this.y + ir);
        this.graphics.lineBetween(this.x + ir, this.y - ir, this.x - ir, this.y + ir);
        break;
      }
    }

    // 디버프 시각 인디케이터 표시
    this._drawDebuffIndicators();

    this._drawHPBar();
  }

  /**
   * 활성 디버프(감속, 화상, 독)의 시각 인디케이터를 그린다.
   * 해당 디버프가 걸려 있으면 적 위에 반투명 원을 오버레이한다.
   * @private
   */
  _drawDebuffIndicators() {
    const r = this._getRadius();

    // 감속 인디케이터 (파란색 틴트)
    if (this.slowTimer > 0) {
      this.graphics.fillStyle(COLORS.ICE_TOWER, 0.3);
      this.graphics.fillCircle(this.x, this.y, r);
    }

    // 화상 인디케이터 (주황-빨간 틴트)
    if (this.burnTimer > 0) {
      this.graphics.fillStyle(COLORS.BURN_TINT, 0.25);
      this.graphics.fillCircle(this.x, this.y, r);
    }

    // 독 인디케이터 (초록 틴트)
    if (this.poisonTimer > 0) {
      this.graphics.fillStyle(COLORS.POISON_TINT, 0.25);
      this.graphics.fillCircle(this.x, this.y, r);
    }
  }

  /**
   * 지정 좌표에 삼각형을 그린다.
   * @param {number} cx - 중심 X
   * @param {number} cy - 중심 Y
   * @param {number} size - 삼각형 크기
   * @private
   */
  _drawTriangle(cx, cy, size) {
    const half = size / 2;
    this.graphics.fillTriangle(
      cx, cy - half,
      cx - half, cy + half,
      cx + half, cy + half
    );
  }

  /**
   * 이 적의 시각적 반지름을 반환한다.
   * 적 타입별로 다른 크기를 사용한다.
   * @returns {number} 시각적 반지름 (픽셀)
   * @private
   */
  _getRadius() {
    switch (this.type) {
      case 'normal': return ENEMY_STATS.normal.radius;
      case 'fast': return 8;
      case 'tank': return ENEMY_STATS.tank.size / 2;
      case 'boss': return VISUAL_BOSS_RADIUS;
      case 'swarm': return ENEMY_STATS.swarm.radius;
      case 'splitter': return ENEMY_STATS.splitter.radius;
      case 'armored': return ENEMY_STATS.armored.size / 2;
      case 'boss_armored': return VISUAL_BOSS_ARMORED_RADIUS;
      default: return 10;
    }
  }

  // ── HP 바 ──────────────────────────────────────────────────────

  /**
   * 적 상단에 HP 바를 그린다.
   * HP가 100%이면 표시하지 않는다.
   * 보스 타입은 더 크고 금색 테두리가 있는 HP 바를 사용한다.
   * @private
   */
  _drawHPBar() {
    this.hpBarGraphics.clear();

    // HP가 최대이면 바 숨김
    if (this.hp >= this.maxHp) return;

    const ratio = this.hp / this.maxHp;
    const r = this._getRadius();
    const isBoss = this.type === 'boss' || this.type === 'boss_armored';

    // 보스 타입은 더 넓고 높은 HP 바 사용
    let barWidth, barHeight;
    if (this.type === 'boss_armored') {
      barWidth = VISUAL_BOSS_ARMORED_RADIUS * 2;
      barHeight = VISUALS.BOSS_ARMORED_HP_BAR_HEIGHT;
    } else if (this.type === 'boss') {
      barWidth = VISUAL_BOSS_RADIUS * 2;
      barHeight = VISUALS.BOSS_HP_BAR_HEIGHT;
    } else {
      barWidth = r * 2;
      barHeight = VISUALS.HP_BAR_HEIGHT;
    }

    const barX = this.x - barWidth / 2;
    const barY = this.y - r - VISUALS.HP_BAR_OFFSET_Y - barHeight;

    // 보스 금색 테두리
    if (isBoss) {
      this.hpBarGraphics.lineStyle(1, COLORS.BOSS_BORDER, 0.8);
      this.hpBarGraphics.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    }

    // 배경 (검정)
    this.hpBarGraphics.fillStyle(0x000000, 1);
    this.hpBarGraphics.fillRect(barX, barY, barWidth, barHeight);

    // HP 비율에 따른 색상 결정: 50% 초과=초록, 25% 초과=노랑, 이하=빨강
    let barColor;
    if (ratio > 0.5) {
      barColor = COLORS.HP_BAR_GREEN;
    } else if (ratio > 0.25) {
      barColor = COLORS.HP_BAR_YELLOW;
    } else {
      barColor = COLORS.HP_BAR_RED;
    }

    this.hpBarGraphics.fillStyle(barColor, 1);
    this.hpBarGraphics.fillRect(barX, barY, barWidth * ratio, barHeight);
  }

  // ── 업데이트 ───────────────────────────────────────────────────

  /**
   * 매 프레임 적의 위치를 경로를 따라 갱신하고, DoT 효과를 처리한다.
   * @param {number} delta - 프레임 델타 (초 단위, 게임 속도 적용 후)
   */
  update(delta) {
    if (!this.alive || this.reachedBase) return;

    // ── DoT 처리 ─────────────────────────────────────────────
    // 화상 DoT (장갑 적의 방어력도 적용하여 우회 방지)
    if (this.burnTimer > 0) {
      this.burnTimer -= delta;
      let burnTick = this.burnDamage * delta;
      if (this.resistance > 0) {
        // 방어력 감소 디버프를 반영한 실효 저항 적용
        burnTick = Math.max(0.1, burnTick * (1 - this.resistance * (1 - this.armorReduction)));
      }
      this.hp -= burnTick;
      if (this.burnTimer <= 0) {
        this.burnDamage = 0;
        this.burnTimer = 0;
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
        this._playDeathEffect();
        return;
      }
    }

    // 독 DoT (장갑 적의 방어력도 적용하여 우회 방지)
    if (this.poisonTimer > 0) {
      this.poisonTimer -= delta;
      // 스택 수만큼 곱한 틱 데미지 계산
      let poisonTick = this.poisonDamage * this.poisonStacks * delta;
      if (this.resistance > 0) {
        poisonTick = Math.max(0.1, poisonTick * (1 - this.resistance * (1 - this.armorReduction)));
      }
      this.hp -= poisonTick;
      if (this.poisonTimer <= 0) {
        this.poisonDamage = 0;
        this.poisonTimer = 0;
        this.poisonStacks = 0;
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
        this._playDeathEffect();
        return;
      }
    }

    // 방어력 감소 타이머 처리
    if (this.armorReductionTimer > 0) {
      this.armorReductionTimer -= delta;
      if (this.armorReductionTimer <= 0) {
        this.armorReduction = 0;
      }
    }

    // ── 감속 처리 ────────────────────────────────────────────
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowAmount = 0;
        this.speed = this.baseSpeed;
      } else {
        this.speed = this.baseSpeed * (1 - this.slowAmount);
      }
    }

    // ── 이동 처리 ────────────────────────────────────────────
    if (this.waypointIndex >= this.path.length - 1) {
      this.reachedBase = true;
      return;
    }

    const target = this.path[this.waypointIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 0) {
      this.waypointIndex++;
      this.pathProgress = this.waypointIndex / (this.path.length - 1);
      return;
    }

    const moveAmount = this.speed * delta;

    if (moveAmount >= dist) {
      // 웨이포인트 도달
      this.x = target.x;
      this.y = target.y;
      this.waypointIndex++;
      this.pathProgress = this.waypointIndex / (this.path.length - 1);

      // 기지 도달 확인
      if (this.waypointIndex >= this.path.length - 1) {
        this.reachedBase = true;
      }
    } else {
      // 다음 웨이포인트를 향해 이동
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * moveAmount;
      this.y += ny * moveAmount;

      // 웨이포인트 사이 보간을 포함한 경로 진행도 계산
      const remainingDist = dist - moveAmount;
      const wp1 = this.path[this.waypointIndex];
      const wp2 = this.path[this.waypointIndex + 1];
      const segDx = wp2.x - wp1.x;
      const segDy = wp2.y - wp1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      const fractionCompleted = segLen > 0 ? 1 - (remainingDist / segLen) : 0;
      this.pathProgress = (this.waypointIndex + fractionCompleted) / (this.path.length - 1);
    }

    this.draw();
  }

  // ── 데미지 / 디버프 ───────────────────────────────────────────

  /**
   * 이 적에게 데미지를 가한다. 방어력(resistance)이 있으면 감산한다.
   * @param {number} amount - 데미지 양
   * @param {boolean} [armorPiercing=false] - true이면 방어력 무시
   * @returns {boolean} 이 데미지로 적이 사망했으면 true
   */
  takeDamage(amount, armorPiercing = false) {
    if (!this.alive) return false;

    let finalDamage = amount;
    if (this.resistance > 0 && !armorPiercing) {
      // 실효 저항 = resistance * (1 - armorReduction), 최소 데미지 1 보장
      finalDamage = Math.max(1, Math.floor(amount * (1 - this.resistance * (1 - this.armorReduction))));
    }

    this.hp -= finalDamage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
      this._playDeathEffect();
      return true;
    }
    return false;
  }

  /**
   * 특정 상태이상에 면역인지 확인한다.
   * @param {string} effectType - 효과 키 ('slow','burn','poison','armorReduction','pushback')
   * @returns {boolean} 면역이면 true
   */
  isImmune(effectType) {
    return this.immunities.has(effectType);
  }

  /**
   * 감속 디버프를 적용한다. 더 강한 감속이 약한 감속을 덮어쓴다.
   * @param {number} amount - 감속 비율 (0~1, 예: 0.3 = 30% 감속)
   * @param {number} duration - 지속 시간 (초)
   */
  applySlow(amount, duration) {
    if (this.isImmune('slow')) return;
    if (amount > this.slowAmount || this.slowTimer <= 0) {
      this.slowAmount = amount;
      this.slowTimer = duration;
      this.speed = this.baseSpeed * (1 - this.slowAmount);
    }
  }

  /**
   * 화상 DoT를 적용한다. 더 강한 화상이 약한 화상을 덮어쓴다.
   * @param {number} damagePerSecond - 초당 화상 데미지
   * @param {number} duration - 화상 지속 시간 (초)
   */
  applyBurn(damagePerSecond, duration) {
    if (this.isImmune('burn')) return;
    if (damagePerSecond > this.burnDamage || this.burnTimer <= 0) {
      this.burnDamage = damagePerSecond;
      this.burnTimer = duration;
    }
  }

  /**
   * 독 DoT를 적용한다. 중첩(스택) 시스템을 지원한다.
   * @param {number} damagePerSecond - 스택당 초당 독 데미지
   * @param {number} duration - 독 지속 시간 (초)
   * @param {number} [maxStacks=1] - 최대 허용 중첩 수
   */
  applyPoison(damagePerSecond, duration, maxStacks = 1) {
    if (this.isImmune('poison')) return;
    if (this.poisonTimer <= 0) {
      // 새 독 적용
      this.poisonDamage = damagePerSecond;
      this.poisonTimer = duration;
      this.poisonStacks = 1;
    } else if (maxStacks > 1 && this.poisonStacks < maxStacks) {
      // 스택 추가 및 타이머 갱신
      this.poisonStacks++;
      this.poisonTimer = duration;
      this.poisonDamage = damagePerSecond;
    } else {
      // 더 강한 독으로 교체하거나 타이머만 갱신
      if (damagePerSecond >= this.poisonDamage) {
        this.poisonDamage = damagePerSecond;
        this.poisonTimer = duration;
      }
    }
  }

  /**
   * 방어력 감소 디버프를 적용한다.
   * @param {number} reductionRatio - 방어력 감소율 (0.0~1.0)
   * @param {number} duration - 지속 시간 (초)
   */
  applyArmorReduction(reductionRatio, duration) {
    if (this.isImmune('armorReduction')) return;
    if (reductionRatio > this.armorReduction || this.armorReductionTimer <= 0) {
      this.armorReduction = reductionRatio;
      this.armorReductionTimer = duration;
    }
  }

  /**
   * 적을 경로를 따라 뒤로 밀어낸다.
   * 밀치기 처리 중이거나, 경로 시작점에 있거나, 면역이면 무시한다.
   * @param {number} distance - 밀치기 거리 (픽셀)
   */
  pushBack(distance) {
    if (this.isPushed || this.waypointIndex <= 0) return;
    if (this.isImmune('pushback')) return;
    this.isPushed = true;

    // 웨이포인트 세그먼트를 역방향으로 되감으며 거리 차감
    let remaining = distance;
    let idx = this.waypointIndex;

    while (remaining > 0 && idx > 0) {
      const prev = this.path[idx - 1];
      const curr = this.path[idx];
      const segDx = curr.x - prev.x;
      const segDy = curr.y - prev.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

      if (segLen <= remaining) {
        remaining -= segLen;
        idx--;
      } else {
        // 세그먼트 내에서 부분 되감기
        const ratio = remaining / segLen;
        this.x = curr.x - segDx * ratio;
        this.y = curr.y - segDy * ratio;
        remaining = 0;
      }
    }

    if (remaining > 0) {
      // 경로 시작점까지 도달
      idx = 0;
    }

    this.waypointIndex = idx;
    if (remaining > 0 || idx === 0) {
      this.x = this.path[idx].x;
      this.y = this.path[idx].y;
    }
    this.pathProgress = this.waypointIndex / (this.path.length - 1);

    this.isPushed = false;
  }

  // ── 사망 이펙트 ────────────────────────────────────────────────

  /**
   * 사망 시 파티클 이펙트를 재생한다.
   * 확장 링 + 랜덤 속도 파티클로 구성되며, 보스는 추가 링이 표시된다.
   * @private
   */
  _playDeathEffect() {
    const effectGraphics = this.scene.add.graphics();
    effectGraphics.setDepth(20);
    const baseStats = ENEMY_STATS[this.type];
    const color = baseStats ? baseStats.color : 0xffffff;
    const isBoss = this.type === 'boss' || this.type === 'boss_armored';

    // 확장 링 이펙트 생성
    let elapsed = 0;
    const duration = isBoss ? 500 : VISUALS.DEATH_EFFECT_DURATION;
    const maxRadius = this._getRadius() * 2;
    const deathX = this.x;
    const deathY = this.y;

    // 랜덤 속도 벡터를 가진 파티클 생성 (보스는 12개, 일반은 8개)
    const particleCount = isBoss ? 12 : 8;
    const maxParticleSize = isBoss ? 5 : 3;
    const particles = Array.from({ length: particleCount }, () => ({
      x: deathX,
      y: deathY,
      vx: (Math.random() - 0.5) * 120,   // 랜덤 X 속도 (-60 ~ +60)
      vy: (Math.random() - 0.5) * 120,   // 랜덤 Y 속도 (-60 ~ +60)
      life: 1.0,
      size: 1 + Math.random() * (maxParticleSize - 1),
    }));

    const timer = this.scene.time.addEvent({
      delay: 16,  // ~60fps
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;
        const radius = maxRadius * progress;
        const alpha = 1 - progress;
        const dt = 16 / 1000;

        effectGraphics.clear();
        effectGraphics.lineStyle(2, color, alpha);
        effectGraphics.strokeCircle(deathX, deathY, radius);

        // 보스 전용 대형 금색 링
        if (isBoss) {
          const bossRingRadius = 60 * progress;
          effectGraphics.lineStyle(3, COLORS.BOSS_BORDER, alpha * 0.8);
          effectGraphics.strokeCircle(deathX, deathY, bossRingRadius);
        }

        // 파티클 물리 시뮬레이션
        for (const p of particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt / (duration / 1000);

          if (p.life > 0) {
            effectGraphics.fillStyle(color, p.life * 0.8);
            effectGraphics.fillCircle(p.x, p.y, p.size * p.life);
          }
        }

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  // ── 정리 ───────────────────────────────────────────────────────

  /**
   * 모든 그래픽을 제거하고 리소스를 정리한다.
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    if (this.hpBarGraphics) {
      this.hpBarGraphics.destroy();
      this.hpBarGraphics = null;
    }
  }
}
