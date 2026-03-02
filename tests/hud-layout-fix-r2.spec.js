// @ts-check
import { test, expect } from '@playwright/test';

/**
 * HUD Layout Fix R2 QA Tests
 *
 * Verifies:
 * - Wave text "Wave:" prefix removal (now "X/Y" or "X" format)
 * - Diamond/HP icon positions shifted left
 * - No overlap between Wave text and Diamond icon
 * - No overlap between HP text and music/pause buttons
 * - Fallback (no icon) paths
 * - Extreme value combinations
 * - Console error absence
 */

const BASE_URL = 'http://localhost:3456';

// ── Helpers ──────────────────────────────────────────────────────

async function waitForGame(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout });
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout });
}

async function waitForScene(page, sceneKey, timeout = 10000) {
  await page.waitForFunction((key) => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene(key);
    return scene && scene.scene.isActive();
  }, sceneKey, { timeout });
  await page.waitForTimeout(500);
}

/**
 * Start a campaign game by directly launching GameScene with mapData.
 * This avoids flaky menu navigation and focuses on the HUD behavior under test.
 */
async function startCampaignGame(page) {
  await waitForGame(page);
  // Wait for MenuScene to be active first so assets are loaded
  await waitForScene(page, 'MenuScene');

  // Start GameScene directly with a campaign map
  await page.evaluate(() => {
    const g = window.__game;
    // Use the first available map data from the worlds module
    // We'll import it via the game's scene or use CLASSIC_MAP as fallback with totalWaves set
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      // Try to get actual world data
      const worlds = g.registry.get('worlds');
      if (worlds && worlds.length > 0 && worlds[0].levels && worlds[0].levels.length > 0) {
        const mapData = worlds[0].levels[0];
        active[0].scene.start('GameScene', {
          mapData,
          gameMode: 'campaign',
          selectedLevel: { worldIndex: 0, mapIndex: 0 },
        });
      } else {
        // Fallback: start with default which uses CLASSIC_MAP
        active[0].scene.start('GameScene', { gameMode: 'campaign' });
      }
    }
  });
  await waitForScene(page, 'GameScene');
}

/**
 * Start endless mode via direct scene start.
 */
async function startEndlessGame(page) {
  await waitForGame(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true)[0].scene.start('GameScene', {
      // No mapData = defaults to CLASSIC_MAP, no gameMode = defaults to 'endless'
    });
  });
  await waitForScene(page, 'GameScene');
}

// ── 1. Wave Text Format (Core Fix) ──────────────────────────────

test.describe('Wave Text Format (R2 - "Wave:" prefix removed)', () => {
  test('Campaign mode shows X/Y format without "Wave:" prefix', async ({ page }) => {
    await startCampaignGame(page);

    const waveData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud || !s.hud.waveText) return null;
      return {
        text: s.hud.waveText.text,
        x: s.hud.waveText.x,
        width: s.hud.waveText.width,
      };
    });

    expect(waveData).not.toBeNull();
    expect(waveData.text).not.toContain('Wave:');
    expect(waveData.text).not.toContain('Wave ');
    // Should match X/Y format (e.g., "1/8") or just "1" (depends on totalWaves)
    // With icon: "1/8" or "1"; without icon: "⚔ 1/8" or "⚔ 1"
    expect(waveData.text).toMatch(/^(\u2694\s?)?\d+(\/\d+)?$/);
  });

  test('Endless mode shows X format without "Wave:" prefix', async ({ page }) => {
    await startEndlessGame(page);

    const waveData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud || !s.hud.waveText) return null;
      return { text: s.hud.waveText.text };
    });

    expect(waveData).not.toBeNull();
    expect(waveData.text).not.toContain('Wave:');
    // Endless: "1" or "⚔ 1"
    expect(waveData.text).toMatch(/^(\u2694\s?)?\d+$/);
    expect(waveData.text).not.toContain('/');
  });

  test('updateWave produces correct format for all scenarios', async ({ page }) => {
    await startCampaignGame(page);

    const results = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      const hasIcon = s.hud.waveIcon !== null;
      const tests = [];

      // Campaign tests
      s.hud.updateWave(1, 8);
      tests.push({ label: 'campaign 1/8', text: s.hud.waveText.text, expected: hasIcon ? '1/8' : '\u2694 1/8' });

      s.hud.updateWave(30, 30);
      tests.push({ label: 'campaign 30/30', text: s.hud.waveText.text, expected: hasIcon ? '30/30' : '\u2694 30/30' });

      s.hud.updateWave(10, 30);
      tests.push({ label: 'campaign 10/30', text: s.hud.waveText.text, expected: hasIcon ? '10/30' : '\u2694 10/30' });

      // Endless tests
      s.hud.updateWave(1, null);
      tests.push({ label: 'endless 1', text: s.hud.waveText.text, expected: hasIcon ? '1' : '\u2694 1' });

      s.hud.updateWave(30, null);
      tests.push({ label: 'endless 30', text: s.hud.waveText.text, expected: hasIcon ? '30' : '\u2694 30' });

      s.hud.updateWave(5, Infinity);
      tests.push({ label: 'endless Infinity', text: s.hud.waveText.text, expected: hasIcon ? '5' : '\u2694 5' });

      return { hasIcon, tests };
    });

    expect(results).not.toBeNull();
    for (const t of results.tests) {
      expect(t.text).toBe(t.expected);
    }
  });
});

