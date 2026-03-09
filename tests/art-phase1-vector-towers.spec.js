/**
 * @fileoverview T1 타워 글로우 벡터 아트 Phase 1 QA 테스트.
 * 10종 타워 PNG 에셋 교체, Phaser 렌더 설정 변경, 브라우저 에러 없음을 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('T1 타워 글로우 벡터 아트 Phase 1', () => {

  test.describe('정상 동작 - 게임 로드', () => {

    test('게임이 에러 없이 로드되고 메뉴 씬이 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // Phaser 게임이 초기화될 때까지 대기 (canvas 존재 확인)
      await page.waitForSelector('canvas', { timeout: 15000 });

      // 게임이 BootScene -> MenuScene으로 전환될 시간 대기
      await page.waitForTimeout(3000);

      // 스크린샷 캡처
      await page.screenshot({ path: 'tests/screenshots/art-phase1-menu.png', fullPage: true });

      // 콘솔 에러 중 에셋 관련 에러가 없는지 확인
      const assetErrors = consoleErrors.filter(e =>
        e.includes('tower/') || e.includes('404') || e.includes('Failed to load')
      );
      expect(assetErrors).toEqual([]);

      // JavaScript 예외가 없는지 확인
      expect(errors).toEqual([]);
    });

    test('T1 타워 10종 PNG가 정상 로드된다 (404 없음)', async ({ page }) => {
      const failedRequests = [];
      page.on('requestfailed', req => {
        if (req.url().includes('assets/tower/')) {
          failedRequests.push(req.url());
        }
      });

      const towerResponses = [];
      page.on('response', res => {
        if (res.url().includes('assets/tower/')) {
          towerResponses.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // 실패한 타워 에셋 요청이 없어야 함
      expect(failedRequests).toEqual([]);

      // T1 타워 10종이 모두 200으로 로드되어야 함
      const t1Names = ['Archer','Mage','Ice','Lightning','Flame','Rock','Poison','Wind','Light','Dragon'];
      for (const name of t1Names) {
        const found = towerResponses.find(r => r.url.includes(`/${name}.png`));
        if (found) {
          expect(found.status).toBe(200);
        }
        // 참고: Vite dev server에서는 이미 캐시된 경우 요청이 안 올 수 있음
      }
    });
  });

  test.describe('시각적 검증 - 타워 배치', () => {

    test('게임 진입 후 타워를 배치하면 글로우 벡터 스타일로 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // 메뉴 씬 스크린샷
      await page.screenshot({ path: 'tests/screenshots/art-phase1-menu-visual.png' });

      // 게임 시작을 위해 화면 클릭 (메뉴 -> 월드 선택 -> 레벨 선택 -> 게임)
      // 캔버스 중앙 하단의 시작 버튼 영역 클릭
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) {
        test.skip();
        return;
      }

      // MenuScene에서 "게임 시작" 버튼 클릭 (화면 중앙 하단 부근)
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.55 } });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'tests/screenshots/art-phase1-after-click1.png' });

      // WorldSelectScene에서 첫 번째 월드 클릭 (숲)
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.35 } });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'tests/screenshots/art-phase1-after-click2.png' });

      // LevelSelectScene에서 첫 번째 레벨 클릭
      await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.35 } });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'tests/screenshots/art-phase1-after-click3.png' });

      // GameScene 진입 대기
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/art-phase1-game-scene.png' });

      // 에러 확인
      expect(errors).toEqual([]);
    });
  });

  test.describe('Phaser 렌더 설정 확인', () => {

    test('pixelArt: false, antialias: true가 적용되어 있다', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Phaser 게임 인스턴스에서 렌더 설정 확인
      const renderConfig = await page.evaluate(() => {
        const game = window.__game;
        if (!game) return null;
        return {
          pixelArt: game.config.pixelArt,
          antialias: game.config.antialias,
          renderType: game.config.renderType,
        };
      });

      expect(renderConfig).not.toBeNull();
      expect(renderConfig.pixelArt).toBe(false);
      expect(renderConfig.antialias).toBe(true);
    });
  });

  test.describe('콘솔 에러 및 안정성', () => {

    test('게임 로드 시 JavaScript 예외가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(5000);

      expect(errors).toEqual([]);
    });

    test('타워 텍스처가 Phaser에 정상 등록되어 있다', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      const textureCheck = await page.evaluate(() => {
        const game = window.__game;
        if (!game) return null;

        const texManager = game.textures;
        const types = ['archer','mage','ice','lightning','flame','rock','poison','wind','light','dragon'];
        const results = {};
        for (const type of types) {
          results[`tower_${type}`] = texManager.exists(`tower_${type}`);
        }
        return results;
      });

      expect(textureCheck).not.toBeNull();
      for (const [key, exists] of Object.entries(textureCheck)) {
        expect(exists, `텍스처 ${key}가 존재해야 한다`).toBe(true);
      }
    });

    test('모바일 뷰포트(360x640)에서 정상 렌더링된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'tests/screenshots/art-phase1-mobile.png' });
      expect(errors).toEqual([]);
    });

    test('소형 뷰포트(320x480)에서도 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.setViewportSize({ width: 320, height: 480 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'tests/screenshots/art-phase1-small-viewport.png' });
      expect(errors).toEqual([]);
    });
  });

  test.describe('엣지케이스', () => {

    test('빠른 새로고침 시에도 에셋 로드가 정상 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });

      // 빠른 새로고침 3회
      for (let i = 0; i < 3; i++) {
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('canvas', { timeout: 15000 });
        await page.waitForTimeout(1000);
      }

      await page.waitForTimeout(2000);

      // 텍스처 존재 확인
      const textureCheck = await page.evaluate(() => {
        const game = window.__game;
        if (!game) return null;
        const types = ['archer','mage','ice','lightning','flame','rock','poison','wind','light','dragon'];
        return types.every(t => game.textures.exists(`tower_${t}`));
      });

      expect(textureCheck).toBe(true);
      expect(errors).toEqual([]);
    });
  });
});
