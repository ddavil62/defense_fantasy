/**
 * @fileoverview ProjectilePool - Projectile 인스턴스를 위한 오브젝트 풀.
 * Projectile 객체와 Graphics를 재사용하여 가비지 컬렉션 부담을 줄인다.
 * 성능 최적화를 위해 사전 할당(pre-allocation)과 동적 확장을 지원한다.
 */

import { Projectile } from '../entities/Projectile.js';

export class ProjectilePool {
  /**
   * ProjectilePool을 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {number} [initialSize=30] - 사전 할당할 풀 크기
   */
  constructor(scene, initialSize = 30) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {Projectile[]} 사용 가능한 (비활성) 투사체 배열 */
    this.pool = [];

    /** @type {Projectile[]} 현재 활성 투사체 배열 */
    this.active = [];

    // 초기 풀 사전 할당
    for (let i = 0; i < initialSize; i++) {
      const proj = this._createProjectile();
      proj.deactivate();
      this.pool.push(proj);
    }
  }

  // ── 풀 관리 ────────────────────────────────────────────────────

  /**
   * 풀에서 투사체를 꺼내거나 새로 생성하여 활성화한다.
   * 풀이 비어 있으면 새 Projectile을 동적으로 생성한다.
   * @param {string} towerType - 타워 타입
   * @param {number} startX - 시작 X 좌표
   * @param {number} startY - 시작 Y 좌표
   * @param {object} target - 목표 적
   * @param {number} damage - 데미지 양
   * @param {number} speed - 이동 속도
   * @param {object} [extra] - 특수 효과 속성
   * @returns {Projectile} 활성화된 투사체
   */
  acquire(towerType, startX, startY, target, damage, speed, extra = {}) {
    let proj = this.pool.pop();
    if (!proj) {
      // 풀 소진 시 동적 생성
      proj = this._createProjectile();
    }
    proj.reset(towerType, startX, startY, target, damage, speed, extra);
    this.active.push(proj);
    return proj;
  }

  /**
   * 투사체를 풀로 반환한다.
   * @param {Projectile} proj - 반환할 투사체
   */
  release(proj) {
    proj.deactivate();
    const idx = this.active.indexOf(proj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
    }
    this.pool.push(proj);
  }

  /**
   * 모든 활성 투사체를 풀로 반환한다.
   * 웨이브 종료나 게임 리셋 시 사용한다.
   */
  releaseAll() {
    while (this.active.length > 0) {
      const proj = this.active.pop();
      proj.deactivate();
      this.pool.push(proj);
    }
  }

  /**
   * 현재 활성 투사체 수를 반환한다.
   * @returns {number} 활성 투사체 수
   */
  getActiveCount() {
    return this.active.length;
  }

  // ── 정리 ───────────────────────────────────────────────────────

  /**
   * 모든 투사체(풀 + 활성)를 파괴한다. 씬 종료 시 호출한다.
   */
  destroy() {
    for (const proj of this.active) {
      proj.destroy();
    }
    for (const proj of this.pool) {
      proj.destroy();
    }
    this.active = [];
    this.pool = [];
  }

  /**
   * 더미 타겟으로 새 Projectile 인스턴스를 생성한다.
   * reset()에서 실제 값이 설정되므로 초기값은 의미 없다.
   * @returns {Projectile} 새 투사체 인스턴스
   * @private
   */
  _createProjectile() {
    // 더미 값으로 생성; reset() 호출 시 실제 값으로 교체됨
    const dummyTarget = { x: 0, y: 0, alive: false, reachedBase: true };
    return new Projectile(this.scene, 'archer', -100, -100, dummyTarget, 0, 0);
  }
}