// ── 2. HUD Element Position Verification ─────────────────────────

test.describe('HUD Element Position Verification', () => {
  test('Diamond icon X=103, text X=114; HP icon X=175, text X=186', async ({ page }) => {
    await startCampaignGame(page);

    const positions = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      return {
        goldIconX: s.hud.goldIcon ? s.hud.goldIcon.x : null,
        goldTextX: s.hud.goldText ? s.hud.goldText.x : null,
        hpIconX: s.hud.hpIcon ? s.hud.hpIcon.x : null,
        hpTextX: s.hud.hpText ? s.hud.hpText.x : null,
        waveTextX: s.hud.waveText ? s.hud.waveText.x : null,
        waveIconX: s.hud.waveIcon ? s.hud.waveIcon.x : null,
      };
    });

    expect(positions).not.toBeNull();
    if (positions.goldIconX !== null) expect(positions.goldIconX).toBe(103);
    expect(positions.goldTextX).toBe(positions.goldIconX !== null ? 114 : 103);
    if (positions.hpIconX !== null) expect(positions.hpIconX).toBe(175);
    expect(positions.hpTextX).toBe(positions.hpIconX !== null ? 186 : 175);
    if (positions.waveIconX !== null) expect(positions.waveIconX).toBe(18);
    expect(positions.waveTextX).toBe(positions.waveIconX !== null ? 28 : 10);
  });

  test('Depth values remain at 31 for all HUD text elements', async ({ page }) => {
    await startCampaignGame(page);

    const depths = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      return {
        waveText: s.hud.waveText?.depth,
        goldText: s.hud.goldText?.depth,
        hpText: s.hud.hpText?.depth,
      };
    });

    expect(depths).not.toBeNull();
    expect(depths.waveText).toBe(31);
    expect(depths.goldText).toBe(31);
    expect(depths.hpText).toBe(31);
  });

  test('Font size remains 16px for all HUD text elements', async ({ page }) => {
    await startCampaignGame(page);

    const fontSizes = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      return {
        waveText: s.hud.waveText?.style?.fontSize,
        goldText: s.hud.goldText?.style?.fontSize,
        hpText: s.hud.hpText?.style?.fontSize,
      };
    });

    expect(fontSizes).not.toBeNull();
    expect(fontSizes.waveText).toBe('16px');
    expect(fontSizes.goldText).toBe('16px');
    expect(fontSizes.hpText).toBe('16px');
  });
});

// ── 3. Overlap Detection Tests (Critical) ────────────────────────

