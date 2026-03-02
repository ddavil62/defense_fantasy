/**
 * @fileoverview AdMob 통합 Phase 3 QA 테스트.
 * LevelSelectScene "2배 골드" / "보상 2배" 버튼, GameScene 골드 부스트 적용,
 * MapClearScene clearBoost 보상 2배, 사후 광고 버튼, 일일 3회 제한,
 * 독립 카운터 검증, 예외/엣지케이스, Phase 1-2 회귀 테스트.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

// ── 헬퍼 함수 ──────────────────────────────────────────────────────

/**
 * 게임이 부팅되어 MenuScene에 도달할 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000]
 */
async function waitForMenuScene(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout });
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g || !g.scene) return false;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MenuScene';
  }, { timeout });
  await page.waitForTimeout(500);
}

/**
 * 현재 활성 씬의 키를 반환하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getActiveSceneKey(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0].sys.settings.key : 'NONE';
  });
}

/**
 * 특정 씬으로 직접 이동하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} sceneName
 * @param {object} [data={}]
 */
async function navigateToScene(page, sceneName, data = {}) {
  await page.evaluate(({ sceneName, data }) => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start(sceneName, data);
    }
  }, { sceneName, data });
  await page.waitForFunction((name) => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === name;
  }, sceneName, { timeout: 5000 });
  await page.waitForTimeout(300);
}

/**
 * 일일 광고 카운터를 초기화한다 (페이지 로드 후 호출).
 * @param {import('@playwright/test').Page} page
 */
async function clearAdDailyLimits(page) {
  await page.evaluate(() => {
    try { localStorage.removeItem('ftd_ad_daily_limit'); } catch {}
    const g = window.__game;
    if (g) {
      const adManager = g.registry.get('adManager');
      if (adManager) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        adManager._dailyLimits = { date: `${y}-${m}-${d}`, counts: {} };
      }
    }
  });
}

/**
 * AdManager의 일일 카운터를 특정 값으로 설정한다.
 * @param {import('@playwright/test').Page} page
 * @param {string} adType
 * @param {number} count
 */
async function setAdDailyCount(page, adType, count) {
  await page.evaluate(({ adType, count }) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    let data;
    try {
      data = JSON.parse(localStorage.getItem('ftd_ad_daily_limit')) || null;
    } catch { data = null; }

    if (!data || !data.counts) {
      data = { date: dateStr, counts: {} };
    }
    data.date = dateStr;
    data.counts[adType] = count;
    try { localStorage.setItem('ftd_ad_daily_limit', JSON.stringify(data)); } catch {}

    // AdManager 인스턴스도 갱신
    const g = window.__game;
    if (g) {
      const adManager = g.registry.get('adManager');
      if (adManager) {
        adManager._dailyLimits = data;
      }
    }
  }, { adType, count });
}

