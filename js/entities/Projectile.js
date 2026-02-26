/**
 * @fileoverview Projectile 엔티티 - 타워에서 적을 향해 발사되는 투사체를 나타낸다.
 * 이동, 명중 판정, 스플래시 데미지, 감속 적용, DoT 적용,
 * 방어력 관통, 밀치기 효과를 처리한다.
 */

import {
  COLORS, PROJECTILE_SIZE, VISUALS,
} from '../config.js';

export class Projectile {
  /**
   * 투사체를 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {string} towerType - 발사한 타워의 타입
   * @param {number} startX - 시작 X 좌표
   * @param {number} startY - 시작 Y 좌표
   * @param {object} target - 목표 적
   * @param {number} damage - 데미지 양
   * @param {number} speed - 투사체 속도 (px/s)
   * @param {object} [extra] - 특수 효과용 추가 속성
   * @param {number} [extra.splashRadius] - 스플래시 데미지 반경
   * @param {number} [extra.slowAmount] - 감속 비율 (0~1)
   * @param {number} [extra.slowDuration] - 감속 지속 시간 (초)
   * @param {number} [extra.burnDamage] - 초당 화상 데미지
   * @param {number} [extra.burnDuration] - 화상 지속 시간 (초)
   * @param {boolean} [extra.armorPiercing] - 방어력 관통 여부
   * @param {number} [extra.pushbackDistance] - 밀치기 거리 (픽셀)
   * @param {string} [extra.attackType] - 명중 처리용 공격 유형
   */
  constructor(scene, towerType, startX, startY, target, damage, speed, extra = {}) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {string} 발사 타워 타입 (도형 결정용) */
    this.towerType = towerType;

    /** @type {number} 현재 X 좌표 */
    this.x = startX;

    /** @type {number} 현재 Y 좌표 */
    this.y = startY;

    /** @type {object} 목표 적 참조 */
    this.target = target;

    /** @type {number} 데미지 양 */
    this.damage = damage;

    /** @type {number} 이동 속도 (px/s) */
    this.speed = speed;

    /** @type {number|null} 스플래시 반경 (null이면 스플래시 없음) */
    this.splashRadius = extra.splashRadius || null;

    /** @type {number} 감속 비율 (0이면 감속 없음) */
    this.slowAmount = extra.slowAmount || 0;

    /** @type {number} 감속 지속 시간 (초) */
    this.slowDuration = extra.slowDuration || 0;

    /** @type {number} 초당 화상 데미지 */
    this.burnDamage = extra.burnDamage || 0;

    /** @type {number} 화상 지속 시간 (초) */
    this.burnDuration = extra.burnDuration || 0;

    /** @type {boolean} 방어력 관통 플래그 */
    this.armorPiercing = extra.armorPiercing || false;

    /** @type {number} 밀치기 거리 (픽셀) */
    this.pushbackDistance = extra.pushbackDistance || 0;

    /** @type {number} 방어력 감소량 (0~1) */
    this.armorReduction = extra.armorReduction || 0;

    /** @type {number} 방어력 감소 지속 시간 (초) */
    this.armorReductionDuration = extra.armorReductionDuration || 0;

    /** @type {number} 초당 독 데미지 */
    this.poisonDamage = extra.poisonDamage || 0;

    /** @type {number} 독 지속 시간 (초) */
    this.poisonDuration = extra.poisonDuration || 0;

    /** @type {number} 최대 독 중첩 수 */
    this.maxPoisonStacks = extra.maxPoisonStacks || 1;

    /** @type {string} 명중 처리용 공격 유형 */
    this.attackType = extra.attackType || 'single';

    /** @type {boolean} 투사체 활성 상태 */
    this.active = true;

    /** @type {number} 마지막으로 알려진 대상 X 좌표 (대상 사망 시 사용) */
    this.targetX = target.x;

    /** @type {number} 마지막으로 알려진 대상 Y 좌표 (대상 사망 시 사용) */
    this.targetY = target.y;

    // ── 그래픽 초기화 ──
    /** @type {Phaser.GameObjects.Graphics} 투사체 그래픽 */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(18);