test.describe('HUD Overlap Detection', () => {
  test('Wave initial text does NOT overlap Diamond icon', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      const wt = s.hud.waveText;
      const gi = s.hud.goldIcon;
      const gt = s.hud.goldText;
      const diamondLeftEdge = gi ? gi.x - (gi.displayWidth / 2) : gt.x;
      return {
        waveText: wt.text,
        waveTextRight: wt.x + wt.width,
        diamondLeftEdge,
        gap: diamondLeftEdge - (wt.x + wt.width),
      };
    });

    expect(overlapData).not.toBeNull();
    expect(overlapData.gap).toBeGreaterThan(0);
  });

  test('Wave "30/30" (max campaign) does NOT overlap Diamond icon [PREV FAIL]', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateWave(30, 30);
      const wt = s.hud.waveText;
      const gi = s.hud.goldIcon;
      const gt = s.hud.goldText;
      const diamondLeftEdge = gi ? gi.x - (gi.displayWidth / 2) : gt.x;
      return {
        waveText: wt.text,
        waveTextRight: wt.x + wt.width,
        diamondLeftEdge,
        gap: diamondLeftEdge - (wt.x + wt.width),
      };
    });

    expect(overlapData).not.toBeNull();
    // Previously failed with "Wave: 30/30" (-39px gap). After "Wave:" removal, should be positive.
    expect(overlapData.waveText).not.toContain('Wave:');
    expect(overlapData.gap).toBeGreaterThan(0);
  });

  test('Wave "30" (max endless) does NOT overlap Diamond icon', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateWave(30, null);
      const wt = s.hud.waveText;
      const gi = s.hud.goldIcon;
      const gt = s.hud.goldText;
      const diamondLeftEdge = gi ? gi.x - (gi.displayWidth / 2) : gt.x;
      return {
        waveText: wt.text,
        waveTextRight: wt.x + wt.width,
        diamondLeftEdge,
        gap: diamondLeftEdge - (wt.x + wt.width),
      };
    });

    expect(overlapData).not.toBeNull();
    expect(overlapData.gap).toBeGreaterThan(0);
  });

  test('Diamond "9999" does NOT overlap HP icon', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateGold(9999);
      const gt = s.hud.goldText;
      const hi = s.hud.hpIcon;
      const ht = s.hud.hpText;
      const hpLeftEdge = hi ? hi.x - (hi.displayWidth / 2) : ht.x;
      return {
        goldText: gt.text,
        goldTextRight: gt.x + gt.width,
        hpLeftEdge,
        gap: hpLeftEdge - (gt.x + gt.width),
      };
    });

    expect(overlapData).not.toBeNull();
    expect(overlapData.gap).toBeGreaterThan(0);
  });

  test('HP "999" does NOT overlap music button (leftEdge x=266)', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateHP(999, 999);
      const ht = s.hud.hpText;
      // Music button: x=278, width=24 => left edge = 278 - 12 = 266
      return {
        hpText: ht.text,
        hpTextRight: ht.x + ht.width,
        musicBtnLeftEdge: 266,
        gap: 266 - (ht.x + ht.width),
      };
    });

    expect(overlapData).not.toBeNull();
    expect(overlapData.gap).toBeGreaterThan(0);
  });

  test('ALL extreme values at once: Wave 30/30 + Diamond 9999 + HP 999', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;

      s.hud.updateWave(30, 30);
      s.hud.updateGold(9999);
      s.hud.updateHP(999, 999);

      const wt = s.hud.waveText;
      const gi = s.hud.goldIcon;
      const gt = s.hud.goldText;
      const hi = s.hud.hpIcon;
      const ht = s.hud.hpText;

      const diamondLeftEdge = gi ? gi.x - (gi.displayWidth / 2) : gt.x;
      const hpLeftEdge = hi ? hi.x - (hi.displayWidth / 2) : ht.x;

      return {
        wave: { text: wt.text, right: wt.x + wt.width },
        diamond: { leftEdge: diamondLeftEdge, right: gt.x + gt.width, text: gt.text },
        hp: { leftEdge: hpLeftEdge, right: ht.x + ht.width, text: ht.text },
        musicBtnLeftEdge: 266,
        gaps: {
          waveToDiamond: diamondLeftEdge - (wt.x + wt.width),
          diamondToHP: hpLeftEdge - (gt.x + gt.width),
          hpToMusicBtn: 266 - (ht.x + ht.width),
        },
      };
    });

    expect(overlapData).not.toBeNull();
    expect(overlapData.gaps.waveToDiamond).toBeGreaterThan(0);
    expect(overlapData.gaps.diamondToHP).toBeGreaterThan(0);
    expect(overlapData.gaps.hpToMusicBtn).toBeGreaterThan(0);
  });
});

// ── 4. Fallback Path Verification ────────────────────────────────