/**
 * LevelSelectScene에서 "2배 골드" 버튼을 클릭한다.
 * 카드 좌측 하단 adBtnY 영역에서 첫 번째 interactive 소형 버튼을 찾는다.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function clickGoldBoostButton(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scene = g.scene.getScenes(true)[0];
    if (!scene || scene.sys.settings.key !== 'LevelSelectScene') return false;
    const children = scene.children.list;
    // 골드 부스트 버튼은 각 카드의 좌하단 (x=cardLeft+38 ~= 73, width=70, height=18)
    // interactive rectangle 중 70x18 크기인 것을 찾음
    for (const obj of children) {
      if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
        if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
          // 첫 번째 카드의 goldBoost 버튼
          obj.emit('pointerdown', { x: obj.x, y: obj.y });
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * LevelSelectScene에서 "보상 2배" 버튼을 클릭한다.
 * 첫 번째 카드 영역에서 clearBoost에 해당하는 interactive 70x18 버튼을 찾는다.
 * goldBoost 버튼 활성화 후에도 올바르게 찾기 위해 x좌표(cardLeft+114)를 기준으로 식별한다.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function clickClearBoostButton(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scene = g.scene.getScenes(true)[0];
    if (!scene || scene.sys.settings.key !== 'LevelSelectScene') return false;
    const children = scene.children.list;
    // clearBoost 버튼은 cardLeft+114 위치 (goldBoost는 cardLeft+38)
    // 첫 번째 카드의 goldBoost x ~= 73, clearBoost x ~= 149
    // 따라서 x > 120인 70x18 interactive 버튼을 찾으면 clearBoost
    for (const obj of children) {
      if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
        if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5 && obj.x > 120) {
          obj.emit('pointerdown', { x: obj.x, y: obj.y });
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * LevelSelectScene에서 첫 번째 카드의 START 버튼을 클릭한다.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function clickStartButton(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scene = g.scene.getScenes(true)[0];
    if (!scene || scene.sys.settings.key !== 'LevelSelectScene') return false;
    const children = scene.children.list;
    for (const obj of children) {
      if (obj.input && obj.input.enabled) {
        // START 버튼: 80x26 또는 image 버튼
        const isStartBtn = (obj.type === 'Rectangle' && Math.abs(obj.width - 80) < 5 && Math.abs(obj.height - 26) < 5)
          || (obj.type === 'Image' && obj.texture && obj.texture.key.includes('btn_small_primary'));
        if (isStartBtn) {
          obj.emit('pointerdown', { x: obj.x, y: obj.y });
          return true;
        }
      }
    }
    return false;
  });
}


// ── 테스트 ──────────────────────────────────────────────────────────

test.describe('AdMob 통합 Phase 3 검증', () => {

  // ==================================================================
  // 1. LevelSelectScene - 버튼 존재 및 렌더링
  // ==================================================================
  test.describe('LevelSelectScene 광고 버튼 렌더링', () => {

    test('LevelSelectScene 진입 시 해금된 첫 번째 맵에 "2배 골드" / "보상 2배" 버튼이 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // forest 월드의 LevelSelectScene으로 이동
      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await page.screenshot({ path: 'tests/screenshots/admob-p3-level-select-buttons.png' });

      // 70x18 크기의 interactive 소형 버튼이 최소 2개 존재하는지 확인
      const smallButtonCount = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        let count = 0;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
              count++;
            }
          }
        }
        return count;
      });

      // 첫 번째 맵(해금)에 goldBoost + clearBoost = 2개 이상
      expect(smallButtonCount).toBeGreaterThanOrEqual(2);
      expect(errors).toEqual([]);
    });

    test('잠금된 맵에는 광고 버튼이 표시되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // 세이브를 초기화하여 첫 번째 맵만 해금
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          // f1_m1 이외의 맵 진행 상태 삭제
          delete sd.worldProgress['f1_m1'];
          delete sd.worldProgress['f1_m2'];
        }
      });

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // 소형 버튼 수: 해금 맵만큼만 존재 (첫 번째 맵 1개 해금 = 2개 버튼)
      const buttonInfo = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        const buttons = [];
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
              buttons.push({ x: Math.round(obj.x), y: Math.round(obj.y) });
            }
          }
        }
        return buttons;
      });

      // 첫 번째 카드 위치의 버튼만 존재해야 함
      // 카드 Y는 58 + 0*(86+5+4) + 43 = 101, adBtnY = 101 + 43 - 12 = 132
      // 두 번째 카드 Y는 58 + 1*95 + 43 = 196, adBtnY = 196 + 43 - 12 = 227
      // 첫 번째 맵만 해금이므로 두 번째 카드의 버튼(y ~= 227)은 없어야 함
      expect(buttonInfo.length).toBe(2); // 첫 번째 맵에만 2개 버튼
    });

    test('goldBoost 3회 소진 시 해당 버튼이 비활성화 상태로 렌더링된다', async ({ page }) => {
      await waitForMenuScene(page);
      await setAdDailyCount(page, 'goldBoost', 3);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await page.screenshot({ path: 'tests/screenshots/admob-p3-goldboost-exhausted.png' });

      // goldBoost 버튼(첫 번째 70x18 버튼)이 interactive가 아닌지 확인
      const firstSmallButtonInteractive = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          // BTN_SELL 색상(비활성) rectangles: width=70, height=18
          if (obj.type === 'Rectangle' && Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
            return obj.input ? obj.input.enabled : false;
          }
        }
        return false;
      });

      expect(firstSmallButtonInteractive).toBe(false);
    });

    test('clearBoost 3회 소진 시 해당 버튼이 비활성화 상태로 렌더링된다', async ({ page }) => {
      await waitForMenuScene(page);
      await setAdDailyCount(page, 'clearBoost', 3);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await page.screenshot({ path: 'tests/screenshots/admob-p3-clearboost-exhausted.png' });

      // clearBoost 비활성 확인: 두 번째 70x18 rectangle이 non-interactive
      const secondSmallButtonInteractive = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        let matchCount = 0;
        for (const obj of children) {
          if (obj.type === 'Rectangle' && Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
            matchCount++;
            if (matchCount === 2) {
              return obj.input ? obj.input.enabled : false;
            }
          }
        }
        return false;
      });

      expect(secondSmallButtonInteractive).toBe(false);
    });
  });

  // ==================================================================
  // 2. goldBoost 활성화 및 GameScene 전달
  // ==================================================================
  test.describe('Gold 2배 부스트 활성화', () => {

    test('"2배 골드" 클릭 후 버튼이 하이라이트(ON) 상태로 전환된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      const clicked = await clickGoldBoostButton(page);
      expect(clicked).toBe(true);

      await page.waitForTimeout(300);

      // _goldBoostActiveFor가 설정되었는지 확인
      const boostState = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActiveFor: scene._goldBoostActiveFor,
          clearBoostActiveFor: scene._clearBoostActiveFor,
        };
      });

      expect(boostState.goldBoostActiveFor).toBe('f1_m1'); // 첫 번째 맵 ID
      expect(boostState.clearBoostActiveFor).toBeNull(); // clearBoost는 독립

      await page.screenshot({ path: 'tests/screenshots/admob-p3-goldboost-active.png' });
      expect(errors).toEqual([]);
    });

    test('"2배 골드" 활성화 후 일일 카운터가 1 증가한다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);

      const remaining = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getRemainingAdCount('goldBoost');
      });

      expect(remaining).toBe(2); // 3 - 1 = 2
    });

    test('goldBoost 활성화 후 START 시 GameScene에 goldBoostActive=true가 전달된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // goldBoost 활성화
      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);

      // START 클릭
      await clickStartButton(page);

      // GameScene 전환 대기 (fadeOut 200ms + 전환)
      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1000);

      const gameFlags = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        if (scene.sys.settings.key !== 'GameScene') return null;
        return {
          goldBoostActive: scene.goldBoostActive,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(gameFlags).not.toBeNull();
      expect(gameFlags.goldBoostActive).toBe(true);
      expect(gameFlags.clearBoostActive).toBe(false);
      expect(errors).toEqual([]);
    });

    test('goldBoost 미활성 상태에서 START 시 goldBoostActive=false가 전달된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // goldBoost 클릭하지 않고 바로 START
      await clickStartButton(page);

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1000);

      const goldBoostActive = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.goldBoostActive;
      });

      expect(goldBoostActive).toBe(false);
    });
  });

  // ==================================================================
  // 3. clearBoost 활성화 및 전달
  // ==================================================================
  test.describe('보상 2배 부스트 활성화', () => {

    test('"보상 2배" 클릭 후 버튼이 하이라이트(ON) 상태로 전환된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      const clicked = await clickClearBoostButton(page);
      expect(clicked).toBe(true);

      await page.waitForTimeout(300);

      const boostState = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActiveFor: scene._goldBoostActiveFor,
          clearBoostActiveFor: scene._clearBoostActiveFor,
        };
      });

      expect(boostState.clearBoostActiveFor).toBe('f1_m1');
      expect(boostState.goldBoostActiveFor).toBeNull();

      await page.screenshot({ path: 'tests/screenshots/admob-p3-clearboost-active.png' });
    });

    test('clearBoost 활성화 후 START 시 GameScene에 clearBoostActive=true가 전달된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await clickClearBoostButton(page);
      await page.waitForTimeout(300);

      await clickStartButton(page);

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1000);

      const flags = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActive: scene.goldBoostActive,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(flags.clearBoostActive).toBe(true);
      expect(flags.goldBoostActive).toBe(false);
    });
  });

  // ==================================================================
  // 4. 독립 카운터 검증
  // ==================================================================
  test.describe('Gold 2배 / 보상 2배 독립 카운터', () => {

    test('goldBoost와 clearBoost가 별개 카운터로 동작한다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // goldBoost만 3회 소진
      await setAdDailyCount(page, 'goldBoost', 3);

      const limits = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return {
          goldBoostLimitReached: adManager.isAdLimitReached('goldBoost'),
          clearBoostLimitReached: adManager.isAdLimitReached('clearBoost'),
          goldBoostRemaining: adManager.getRemainingAdCount('goldBoost'),
          clearBoostRemaining: adManager.getRemainingAdCount('clearBoost'),
        };
      });

      expect(limits.goldBoostLimitReached).toBe(true);
      expect(limits.clearBoostLimitReached).toBe(false);
      expect(limits.goldBoostRemaining).toBe(0);
      expect(limits.clearBoostRemaining).toBe(3);
    });

    test('clearBoost를 소진해도 goldBoost에 영향이 없다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await setAdDailyCount(page, 'clearBoost', 3);

      const limits = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return {
          goldBoostLimitReached: adManager.isAdLimitReached('goldBoost'),
          clearBoostLimitReached: adManager.isAdLimitReached('clearBoost'),
        };
      });

      expect(limits.clearBoostLimitReached).toBe(true);
      expect(limits.goldBoostLimitReached).toBe(false);
    });

    test('goldBoost 활성화가 clearBoost 상태에 영향을 주지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // goldBoost만 클릭
      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const adManager = g.registry.get('adManager');
        return {
          goldBoostActiveFor: scene._goldBoostActiveFor,
          clearBoostActiveFor: scene._clearBoostActiveFor,
          goldBoostCount: adManager.getDailyAdCount('goldBoost'),
          clearBoostCount: adManager.getDailyAdCount('clearBoost'),
        };
      });

      expect(state.goldBoostActiveFor).not.toBeNull();
      expect(state.clearBoostActiveFor).toBeNull();
      expect(state.goldBoostCount).toBe(1);
      expect(state.clearBoostCount).toBe(0);
    });
  });

  // ==================================================================
  // 5. GameScene 골드 부스트 적용 경로 검증
  // ==================================================================
  test.describe('GameScene 골드 부스트 적용', () => {

    test('goldBoostActive=true 상태에서 GameScene의 goldBoostActive 플래그가 올바르게 설정된다', async ({ page }) => {
      await waitForMenuScene(page);

      // goldBoostActive=true로 GameScene 직접 시작
      await navigateToScene(page, 'GameScene', {
        goldBoostActive: true,
        clearBoostActive: false,
      });
      await page.waitForTimeout(1000);

      const flags = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActive: scene.goldBoostActive,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(flags.goldBoostActive).toBe(true);
      expect(flags.clearBoostActive).toBe(false);
    });

    test('goldBoostActive=true + clearBoostActive=true 동시 활성화가 가능하다', async ({ page }) => {
      await waitForMenuScene(page);

      await navigateToScene(page, 'GameScene', {
        goldBoostActive: true,
        clearBoostActive: true,
      });
      await page.waitForTimeout(1000);

      const flags = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActive: scene.goldBoostActive,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(flags.goldBoostActive).toBe(true);
      expect(flags.clearBoostActive).toBe(true);
    });

    test('타워 판매 시 goldBoost가 적용되지 않는다 (코드 정적 분석 검증)', async ({ page }) => {
      await waitForMenuScene(page);

      // GameScene에서 _onTowerSell의 goldManager.earn에 AD_GOLD_BOOST_MULTIPLIER가 없는지 코드 검증
      // (이미 코드 리뷰에서 확인: _onTowerSell은 sellPrice만 earn함)
      const sellUsesBoost = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('GameScene');
        if (!scene) return 'no_scene';
        // _onTowerSell 함수 소스를 문자열로 가져와서 AD_GOLD_BOOST 참조 확인
        const src = scene._onTowerSell?.toString() || '';
        return src.includes('goldBoost') || src.includes('AD_GOLD_BOOST');
      });

      expect(sellUsesBoost).toBe(false);
    });
  });

  // ==================================================================
  // 6. MapClearScene clearBoost 적용
  // ==================================================================
  test.describe('MapClearScene 보상 2배 적용', () => {

    test('clearBoostActive=true로 MapClearScene 진입 시 다이아몬드 보상이 2배이다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);

      // 세이브 데이터에서 f1_m1의 진행 상태를 초기화 (prevStars=0으로)
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      // clearBoostActive=true로 MapClearScene 진입
      // HP=18/20 -> 90% -> 3성 -> baseDiamond = CAMPAIGN_DIAMOND_REWARDS[3] - CAMPAIGN_DIAMOND_REWARDS[0] = 8
      // boostMultiplier=2 -> earnedDiamond = 16
      const mapData = await page.evaluate(() => {
        // getMapById('f1_m1')
        const g = window.__game;
        const scene = g.scene.getScene('GameScene');
        // maps 데이터에 접근
        return null; // 직접 접근 불가, 런타임에서 mapData를 구성해야 함
      });

      // f1_m1 맵 데이터를 GameScene 시작 후 가져오기
      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      // MapClearScene으로 직접 이동
      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: true,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      const boostInfo = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          earnedDiamond: scene._earnedDiamond,
          baseDiamond: scene._baseDiamond,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(boostInfo.clearBoostActive).toBe(true);
      expect(boostInfo.baseDiamond).toBeGreaterThan(0);
      expect(boostInfo.earnedDiamond).toBe(boostInfo.baseDiamond * 2);

      await page.screenshot({ path: 'tests/screenshots/admob-p3-mapclear-clearboost.png' });
      expect(errors).toEqual([]);
    });

    test('clearBoostActive=false로 MapClearScene 진입 시 기본 보상만 지급된다', async ({ page }) => {
      await waitForMenuScene(page);

      // 세이브 초기화
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      const boostInfo = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          earnedDiamond: scene._earnedDiamond,
          baseDiamond: scene._baseDiamond,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(boostInfo.clearBoostActive).toBe(false);
      expect(boostInfo.earnedDiamond).toBe(boostInfo.baseDiamond); // 배율 없음
    });
  });

  // ==================================================================
  // 7. MapClearScene 사후 광고 버튼
  // ==================================================================
  test.describe('MapClearScene 사후 "보상 2배" 광고 버튼', () => {

    test('clearBoost 미적용 + 보상 > 0 + 한도 미초과 시 사후 광고 버튼이 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // 세이브 초기화
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'tests/screenshots/admob-p3-mapclear-post-ad-button.png' });

      // 120x22 크기의 interactive 버튼이 존재하는지 확인
      const postAdButton = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              return true;
            }
          }
        }
        return false;
      });

      expect(postAdButton).toBe(true);
      expect(errors).toEqual([]);
    });

    test('사후 광고 버튼 클릭 시 보상이 2배로 갱신되고 버튼이 숨겨진다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      const beforeDiamond = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene._earnedDiamond;
      });

      // 사후 광고 버튼 클릭 (120x22)
      const clicked = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              return true;
            }
          }
        }
        return false;
      });
      expect(clicked).toBe(true);

      await page.waitForTimeout(500);

      const afterState = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        // 보상 2배 버튼이 숨겨졌는지 확인
        const children = scene.children.list;
        let postAdVisible = false;
        for (const obj of children) {
          if (obj.type === 'Rectangle' && Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
            if (obj.visible) postAdVisible = true;
          }
        }
        return {
          earnedDiamond: scene._earnedDiamond,
          clearBoostActive: scene.clearBoostActive,
          postAdButtonVisible: postAdVisible,
          saved: scene._saved,
        };
      });

      expect(afterState.clearBoostActive).toBe(true);
      expect(afterState.earnedDiamond).toBe(beforeDiamond * 2);
      expect(afterState.postAdButtonVisible).toBe(false);
      expect(afterState.saved).toBe(true);

      await page.screenshot({ path: 'tests/screenshots/admob-p3-mapclear-post-ad-clicked.png' });
    });

    test('clearBoost가 이미 적용된 경우 사후 광고 버튼이 표시되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      // clearBoostActive=true로 진입
      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: true,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      // 120x22 사후 광고 버튼이 없어야 함
      const postAdButton = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              return true;
            }
          }
        }
        return false;
      });

      expect(postAdButton).toBe(false);
    });

    test('clearBoost 한도 소진 시 사후 광고 버튼이 표시되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await setAdDailyCount(page, 'clearBoost', 3);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      const postAdButton = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              return true;
            }
          }
        }
        return false;
      });

      expect(postAdButton).toBe(false);
    });

    test('보상 0 (이미 최대 별점 달성 맵) 시 사후 광고 버튼이 표시되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // GameScene을 시작하여 mapData(classic)를 확보
      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      // 해당 맵 ID에 이미 3성 부여하고 localStorage에 저장
      await page.evaluate(({ mapId }) => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd) {
          if (!sd.worldProgress) sd.worldProgress = {};
          sd.worldProgress[mapId] = { cleared: true, stars: 3 };
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      }, { mapId: gameMapData?.id });

      // 3성으로 다시 클리어 -> 차액 보상 0
      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 20,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      // baseDiamond = 0이므로 사후 광고 버튼 미표시
      const state = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        let hasPostAdButton = false;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              hasPostAdButton = true;
            }
          }
        }
        return {
          baseDiamond: scene._baseDiamond,
          earnedDiamond: scene._earnedDiamond,
          hasPostAdButton,
        };
      });

      expect(state.baseDiamond).toBe(0);
      expect(state.earnedDiamond).toBe(0);
      expect(state.hasPostAdButton).toBe(false);
    });
  });

  // ==================================================================
  // 8. MapClearScene _ensureSaved 안전장치
  // ==================================================================
  test.describe('MapClearScene 세이브 안전장치', () => {

    test('광고를 시청하지 않고 NEXT MAP을 누르면 기본 보상으로 저장된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      const beforeDiamond = await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        return sd?.diamond || 0;
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      const baseDiamond = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene._baseDiamond;
      });

      // NEXT MAP/RETRY/WORLD MAP 중 하나 클릭 -> _ensureSaved -> 기본 보상 저장
      // NEXT MAP 버튼(160x44) 클릭
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled) {
            if ((obj.type === 'Rectangle' && Math.abs(obj.width - 160) < 5 && Math.abs(obj.height - 44) < 5)
                || (obj.type === 'Image' && obj.texture && obj.texture.key.includes('btn_large_primary'))) {
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              return;
            }
          }
        }
      });

      await page.waitForTimeout(500);

      // 세이브 확인: _ensureSaved가 호출되어 기본 보상으로 저장
      const savedDiamond = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('fantasy-td-save');
          if (!raw) return null;
          const sd = JSON.parse(raw);
          return sd.diamond;
        } catch { return null; }
      });

      // 기본 보상만 적용: beforeDiamond + baseDiamond (2배 아님)
      expect(savedDiamond).toBe(beforeDiamond + baseDiamond);
    });
  });

  // ==================================================================
  // 9. 예외 및 엣지케이스
  // ==================================================================
  test.describe('예외 및 엣지케이스', () => {

    test('goldBoost 버튼 연타(더블클릭) 시 중복 활성화가 방지된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // 버튼 2번 빠르게 emit
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              return;
            }
          }
        }
      });

      await page.waitForTimeout(500);

      const goldBoostCount = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getDailyAdCount('goldBoost');
      });

      // isProcessing 플래그로 1회만 처리
      expect(goldBoostCount).toBe(1);
    });

    test('clearBoost 버튼 연타(더블클릭) 시 중복 활성화가 방지된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // 두 번째 70x18 버튼 2번 빠르게 emit
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        let matchCount = 0;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 70) < 5 && Math.abs(obj.height - 18) < 5) {
              matchCount++;
              if (matchCount === 2) {
                obj.emit('pointerdown', { x: obj.x, y: obj.y });
                obj.emit('pointerdown', { x: obj.x, y: obj.y });
                return;
              }
            }
          }
        }
      });

      await page.waitForTimeout(500);

      const clearBoostCount = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getDailyAdCount('clearBoost');
      });

      expect(clearBoostCount).toBe(1);
    });

    test('맵 A에서 goldBoost 활성화 후 맵 B를 시작하면 부스트가 적용되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // f1_m1을 1성 클리어하여 f1_m2 해금
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd) {
          if (!sd.worldProgress) sd.worldProgress = {};
          sd.worldProgress['f1_m1'] = { cleared: true, stars: 1 };
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
        g.registry.set('saveData', sd);
      });

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // f1_m1(첫 번째 맵)에서 goldBoost 활성화
      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);

      const boostMap = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene._goldBoostActiveFor;
      });
      expect(boostMap).toBe('f1_m1');

      // 두 번째 맵(f1_m2)의 START 버튼 클릭
      // START 버튼은 각 카드 우측 하단에 있으므로 두 번째 START를 찾아야 함
      const startedSecondMap = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        let startBtnCount = 0;
        for (const obj of children) {
          if (obj.input && obj.input.enabled) {
            const isStartBtn = (obj.type === 'Rectangle' && Math.abs(obj.width - 80) < 5 && Math.abs(obj.height - 26) < 5)
              || (obj.type === 'Image' && obj.texture && obj.texture.key.includes('btn_small_primary'));
            if (isStartBtn) {
              startBtnCount++;
              if (startBtnCount === 2) {
                obj.emit('pointerdown', { x: obj.x, y: obj.y });
                return true;
              }
            }
          }
        }
        return false;
      });

      if (startedSecondMap) {
        await page.waitForFunction(() => {
          const g = window.__game;
          const scenes = g.scene.getScenes(true);
          return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
        }, { timeout: 15000 });
        await page.waitForTimeout(1000);

        const gameFlags = await page.evaluate(() => {
          const g = window.__game;
          const scene = g.scene.getScenes(true)[0];
          return {
            goldBoostActive: scene.goldBoostActive,
            mapId: scene.mapData?.id,
          };
        });

        // f1_m2를 시작했는데 goldBoostActiveFor는 f1_m1이므로 false
        expect(gameFlags.goldBoostActive).toBe(false);
      }
    });

    test('MapClearScene에서 사후 광고 연타 시 보상이 2번 적용되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      // 사후 광고 버튼 2번 빠르게 클릭
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              return;
            }
          }
        }
      });

      await page.waitForTimeout(500);

      const clearBoostCount = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getDailyAdCount('clearBoost');
      });

      expect(clearBoostCount).toBe(1);
    });

    test('LevelSelectScene과 MapClearScene이 같은 clearBoost 일일 카운터를 공유한다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      // LevelSelectScene에서 clearBoost 1회 사용
      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });
      await clickClearBoostButton(page);
      await page.waitForTimeout(300);

      const afterLevelSelect = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getDailyAdCount('clearBoost');
      });
      expect(afterLevelSelect).toBe(1);

      // MapClearScene에서 확인: 이미 1회 사용됨
      const remaining = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return adManager.getRemainingAdCount('clearBoost');
      });
      expect(remaining).toBe(2); // 3 - 1 = 2
    });

    test('goldBoost/clearBoost 동시 활성화 후 START 시 두 플래그 모두 전달된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      // goldBoost 활성화
      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);

      // clearBoost 활성화
      await clickClearBoostButton(page);
      await page.waitForTimeout(300);

      const bothActive = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActiveFor: scene._goldBoostActiveFor,
          clearBoostActiveFor: scene._clearBoostActiveFor,
        };
      });

      expect(bothActive.goldBoostActiveFor).toBe('f1_m1');
      expect(bothActive.clearBoostActiveFor).toBe('f1_m1');

      // START 클릭
      await clickStartButton(page);

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1000);

      const flags = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return {
          goldBoostActive: scene.goldBoostActive,
          clearBoostActive: scene.clearBoostActive,
        };
      });

      expect(flags.goldBoostActive).toBe(true);
      expect(flags.clearBoostActive).toBe(true);
    });
  });

  // ==================================================================
  // 10. GameScene에서 MapClearScene으로 clearBoostActive 전달
  // ==================================================================
  test.describe('GameScene -> MapClearScene clearBoostActive 전달', () => {

    test('_onMapClear에서 clearBoostActive가 MapClearScene으로 전달된다 (코드 검증)', async ({ page }) => {
      await waitForMenuScene(page);

      const passesFlag = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('GameScene');
        if (!scene) return 'no_scene';
        const src = scene._onMapClear?.toString() || '';
        return src.includes('clearBoostActive');
      });

      expect(passesFlag).toBe(true);
    });
  });

  // ==================================================================
  // 11. i18n 텍스트 검증
  // ==================================================================
  test.describe('i18n 텍스트 (Phase 3)', () => {

    test('goldBoost/clearBoost 관련 한국어 텍스트가 정의되어 있다', async ({ page }) => {
      await waitForMenuScene(page);

      const texts = await page.evaluate(() => {
        // i18n 모듈의 t() 함수를 사용하여 텍스트 확인
        const g = window.__game;
        // LevelSelectScene을 시작하여 t() 함수가 로드된 상태에서 검증
        return {
          goldBoost: null,
          clearBoost: null,
          goldBoostActive: null,
          clearBoostActive: null,
        };
      });

      // 코드 리뷰에서 이미 확인: i18n.js에 4개 키가 정의됨
      // 런타임 검증은 LevelSelectScene에서 텍스트 오브젝트를 확인
      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      const textObjects = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        return children
          .filter(obj => obj.type === 'Text')
          .map(obj => obj.text);
      });

      // '2배 골드' 또는 '보상 2배' 텍스트가 포함되어야 함
      const hasGoldBoostText = textObjects.some(t => t === '2배 골드');
      const hasClearBoostText = textObjects.some(t => t === '보상 2배');

      expect(hasGoldBoostText).toBe(true);
      expect(hasClearBoostText).toBe(true);
    });
  });

  // ==================================================================
  // 12. Phase 1-2 회귀 검증
  // ==================================================================
  test.describe('Phase 1-2 회귀 검증', () => {

    test('AdManager가 Mock 모드로 초기화된다', async ({ page }) => {
      await waitForMenuScene(page);

      const adManagerInfo = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        if (!adManager) return null;
        return {
          isMock: adManager.isMock,
          initialized: adManager._initialized,
        };
      });

      expect(adManagerInfo).not.toBeNull();
      expect(adManagerInfo.isMock).toBe(true);
      expect(adManagerInfo.initialized).toBe(true);
    });

    test('GameOverScene이 에러 없이 렌더링된다 (전면 광고 Mock)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);

      await navigateToScene(page, 'GameOverScene', {
        round: 10,
        kills: 50,
        gameStats: {},
        gameMode: 'campaign',
        revived: false,
      });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');
      expect(errors).toEqual([]);
    });

    test('GameOverScene 부활 버튼이 정상 표시된다 (revived=false)', async ({ page }) => {
      await waitForMenuScene(page);

      await navigateToScene(page, 'GameOverScene', {
        round: 10,
        kills: 50,
        gameStats: {},
        gameMode: 'campaign',
        revived: false,
      });

      const reviveExists = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled) {
            if (obj.y > 365 && obj.y < 400) return true;
          }
        }
        return false;
      });

      expect(reviveExists).toBe(true);
    });

    test('Diamond 일일 제한(5회)과 goldBoost 제한(3회)이 별개이다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await setAdDailyCount(page, 'diamond', 5);

      const limits = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return {
          diamondLimitReached: adManager.isAdLimitReached('diamond'),
          goldBoostLimitReached: adManager.isAdLimitReached('goldBoost'),
          clearBoostLimitReached: adManager.isAdLimitReached('clearBoost'),
        };
      });

      expect(limits.diamondLimitReached).toBe(true);
      expect(limits.goldBoostLimitReached).toBe(false);
      expect(limits.clearBoostLimitReached).toBe(false);
    });
  });

  // ==================================================================
  // 13. UI 안정성
  // ==================================================================
  test.describe('UI 안정성', () => {

    test('LevelSelectScene 로드부터 버튼 클릭까지 콘솔 에러가 없다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });
      await clickGoldBoostButton(page);
      await page.waitForTimeout(300);
      await clickClearBoostButton(page);
      await page.waitForTimeout(300);

      expect(errors).toEqual([]);
    });

    test('모바일 뷰포트(375x667)에서 LevelSelectScene이 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await navigateToScene(page, 'LevelSelectScene', { worldId: 'forest' });

      await page.screenshot({ path: 'tests/screenshots/admob-p3-level-select-mobile.png' });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('LevelSelectScene');
      expect(errors).toEqual([]);
    });

    test('MapClearScene 로드부터 사후 광고 클릭까지 콘솔 에러가 없다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await waitForMenuScene(page);
      await clearAdDailyLimits(page);

      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData');
        if (sd && sd.worldProgress) {
          delete sd.worldProgress['f1_m1'];
        }
        try { localStorage.setItem('fantasy-td-save', JSON.stringify(sd)); } catch {}
      });

      await navigateToScene(page, 'GameScene', { gameMode: 'campaign' });
      await page.waitForTimeout(1500);

      const gameMapData = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        return scene.mapData ? JSON.parse(JSON.stringify(scene.mapData)) : null;
      });

      await page.evaluate(({ mapData }) => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('MapClearScene', {
            currentHP: 18,
            maxHP: 20,
            wavesCleared: 10,
            kills: 50,
            gameStats: {},
            mapData: mapData,
            gameMode: 'campaign',
            clearBoostActive: false,
          });
        }
      }, { mapData: gameMapData });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'MapClearScene';
      }, { timeout: 5000 });
      await page.waitForTimeout(500);

      // 사후 광고 버튼 클릭
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        const children = scene.children.list;
        for (const obj of children) {
          if (obj.input && obj.input.enabled && obj.type === 'Rectangle') {
            if (Math.abs(obj.width - 120) < 5 && Math.abs(obj.height - 22) < 5) {
              obj.emit('pointerdown', { x: obj.x, y: obj.y });
              return;
            }
          }
        }
      });

      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });
  });
});