    this.draw();
  }

  // ── 도형 렌더링 ────────────────────────────────────────────────

  /**
   * 타워 타입에 따라 투사체 도형을 그린다.
   * archer/mage/flame=원, ice=다이아몬드, rock=사각형, wind=원 등.
   */
  draw() {
    this.graphics.clear();
    const size = PROJECTILE_SIZE[this.towerType] || 3;

    switch (this.towerType) {
      case 'archer':
        this.graphics.fillStyle(COLORS.PROJECTILE_ARCHER, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'mage':
        this.graphics.fillStyle(COLORS.PROJECTILE_MAGE, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'ice': {
        // 다이아몬드(회전 정사각형) 형태
        const sz = size / 2;
        this.graphics.fillStyle(COLORS.PROJECTILE_ICE, 1);
        this.graphics.fillPoints([
          { x: this.x, y: this.y - sz },
          { x: this.x + sz, y: this.y },
          { x: this.x, y: this.y + sz },
          { x: this.x - sz, y: this.y },
        ], true);
        break;
      }

      case 'flame':
        this.graphics.fillStyle(COLORS.PROJECTILE_FLAME, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'rock':
        this.graphics.fillStyle(COLORS.PROJECTILE_ROCK, 1);
        this.graphics.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        break;

      case 'wind':
        this.graphics.fillStyle(COLORS.PROJECTILE_WIND, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      default:
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(this.x, this.y, size || 3);
        break;
    }
  }

  // ── 업데이트 ───────────────────────────────────────────────────

  /**
   * 매 프레임 투사체 위치를 갱신하고 명중 판정을 수행한다.
   * 대상이 사망/제거되면 마지막으로 알려진 위치로 계속 이동한다.
   * @param {number} delta - 프레임 델타 (초 단위, 게임 속도 적용 후)
   * @param {Enemy[]} enemies - 모든 활성 적 (스플래시 데미지용)
   * @returns {{ hit: boolean, enemy: object|null, killed: boolean, kills: object[] }} 명중 결과
   */
  update(delta, enemies) {
    if (!this.active) {
      return { hit: false, enemy: null, killed: false, kills: [] };
    }

    // 대상이 살아있으면 추적 좌표 갱신
    if (this.target && this.target.alive && !this.target.reachedBase) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    // 대상 위치를 향해 이동
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const moveAmount = this.speed * delta;
    const hitRadius = 8;  // 명중 판정 반경 (픽셀)

    if (dist <= hitRadius || moveAmount >= dist) {
      // 명중 처리
      this.active = false;
      this.x = this.targetX;
      this.y = this.targetY;

      return this._onHit(enemies);
    }

    // 대상을 향해 이동
    const nx = dx / dist;
    const ny = dy / dist;
    this.x += nx * moveAmount;
    this.y += ny * moveAmount;

    this.draw();
    return { hit: false, enemy: null, killed: false, kills: [] };
  }

  // ── 명중 처리 ──────────────────────────────────────────────────

  /**
   * 공격 유형에 따른 명중 로직을 처리한다.
   * @param {Enemy[]} enemies - 모든 활성 적
   * @returns {{ hit: boolean, enemy: object|null, killed: boolean, kills: object[] }} 명중 결과
   * @private
   */
  _onHit(enemies) {
    const result = { hit: true, enemy: this.target, killed: false, kills: [] };

    switch (this.attackType) {
      case 'single':
        this._hitSingle(result);
        break;

      case 'splash':
        this._hitSplash(result, enemies);
        break;

      case 'dot_single':
        this._hitDotSingle(result);
        break;

      default:
        // 폴백: 단일 대상 공격
        this._hitSingle(result);
        break;
    }

    return result;
  }

  /**
   * 단일 대상 명중 처리. 선택적으로 감속, 밀치기, 방어력 감소를 적용한다.
   * @param {object} result - 채울 명중 결과 객체
   * @private
   */
  _hitSingle(result) {
    if (!this.target || !this.target.alive) return;

    const died = this.target.takeDamage(this.damage, this.armorPiercing);
    if (died) {
      result.killed = true;
      result.kills.push(this.target);
    } else {
      // 감속 적용
      if (this.slowAmount > 0) {
        this.target.applySlow(this.slowAmount, this.slowDuration);
      }
      // 밀치기 적용
      if (this.pushbackDistance > 0) {
        this.target.pushBack(this.pushbackDistance);
      }
      // 방어력 감소 적용
      if (this.armorReduction > 0) {
        this.target.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
      }
    }
  }

  /**
   * 스플래시 명중 처리: 반경 내 모든 적에게 데미지와 디버프를 적용한다.
   * @param {object} result - 채울 명중 결과 객체
   * @param {Enemy[]} enemies - 모든 활성 적
   * @private
   */
  _hitSplash(result, enemies) {
    this._playExplosionEffect();
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;
      const edx = enemy.x - this.x;
      const edy = enemy.y - this.y;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist <= this.splashRadius) {
        const died = enemy.takeDamage(this.damage, this.armorPiercing);
        if (died) {
          result.kills.push(enemy);
        } else {
          if (this.slowAmount > 0) {
            enemy.applySlow(this.slowAmount, this.slowDuration);
          }
          if (this.burnDamage > 0) {
            enemy.applyBurn(this.burnDamage, this.burnDuration);
          }
          if (this.poisonDamage > 0) {
            enemy.applyPoison(this.poisonDamage, this.poisonDuration, this.maxPoisonStacks);
          }
          if (this.armorReduction > 0) {
            enemy.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
          }
          if (this.pushbackDistance > 0) {
            enemy.pushBack(this.pushbackDistance);
          }
        }
      }
    }
    result.killed = result.kills.length > 0;
  }

  /**
   * DoT 단일 명중 처리: 즉시 데미지 + 화상/독 DoT + 감속 + 방어력 감소.
   * @param {object} result - 채울 명중 결과 객체
   * @private
   */
  _hitDotSingle(result) {
    if (!this.target || !this.target.alive) return;

    const died = this.target.takeDamage(this.damage, this.armorPiercing);
    if (died) {
      result.killed = true;
      result.kills.push(this.target);
    } else {
      // 화상 DoT 적용
      if (this.burnDamage > 0) {
        this.target.applyBurn(this.burnDamage, this.burnDuration);
      }
      // 독 DoT 적용
      if (this.poisonDamage > 0) {
        this.target.applyPoison(this.poisonDamage, this.poisonDuration, this.maxPoisonStacks);
      }
      // 감속 적용
      if (this.slowAmount > 0) {
        this.target.applySlow(this.slowAmount, this.slowDuration);
      }
      // 방어력 감소 적용
      if (this.armorReduction > 0) {
        this.target.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
      }
    }
  }

  // ── 시각 이펙트 ────────────────────────────────────────────────

  /**
   * 스플래시 투사체의 폭발 시각 이펙트를 재생한다.
   * 확장 원 + 방사형 파티클로 구성된다.
   * @private
   */
  _playExplosionEffect() {
    const effectGraphics = this.scene.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = VISUALS.DEATH_EFFECT_DURATION;
    const maxRadius = this.splashRadius;
    const x = this.x;
    const y = this.y;

    // 방사형 파티클 생성 (6~8개, 랜덤 방향)
    const particleCount = 6 + Math.floor(Math.random() * 3);
    const particles = Array.from({ length: particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      return {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 3 + Math.random() * 2,
      };
    });

    const timer = this.scene.time.addEvent({
      delay: 16,  // ~60fps
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;
        const radius = maxRadius * progress;
        const alpha = 0.6 * (1 - progress);
        const dt = 16 / 1000;

        effectGraphics.clear();

        // 확장하는 폭발 원
        effectGraphics.fillStyle(COLORS.EXPLOSION, alpha);
        effectGraphics.fillCircle(x, y, radius);
        effectGraphics.lineStyle(2, COLORS.EXPLOSION, alpha * 0.5);
        effectGraphics.strokeCircle(x, y, radius);

        // 방사형 파티클 시뮬레이션
        for (const p of particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt / 0.3; // 0.3초 수명

          if (p.life > 0) {
            effectGraphics.fillStyle(COLORS.EXPLOSION, p.life * 0.8);
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

  // ── 오브젝트 풀 지원 ──────────────────────────────────────────

  /**
   * 오브젝트 풀 재사용을 위해 투사체 상태를 초기화한다.
   * @param {string} towerType - 타워 타입
   * @param {number} startX - 시작 X 좌표
   * @param {number} startY - 시작 Y 좌표
   * @param {object} target - 목표 적
   * @param {number} damage - 데미지 양
   * @param {number} speed - 이동 속도
   * @param {object} [extra] - 특수 효과 속성
   */
  reset(towerType, startX, startY, target, damage, speed, extra = {}) {
    this.towerType = towerType;
    this.x = startX;
    this.y = startY;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.splashRadius = extra.splashRadius || null;
    this.slowAmount = extra.slowAmount || 0;
    this.slowDuration = extra.slowDuration || 0;
    this.burnDamage = extra.burnDamage || 0;
    this.burnDuration = extra.burnDuration || 0;
    this.armorPiercing = extra.armorPiercing || false;
    this.pushbackDistance = extra.pushbackDistance || 0;
    this.armorReduction = extra.armorReduction || 0;
    this.armorReductionDuration = extra.armorReductionDuration || 0;
    this.poisonDamage = extra.poisonDamage || 0;
    this.poisonDuration = extra.poisonDuration || 0;
    this.maxPoisonStacks = extra.maxPoisonStacks || 1;
    this.attackType = extra.attackType || 'single';
    this.active = true;
    this.targetX = target.x;
    this.targetY = target.y;

    if (this.graphics) {
      this.graphics.setVisible(true);
    }
    this.draw();
  }

  /**
   * 풀 반환을 위해 비활성화한다 (그래픽 숨김, 객체는 유지).
   */
  deactivate() {
    this.active = false;
    this.target = null;
    if (this.graphics) {
      this.graphics.clear();
      this.graphics.setVisible(false);
    }
  }

  /**
   * 모든 그래픽을 제거하고 리소스를 정리한다.
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