test.describe('Fallback Path Verification', () => {
  test('updateWave format depends on icon presence', async ({ page }) => {
    await startCampaignGame(page);

    const fallbackData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      const hasIcon = s.hud.waveIcon !== null;
      return {
        hasIcon,
        currentText: s.hud.waveText.text,
      };
    });

    expect(fallbackData).not.toBeNull();
    if (fallbackData.hasIcon) {
      expect(fallbackData.currentText).not.toContain('\u2694');
      expect(fallbackData.currentText).not.toContain('Wave:');
    } else {
      expect(fallbackData.currentText).toContain('\u2694');
      expect(fallbackData.currentText).not.toContain('Wave:');
    }
  });

  test('Fallback Wave "⚔ 30/30" overlap estimation', async ({ page }) => {
    await startCampaignGame(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;

      const hasIcon = s.hud.waveIcon !== null;

      // Measure "30/30" width
      s.hud.updateWave(30, 30);
      const textWidth = s.hud.waveText.width;
      const textX = s.hud.waveText.x;
      const textRight = textX + textWidth;

      // Diamond left edge
      const gi = s.hud.goldIcon;
      const gt = s.hud.goldText;
      const diamondLeftEdge = gi ? gi.x - (gi.displayWidth / 2) : gt.x;

      if (hasIcon) {
        // Estimate fallback: x=10 instead of x=28, "⚔ " prefix adds ~15-18px
        const estimatedFallbackRight = 10 + textWidth + 18;
        return {
          hasIcon: true,
          normalTextRight: textRight,
          normalGap: diamondLeftEdge - textRight,
          estimatedFallbackRight,
          diamondLeftEdge,
          estimatedFallbackGap: diamondLeftEdge - estimatedFallbackRight,
        };
      } else {
        return {
          hasIcon: false,
          fallbackText: s.hud.waveText.text,
          fallbackRight: textRight,
          diamondLeftEdge,
          gap: diamondLeftEdge - textRight,
        };
      }
    });

    expect(result).not.toBeNull();
    if (!result.hasIcon) {
      // Actual fallback gap must be positive
      expect(result.gap).toBeGreaterThan(0);
    }
  });
});

// ── 5. Visual Screenshot Tests ───────────────────────────────────

test.describe('Visual Verification (Screenshots)', () => {
  test('Default state HUD screenshot', async ({ page }) => {
    await startCampaignGame(page);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/hud-r2-default.png',
      clip: { x: 0, y: 0, width: 360, height: 45 },
    });
    await page.screenshot({ path: 'tests/screenshots/hud-r2-full.png' });
  });

  test('Extreme values HUD screenshot (Wave 30/30, Diamond 9999, HP 999)', async ({ page }) => {
    await startCampaignGame(page);

    await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return;
      s.hud.updateWave(30, 30);
      s.hud.updateGold(9999);
      s.hud.updateHP(999, 999);
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/screenshots/hud-r2-extreme-clip.png',
      clip: { x: 0, y: 0, width: 360, height: 45 },
    });
  });

  test('HP danger state HUD screenshot (HP=3)', async ({ page }) => {
    await startCampaignGame(page);

    await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return;
      s.hud.updateHP(3, 20);
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/hud-r2-danger.png',
      clip: { x: 0, y: 0, width: 360, height: 45 },
    });
  });

  test('Various wave values screenshots', async ({ page }) => {
    await startCampaignGame(page);

    const waveValues = [
      { round: 1, total: 8, label: 'wave-1-8' },
      { round: 10, total: 30, label: 'wave-10-30' },
      { round: 30, total: 30, label: 'wave-30-30' },
      { round: 1, total: null, label: 'endless-1' },
      { round: 30, total: null, label: 'endless-30' },
    ];

    for (const wv of waveValues) {
      await page.evaluate(({ round, total }) => {
        const s = window.__game.scene.getScene('GameScene');
        if (!s || !s.hud) return;
        s.hud.updateWave(round, total);
      }, wv);
      await page.waitForTimeout(200);

      await page.screenshot({
        path: `tests/screenshots/hud-r2-${wv.label}.png`,
        clip: { x: 0, y: 0, width: 360, height: 45 },
      });
    }
  });
});

// ── 6. Edge Cases & Stability ────────────────────────────────────

