/**
 * @fileoverview UI 아이콘 일괄 개선 QA 테스트.
 * 판매/배속/일시정지/음소거 버튼 아이콘 교체와 HUD 아이콘 표시를 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Phaser 게임이 완전히 로드될 때까지 대기하는 헬퍼
async function waitForPhaserGame(page, timeout = 15000) {
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout });
}

// 특정 씬이 활성화될 때까지 대기
async function waitForScene(page, sceneKey, timeout = 15000) {
  await page.waitForFunction((key) => {
    const game = window.__game;
    if (!game || !game.scene) return false;
    const scenes = game.scene.getScenes(true);
    return scenes.some(s => s.sys.settings.key === key);
  }, sceneKey, { timeout });
}

// 게임 캔버스 내 특정 좌표를 클릭
async function clickGameCanvas(page, gameX, gameY) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  const scaleInfo = await page.evaluate(() => {
    const game = window.__game;
    return {
      displayWidth: game.scale.displaySize.width,
      displayHeight: game.scale.displaySize.height,
      gameWidth: game.scale.gameSize.width,
      gameHeight: game.scale.gameSize.height,
    };
  });

  const scaleX = scaleInfo.displayWidth / scaleInfo.gameWidth;
  const scaleY = scaleInfo.displayHeight / scaleInfo.gameHeight;
  const offsetX = (box.width - scaleInfo.displayWidth) / 2;
  const offsetY = (box.height - scaleInfo.displayHeight) / 2;

  const clickX = box.x + offsetX + gameX * scaleX;
  const clickY = box.y + offsetY + gameY * scaleY;

  await page.mouse.click(clickX, clickY);
}

// GameScene까지 진입 - 직접 JavaScript로 씬 전환 (CLASSIC_MAP 기본값 사용)
async function navigateToGameScene(page) {
  await page.goto(BASE_URL);
  await waitForPhaserGame(page);
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(1000);

  // mapData 없이 GameScene을 시작하면 CLASSIC_MAP(엔드리스)이 기본값으로 사용됨
  await page.evaluate(() => {
    const game = window.__game;
    const sm = game.registry.get('soundManager');
    if (sm) sm.stopBgm(false);

    const scenes = game.scene.getScenes(true);
    if (scenes.length > 0) {
      scenes[0].scene.start('GameScene');
    }
  });

  await waitForScene(page, 'GameScene', 10000);
  await page.waitForTimeout(1500);
}

test.describe('UI 아이콘 일괄 개선 검증', () => {

  test.describe('정상 동작 검증', () => {

    test('게임 진입 후 콘솔 에러 없이 로드된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await waitForPhaserGame(page);
      await waitForScene(page, 'MenuScene');
      await page.waitForTimeout(2000);

      const iconErrors = errors.filter(e =>
        e.includes('icon_') || e.includes('404') || e.includes('Failed to load')
      );
      expect(iconErrors).toEqual([]);
    });

    test('BootScene에서 10종 아이콘 preload가 정상 수행된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForPhaserGame(page);
      await waitForScene(page, 'MenuScene');
      await page.waitForTimeout(1000);

      const textureCheck = await page.evaluate(() => {
        const game = window.__game;
        const texManager = game.textures;
        const icons = [
          'icon_sell', 'icon_speed_x1', 'icon_speed_x2', 'icon_speed_x3',
          'icon_pause', 'icon_sound_on', 'icon_sound_off',
          'icon_sword', 'icon_diamond', 'icon_heart',
        ];
        return icons.map(name => ({
          name,
          exists: texManager.exists(name),
        }));
      });

      for (const t of textureCheck) {
        expect(t.exists, `Texture ${t.name} should exist`).toBe(true);
      }
    });

    test('GameScene 진입 후 일시정지/음소거 버튼 아이콘이 표시된다', async ({ page }) => {
      await navigateToGameScene(page);

      const iconCheck = await page.evaluate(() => {
        const game = window.__game;
        const scenes = game.scene.getScenes(true);
        const gameScene = scenes.find(s => s.sys.settings.key === 'GameScene');
        if (!gameScene) return { error: 'GameScene not found' };

        return {
          hasPauseBtnIcon: !!gameScene.pauseBtnIcon,
          hasPauseBtnText: !!gameScene.pauseBtnText,
          hasMuteBtnIcon: !!gameScene.muteBtnIcon,
          hasMuteBtnText: !!gameScene.muteBtnText,
          pauseIconTexture: gameScene.pauseBtnIcon ? gameScene.pauseBtnIcon.texture.key : null,
          muteIconTexture: gameScene.muteBtnIcon ? gameScene.muteBtnIcon.texture.key : null,
        };
      });

      expect(iconCheck.hasPauseBtnIcon).toBe(true);
      expect(iconCheck.hasPauseBtnText).toBe(false);
      expect(iconCheck.hasMuteBtnIcon).toBe(true);
      expect(iconCheck.hasMuteBtnText).toBe(false);
      expect(iconCheck.pauseIconTexture).toBe('icon_pause');
      expect(['icon_sound_on', 'icon_sound_off']).toContain(iconCheck.muteIconTexture);
    });

    test('TowerPanel 판매/배속 버튼 아이콘이 표시된다', async ({ page }) => {
      await navigateToGameScene(page);

      const panelCheck = await page.evaluate(() => {
        const game = window.__game;
        const scenes = game.scene.getScenes(true);
        const gameScene = scenes.find(s => s.sys.settings.key === 'GameScene');
        if (!gameScene || !gameScene.towerPanel) return { error: 'towerPanel not found' };

        const tp = gameScene.towerPanel;
        return {
          hasSellIcon: !!tp.sellIcon,
          hasSellText: !!tp.sellText,
          hasSpeedIcon: !!tp.speedIcon,
          hasSpeedText: !!tp.speedText,
          sellIconTexture: tp.sellIcon ? tp.sellIcon.texture.key : null,
          speedIconTexture: tp.speedIcon ? tp.speedIcon.texture.key : null,
        };
      });

      expect(panelCheck.hasSellIcon).toBe(true);
      expect(panelCheck.hasSellText).toBe(false);
      expect(panelCheck.hasSpeedIcon).toBe(true);
      expect(panelCheck.hasSpeedText).toBe(false);
      expect(panelCheck.sellIconTexture).toBe('icon_sell');
      expect(panelCheck.speedIconTexture).toBe('icon_speed_x1');
    });

    test('HUD 아이콘 (검/다이아/하트)이 이미지로 표시된다', async ({ page }) => {
      await navigateToGameScene(page);

      const hudCheck = await page.evaluate(() => {
        const game = window.__game;
        const scenes = game.scene.getScenes(true);
        const gameScene = scenes.find(s => s.sys.settings.key === 'GameScene');
        if (!gameScene || !gameScene.hud) return { error: 'HUD not found' };

        const hud = gameScene.hud;
        return {
          hasWaveIcon: !!hud.waveIcon,
          hasGoldIcon: !!hud.goldIcon,
          hasHpIcon: !!hud.hpIcon,
          waveIconTexture: hud.waveIcon ? hud.waveIcon.texture.key : null,
          goldIconTexture: hud.goldIcon ? hud.goldIcon.texture.key : null,
          hpIconTexture: hud.hpIcon ? hud.hpIcon.texture.key : null,
        };
      });

      expect(hudCheck.hasWaveIcon).toBe(true);
      expect(hudCheck.hasGoldIcon).toBe(true);
      expect(hudCheck.hasHpIcon).toBe(true);
      expect(hudCheck.waveIconTexture).toBe('icon_sword');
      expect(hudCheck.goldIconTexture).toBe('icon_diamond');
      expect(hudCheck.hpIconTexture).toBe('icon_heart');
    });
  });

  test.describe('아이콘 전환 동작', () => {

    test('배속 버튼 클릭 시 아이콘이 x1 -> x2 -> x3 -> x1 순환한다', async ({ page }) => {
      await navigateToGameScene(page);

      // 배속 버튼 좌표: GAME_WIDTH - 38 = 322, PANEL_Y + 28 = 548
      const speedBtnX = 322;
      const speedBtnY = 548;

      // 초기 상태: x1
      let texKey = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.towerPanel.speedIcon.texture.key;
      });
      expect(texKey).toBe('icon_speed_x1');

      // 1번 클릭 -> x2
      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(200);
      texKey = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.towerPanel.speedIcon.texture.key;
      });
      expect(texKey).toBe('icon_speed_x2');

      // 2번 클릭 -> x3
      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(200);
      texKey = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.towerPanel.speedIcon.texture.key;
      });
      expect(texKey).toBe('icon_speed_x3');

      // 3번 클릭 -> x1 (순환)
      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(200);
      texKey = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.towerPanel.speedIcon.texture.key;
      });
      expect(texKey).toBe('icon_speed_x1');
    });

    test('음소거 버튼 클릭 시 아이콘이 토글된다', async ({ page }) => {
      await navigateToGameScene(page);

      // 음소거 버튼 좌표: (278, 20)
      const muteBtnX = 278;
      const muteBtnY = 20;

      // 초기 상태 확인
      let state = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          texture: gs.muteBtnIcon.texture.key,
          muted: gs.soundManager ? gs.soundManager.muted : false,
        };
      });

      const initialTexture = state.texture;
      const initialMuted = state.muted;

      // 클릭 -> 토글
      await clickGameCanvas(page, muteBtnX, muteBtnY);
      await page.waitForTimeout(300);

      state = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          texture: gs.muteBtnIcon.texture.key,
          muted: gs.soundManager ? gs.soundManager.muted : false,
        };
      });

      expect(state.muted).toBe(!initialMuted);
      const expectedTex = state.muted ? 'icon_sound_off' : 'icon_sound_on';
      expect(state.texture).toBe(expectedTex);

      // 다시 클릭 -> 원래 상태로 복원
      await clickGameCanvas(page, muteBtnX, muteBtnY);
      await page.waitForTimeout(300);

      state = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          texture: gs.muteBtnIcon.texture.key,
          muted: gs.soundManager ? gs.soundManager.muted : false,
        };
      });

      expect(state.muted).toBe(initialMuted);
      expect(state.texture).toBe(initialTexture);
    });
  });

  test.describe('아이콘 표시 크기 검증', () => {

    test('각 아이콘의 displaySize가 스펙에 맞는다', async ({ page }) => {
      await navigateToGameScene(page);

      const sizeCheck = await page.evaluate(() => {
        const game = window.__game;
        const gs = game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        if (!gs) return { error: 'GameScene not found' };

        const tp = gs.towerPanel;
        const results = {};

        if (tp.sellIcon) {
          results.sell = {
            displayWidth: tp.sellIcon.displayWidth,
            displayHeight: tp.sellIcon.displayHeight,
          };
        }
        if (tp.speedIcon) {
          results.speed = {
            displayWidth: tp.speedIcon.displayWidth,
            displayHeight: tp.speedIcon.displayHeight,
          };
        }
        if (gs.pauseBtnIcon) {
          results.pause = {
            displayWidth: gs.pauseBtnIcon.displayWidth,
            displayHeight: gs.pauseBtnIcon.displayHeight,
          };
        }
        if (gs.muteBtnIcon) {
          results.mute = {
            displayWidth: gs.muteBtnIcon.displayWidth,
            displayHeight: gs.muteBtnIcon.displayHeight,
          };
        }

        return results;
      });

      expect(sizeCheck.sell.displayWidth).toBe(20);
      expect(sizeCheck.sell.displayHeight).toBe(20);
      expect(sizeCheck.speed.displayWidth).toBe(20);
      expect(sizeCheck.speed.displayHeight).toBe(20);
      expect(sizeCheck.pause.displayWidth).toBe(18);
      expect(sizeCheck.pause.displayHeight).toBe(18);
      expect(sizeCheck.mute.displayWidth).toBe(16);
      expect(sizeCheck.mute.displayHeight).toBe(16);
    });
  });

  test.describe('아이콘 depth(z-order) 검증', () => {

    test('일시정지/음소거 아이콘이 HUD 배경 위에 표시된다', async ({ page }) => {
      await navigateToGameScene(page);

      const depthCheck = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          pauseIconDepth: gs.pauseBtnIcon ? gs.pauseBtnIcon.depth : null,
          muteIconDepth: gs.muteBtnIcon ? gs.muteBtnIcon.depth : null,
          pauseBgDepth: gs.pauseBtnBg ? gs.pauseBtnBg.depth : null,
          muteBtnDepth: gs.muteBtn ? gs.muteBtn.depth : null,
        };
      });

      expect(depthCheck.pauseIconDepth).toBe(32);
      expect(depthCheck.muteIconDepth).toBe(32);
      expect(depthCheck.pauseIconDepth).toBeGreaterThan(depthCheck.pauseBgDepth);
      expect(depthCheck.muteIconDepth).toBeGreaterThan(depthCheck.muteBtnDepth);
    });
  });

  test.describe('배속 하이라이트 원(speedCircle) 연동', () => {

    test('이미지 모드에서도 배속 하이라이트가 정상 동작한다', async ({ page }) => {
      await navigateToGameScene(page);

      const speedBtnX = 322;
      const speedBtnY = 548;

      // 1x -> 하이라이트 없음
      let highlight = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const tp = gs.towerPanel;
        return { speed: tp.gameSpeed };
      });
      expect(highlight.speed).toBe(1);

      // 2x -> 하이라이트 표시
      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(200);

      highlight = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const tp = gs.towerPanel;
        return {
          speed: tp.gameSpeed,
          circleHasCommands: tp.speedCircle && tp.speedCircle.commandBuffer && tp.speedCircle.commandBuffer.length > 0,
        };
      });
      expect(highlight.speed).toBe(2);
      expect(highlight.circleHasCommands).toBe(true);
    });
  });

  test.describe('시각적 검증 (스크린샷)', () => {

    test('GameScene 전체 화면 - HUD 및 하단 패널 아이콘 확인', async ({ page }) => {
      await navigateToGameScene(page);
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/screenshots/ui-icon-game-scene-full.png',
      });
    });

    test('HUD 영역 - 검/다이아/하트 아이콘 확인', async ({ page }) => {
      await navigateToGameScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleInfo = await page.evaluate(() => {
        const game = window.__game;
        return {
          displayWidth: game.scale.displaySize.width,
          displayHeight: game.scale.displaySize.height,
          gameWidth: game.scale.gameSize.width,
          gameHeight: game.scale.gameSize.height,
        };
      });
      const scaleY = scaleInfo.displayHeight / scaleInfo.gameHeight;
      const offsetX = (box.width - scaleInfo.displayWidth) / 2;
      const offsetY = (box.height - scaleInfo.displayHeight) / 2;

      await page.screenshot({
        path: 'tests/screenshots/ui-icon-hud-area.png',
        clip: {
          x: box.x + offsetX,
          y: box.y + offsetY,
          width: scaleInfo.displayWidth,
          height: 45 * scaleY,
        },
      });
    });

    test('하단 패널 영역 - 판매/배속 버튼 아이콘 확인', async ({ page }) => {
      await navigateToGameScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleInfo = await page.evaluate(() => {
        const game = window.__game;
        return {
          displayWidth: game.scale.displaySize.width,
          displayHeight: game.scale.displaySize.height,
          gameWidth: game.scale.gameSize.width,
          gameHeight: game.scale.gameSize.height,
        };
      });
      const scaleY = scaleInfo.displayHeight / scaleInfo.gameHeight;
      const offsetX = (box.width - scaleInfo.displayWidth) / 2;
      const offsetY = (box.height - scaleInfo.displayHeight) / 2;

      await page.screenshot({
        path: 'tests/screenshots/ui-icon-tower-panel.png',
        clip: {
          x: box.x + offsetX,
          y: box.y + offsetY + 520 * scaleY,
          width: scaleInfo.displayWidth,
          height: 120 * scaleY,
        },
      });
    });

    test('배속 버튼 각 상태 스크린샷', async ({ page }) => {
      await navigateToGameScene(page);

      const speedBtnX = 322;
      const speedBtnY = 548;

      await page.screenshot({ path: 'tests/screenshots/ui-icon-speed-x1.png' });

      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'tests/screenshots/ui-icon-speed-x2.png' });

      await clickGameCanvas(page, speedBtnX, speedBtnY);
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'tests/screenshots/ui-icon-speed-x3.png' });
    });

    test('음소거 토글 전후 스크린샷', async ({ page }) => {
      await navigateToGameScene(page);

      const muteBtnX = 278;
      const muteBtnY = 20;

      await page.screenshot({ path: 'tests/screenshots/ui-icon-mute-off.png' });

      await clickGameCanvas(page, muteBtnX, muteBtnY);
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'tests/screenshots/ui-icon-mute-on.png' });
    });
  });

  test.describe('엣지케이스 및 예외 시나리오', () => {

    test('배속 버튼 빠른 연타 시 레이스 컨디션 없음', async ({ page }) => {
      await navigateToGameScene(page);

      const speedBtnX = 322;
      const speedBtnY = 548;

      // 빠르게 10번 연타
      for (let i = 0; i < 10; i++) {
        await clickGameCanvas(page, speedBtnX, speedBtnY);
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const tp = gs.towerPanel;
        return {
          speed: tp.gameSpeed,
          texture: tp.speedIcon ? tp.speedIcon.texture.key : null,
        };
      });

      // 10번 클릭 후: 1->2->3->1->2->3->1->2->3->1->2 => speed=2, texture=icon_speed_x2
      expect(result.speed).toBe(2);
      expect(result.texture).toBe('icon_speed_x2');
    });

    test('음소거 버튼 빠른 연타 시 아이콘/상태 불일치 없음', async ({ page }) => {
      await navigateToGameScene(page);

      const muteBtnX = 278;
      const muteBtnY = 20;

      // 빠르게 6번 연타 (짝수 -> 원래 상태로 복귀)
      for (let i = 0; i < 6; i++) {
        await clickGameCanvas(page, muteBtnX, muteBtnY);
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const sm = gs.soundManager;
        const isMuted = sm ? sm.muted : false;
        return {
          muted: isMuted,
          texture: gs.muteBtnIcon ? gs.muteBtnIcon.texture.key : null,
          expected: isMuted ? 'icon_sound_off' : 'icon_sound_on',
        };
      });

      expect(result.texture).toBe(result.expected);
    });

    test('GameScene에서 콘솔 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await navigateToGameScene(page);

      const speedBtnX = 322;
      const speedBtnY = 548;
      const muteBtnX = 278;
      const muteBtnY = 20;

      // 배속 순환
      for (let i = 0; i < 3; i++) {
        await clickGameCanvas(page, speedBtnX, speedBtnY);
        await page.waitForTimeout(200);
      }

      // 음소거 토글
      await clickGameCanvas(page, muteBtnX, muteBtnY);
      await page.waitForTimeout(200);
      await clickGameCanvas(page, muteBtnX, muteBtnY);
      await page.waitForTimeout(200);

      await page.waitForTimeout(3000);

      expect(errors).toEqual([]);
    });

    test('destroy 시 아이콘 오브젝트가 cleanup에 포함된다 (코드 확인)', async ({ page }) => {
      await navigateToGameScene(page);

      // TowerPanel.destroy()에 sellIcon, speedIcon 정리 코드가 있는지 확인
      const destroyCheck = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const tp = gs.towerPanel;
        // destroy 메서드의 소스 코드를 문자열로 가져옴
        const destroyStr = tp.destroy.toString();
        return {
          hasSellIconCleanup: destroyStr.includes('sellIcon'),
          hasSpeedIconCleanup: destroyStr.includes('speedIcon'),
        };
      });

      expect(destroyCheck.hasSellIconCleanup).toBe(true);
      expect(destroyCheck.hasSpeedIconCleanup).toBe(true);

      // GameScene._cleanup()에 pauseBtnIcon, muteBtnIcon 정리 코드가 있는지 확인
      const cleanupCheck = await page.evaluate(() => {
        const gs = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const cleanupStr = gs._cleanup.toString();
        return {
          hasPauseIconCleanup: cleanupStr.includes('pauseBtnIcon'),
          hasMuteIconCleanup: cleanupStr.includes('muteBtnIcon'),
        };
      });

      expect(cleanupCheck.hasPauseIconCleanup).toBe(true);
      expect(cleanupCheck.hasMuteIconCleanup).toBe(true);
    });
  });
});