test.describe('Edge Cases & Stability', () => {
  test('Rapid wave updates (10 times) maintain correct format', async ({ page }) => {
    await startCampaignGame(page);

    const results = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      const hasIcon = s.hud.waveIcon !== null;
      const texts = [];
      for (let i = 1; i <= 10; i++) {
        s.hud.updateWave(i, 30);
        texts.push(s.hud.waveText.text);
      }
      return { hasIcon, texts };
    });

    expect(results).not.toBeNull();
    for (let i = 0; i < results.texts.length; i++) {
      const expected = results.hasIcon ? `${i + 1}/30` : `\u2694 ${i + 1}/30`;
      expect(results.texts[i]).toBe(expected);
    }
  });

  test('Wave value 0 (before first wave) does not cause error', async ({ page }) => {
    await startCampaignGame(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      try {
        s.hud.updateWave(0, 30);
        return { text: s.hud.waveText.text, error: null };
      } catch (e) {
        return { text: null, error: e.message };
      }
    });

    expect(result).not.toBeNull();
    expect(result.error).toBeNull();
  });

  test('Wave with Infinity total shows endless format', async ({ page }) => {
    await startCampaignGame(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      const hasIcon = s.hud.waveIcon !== null;
      s.hud.updateWave(5, Infinity);
      return { text: s.hud.waveText.text, hasIcon };
    });

    expect(result).not.toBeNull();
    expect(result.text).not.toContain('/');
    const expected = result.hasIcon ? '5' : '\u2694 5';
    expect(result.text).toBe(expected);
  });

  test('HP danger blink still works after position change', async ({ page }) => {
    await startCampaignGame(page);

    const blinkResult = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateHP(3, 20);
      const colors = [];
      for (let i = 0; i < 6; i++) {
        s.hud.updateBlink(0.5);
        colors.push(s.hud.hpText.style.color);
      }
      return {
        hpTextX: s.hud.hpText.x,
        colorChanges: colors,
        hasColorVariation: new Set(colors).size > 1,
      };
    });

    expect(blinkResult).not.toBeNull();
    expect(blinkResult.hasColorVariation).toBe(true);
    expect([175, 186]).toContain(blinkResult.hpTextX);
  });

  test('Diamond 5-digit (99999) overlap check with HP - INFO', async ({ page }) => {
    await startCampaignGame(page);

    const overlapData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return null;
      s.hud.updateGold(99999);
      const gt = s.hud.goldText;
      const hi = s.hud.hpIcon;
      const ht = s.hud.hpText;
      const hpLeftEdge = hi ? hi.x - (hi.displayWidth / 2) : ht.x;
      return {
        goldText: gt.text,
        goldTextRight: gt.x + gt.width,
        hpLeftEdge,
        gap: hpLeftEdge - (gt.x + gt.width),
      };
    });

    expect(overlapData).not.toBeNull();
    // Log the gap for info - 5-digit diamond is unrealistic
    console.log(`Diamond 99999 to HP gap: ${overlapData.gap}px`);
  });
});

// ── 7. Console Error Monitoring ──────────────────────────────────

test.describe('Console Error Monitoring', () => {
  test('No console errors during game startup and HUD operations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await startCampaignGame(page);
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud) return;
      s.hud.updateWave(30, 30);
      s.hud.updateGold(9999);
      s.hud.updateHP(999, 999);
      s.hud.updateHP(3, 20);
      s.hud.updateBlink(0.5);
      s.hud.updateWave(1, null);
    });
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});

// ── 8. Button Positions Unchanged ────────────────────────────────

test.describe('Button Positions Unchanged', () => {
  test('Music button at x=278 and Pause button at x=310', async ({ page }) => {
    await startCampaignGame(page);

    const btnPositions = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s) return null;
      return {
        muteBtn: s.muteBtn ? { x: s.muteBtn.x, width: s.muteBtn.width } : null,
        pauseBtn: s.pauseBtn ? { x: s.pauseBtn.x } : null,
      };
    });

    expect(btnPositions).not.toBeNull();
    if (btnPositions.muteBtn) expect(btnPositions.muteBtn.x).toBe(278);
    if (btnPositions.pauseBtn) expect(btnPositions.pauseBtn.x).toBe(310);
  });
});

// ── 9. Existing Test Pattern Compatibility ───────────────────────

test.describe('Existing Test Pattern Compatibility', () => {
  test('Campaign wave matches /1\\/\\d+/ from world-map-phase3.spec.js', async ({ page }) => {
    await startCampaignGame(page);

    const waveData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud || !s.hud.waveText) return null;
      return { text: s.hud.waveText.text };
    });

    expect(waveData).not.toBeNull();
    // If it has total waves, it should be X/Y format
    if (waveData.text.includes('/')) {
      expect(waveData.text).toMatch(/\d+\/\d+/);
    }
  });

  test('Endless wave matches /^\\u2694?\\s?\\d+$/ from world-map-phase3.spec.js', async ({ page }) => {
    await startEndlessGame(page);

    const waveData = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      if (!s || !s.hud || !s.hud.waveText) return null;
      return { text: s.hud.waveText.text };
    });

    expect(waveData).not.toBeNull();
    expect(waveData.text).toMatch(/^\u2694?\s?\d+$/);
    expect(waveData.text).not.toContain('/');
  });
});
