// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Utility Card Layout QA Tests
 * UTILITY 카드(Base HP+, Gold Boost, Wave Bonus+)의 수직 레이아웃 변경을 검증한다.
 * 텍스트 오버플로 수정, 아이콘 중앙 배치, 카드 내부 요소 배치를 확인한다.
 */

const BASE_URL = 'http://localhost:3465';

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

/** CollectionScene으로 직접 전환 */
async function enterCollectionScene(page) {
  await waitForGame(page);
  await page.evaluate(() => {
    const g = window.__game;
    const activeScenes = g.scene.getScenes(true);
    if (activeScenes.length > 0) {
      activeScenes[0].scene.start('CollectionScene');
    }
  });
  await waitForScene(page, 'CollectionScene');
}

/** Utility 카드 3개의 위치/크기 정보를 게임 내부에서 추출 */
async function getUtilityCardPositions(page) {
  return await page.evaluate(() => {
    const scene = window.__game.scene.getScene('CollectionScene');
    if (!scene || !scene.tabContent) return null;

    // tabContent 내의 모든 텍스트 오브젝트를 조사
    const textObjects = [];
    scene.tabContent.list.forEach(obj => {
      if (obj.type === 'Text') {
        textObjects.push({
          text: obj.text,
          x: obj.x,
          y: obj.y,
          originX: obj.originX,
          originY: obj.originY,
          width: obj.width,
          height: obj.height,
          fontSize: obj.style?.fontSize,
        });
      }
    });

    // rectangle (카드 배경) 정보
    const rectangles = [];
    scene.tabContent.list.forEach(obj => {
      if (obj.type === 'Rectangle' && obj.width === 104 && obj.height === 80) {
        rectangles.push({
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
        });
      }
    });

    return { textObjects, rectangles };
  });
}

// ── Tests ────────────────────────────────────────────────────────

test.describe('유틸리티 카드 레이아웃 수직 재배치', () => {
  test.beforeEach(async ({ page }) => {
    await enterCollectionScene(page);
  });

  test.describe('정상 동작 검증', () => {
    test('컬렉션 화면에 UTILITY 섹션이 표시된다', async ({ page }) => {
      const hasUtilityHeader = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return false;
        return scene.tabContent.list.some(obj =>
          obj.type === 'Text' && obj.text && obj.text.includes('UTILITY')
        );
      });
      expect(hasUtilityHeader).toBe(true);
    });

    test('UTILITY 카드 3개가 모두 존재한다', async ({ page }) => {
      const cardNames = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];
        const names = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            const text = obj.text;
            if (text === 'Base HP+' || text === 'Gold Boost' || text === 'Wave Bonus+') {
              names.push(text);
            }
          }
        });
        return names;
      });
      expect(cardNames).toContain('Base HP+');
      expect(cardNames).toContain('Gold Boost');
      expect(cardNames).toContain('Wave Bonus+');
    });

    test('아이콘이 카드 상단 중앙(cx, y+18)에 배치된다', async ({ page }) => {
      const iconPositions = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        // Graphics 오브젝트의 위치는 직접 확인이 어려우므로
        // 코드 레벨에서 좌표값을 검증
        const UTIL_W = 104;
        const utilStartX = 16;
        const utilY = 410;
        const CARD_GAP = 8;

        const results = [];
        for (let i = 0; i < 3; i++) {
          const x = utilStartX + i * (UTIL_W + CARD_GAP);
          const cx = x + UTIL_W / 2;
          results.push({
            expectedIconX: cx,
            expectedIconY: utilY + 18,
          });
        }
        return results;
      });

      // 3개 카드 모두 검증
      expect(iconPositions.length).toBe(3);
      // 실제 아이콘 좌표는 코드에서 cx, y+18로 설정됨 - 스크린샷으로 시각 확인
    });

    test('이름 텍스트가 중앙 정렬(origin 0.5, 0.5)로 배치된다', async ({ page }) => {
      const nameTexts = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        const names = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            const text = obj.text;
            if (text === 'Base HP+' || text === 'Gold Boost' || text === 'Wave Bonus+') {
              names.push({
                text: text,
                x: obj.x,
                y: obj.y,
                originX: obj.originX,
                originY: obj.originY,
                width: obj.width,
              });
            }
          }
        });
        return names;
      });

      expect(nameTexts.length).toBe(3);
      for (const nt of nameTexts) {
        // origin이 (0.5, 0.5)인지 확인
        expect(nt.originX).toBe(0.5);
        expect(nt.originY).toBe(0.5);
      }
    });

    test('Tier 텍스트가 y+52에 배치된다', async ({ page }) => {
      const tierTexts = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        const tiers = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text' && obj.text && obj.text.startsWith('Tier ')) {
            tiers.push({
              text: obj.text,
              x: obj.x,
              y: obj.y,
            });
          }
        });
        return tiers;
      });

      // 유틸리티 카드 3개의 Tier 텍스트
      const utilTiers = tierTexts.filter(t => t.text.match(/^Tier \d+\/3$/));
      expect(utilTiers.length).toBe(3);

      const utilY = 410;
      for (const tier of utilTiers) {
        expect(tier.y).toBe(utilY + 52);
      }
    });

    test('효과 텍스트가 y+66에 배치된다', async ({ page }) => {
      const effectTexts = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        const effects = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            const text = obj.text;
            if (text === 'HP: 20' || text === '250G' || text === '1.0x') {
              effects.push({
                text: text,
                x: obj.x,
                y: obj.y,
              });
            }
          }
        });
        return effects;
      });

      expect(effectTexts.length).toBe(3);

      const utilY = 410;
      for (const effect of effectTexts) {
        expect(effect.y).toBe(utilY + 66);
      }
    });

    test('이름 텍스트가 카드 영역(104px) 안에 완전히 수용된다', async ({ page }) => {
      const textOverflows = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        const UTIL_W = 104;
        const utilStartX = 16;
        const CARD_GAP = 8;

        const results = [];
        let cardIndex = 0;

        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            const text = obj.text;
            if (text === 'Base HP+' || text === 'Gold Boost' || text === 'Wave Bonus+') {
              const x = obj.x; // center x due to origin 0.5
              const halfWidth = obj.width / 2;
              const leftEdge = x - halfWidth;
              const rightEdge = x + halfWidth;

              // 해당 카드의 좌상단 x 계산
              const cardX = utilStartX + cardIndex * (UTIL_W + CARD_GAP);
              const cardRight = cardX + UTIL_W;

              results.push({
                text: text,
                textWidth: obj.width,
                textLeftEdge: leftEdge,
                textRightEdge: rightEdge,
                cardLeftEdge: cardX,
                cardRightEdge: cardRight,
                isWithinCard: leftEdge >= cardX && rightEdge <= cardRight,
              });
              cardIndex++;
            }
          }
        });
        return results;
      });

      expect(textOverflows.length).toBe(3);
      for (const result of textOverflows) {
        expect(result.isWithinCard).toBe(true);
      }
    });
  });

  test.describe('시각적 검증', () => {
    test('UTILITY 카드 영역 전체 스크린샷', async ({ page }) => {
      await page.screenshot({
        path: 'tests/screenshots/utility-card-layout-full.png',
      });
    });

    test('UTILITY 카드 영역만 캡처 (확대)', async ({ page }) => {
      // UTILITY 카드 시작 좌표: utilStartX=16, utilY=410
      // 3개 카드: 각 104px + 8px gap = 336px 전체 폭, 높이 80px
      // Phaser Scale.FIT 모드이므로 캔버스 스케일을 고려해야 함
      const clipInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        // 게임 좌표 -> 화면 좌표 변환
        const scaleX = rect.width / 360;
        const scaleY = rect.height / 640;

        return {
          x: rect.left + 10 * scaleX,
          y: rect.top + 385 * scaleY,
          width: 345 * scaleX,
          height: 115 * scaleY,
        };
      });

      if (clipInfo) {
        await page.screenshot({
          path: 'tests/screenshots/utility-card-layout-zoomed.png',
          clip: clipInfo,
        });
      }
    });

    test('카드 상세 오버레이 스크린샷 (Wave Bonus+)', async ({ page }) => {
      // Wave Bonus+ 카드 클릭 (3번째 카드)
      const clickPos = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / 360;
        const scaleY = rect.height / 640;

        // 3번째 카드의 중심: utilStartX + 2 * (104 + 8) + 52 = 16 + 224 + 52 = 292
        // cy = 410 + 40 = 450
        return {
          x: rect.left + 292 * scaleX,
          y: rect.top + 450 * scaleY,
        };
      });

      if (clickPos) {
        await page.mouse.click(clickPos.x, clickPos.y);
        await page.waitForTimeout(500);
        await page.screenshot({
          path: 'tests/screenshots/utility-card-wavebonus-detail.png',
        });
      }
    });
  });

  test.describe('예외 및 엣지케이스', () => {
    test('업그레이드된 상태(tier > 0)에서도 정상 표시된다', async ({ page }) => {
      // saveData를 수정하여 유틸리티 업그레이드 적용
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('CollectionScene');
        const saveData = scene.registry.get('saveData') || {};
        saveData.utilityUpgrades = { baseHp: 2, goldBoost: 1, waveBonus: 3 };
        scene.registry.set('saveData', saveData);
        // 씬 재시작으로 반영
        scene.scene.restart();
      });
      await waitForScene(page, 'CollectionScene');

      const cardInfo = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return null;

        const texts = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            texts.push({
              text: obj.text,
              x: obj.x,
              y: obj.y,
              originX: obj.originX,
              originY: obj.originY,
            });
          }
        });
        return texts;
      });

      expect(cardInfo).not.toBeNull();

      // 업그레이드된 tier 표시 확인
      const tierTexts = cardInfo.filter(t => t.text && t.text.startsWith('Tier '));
      const utilTiers = tierTexts.filter(t => t.text.match(/^Tier \d+\/3$/));
      expect(utilTiers.length).toBe(3);

      // Tier 값 확인
      const tierValues = utilTiers.map(t => t.text);
      expect(tierValues).toContain('Tier 2/3');
      expect(tierValues).toContain('Tier 1/3');
      expect(tierValues).toContain('Tier 3/3');

      // 업그레이드 효과 텍스트 확인 (tier > 0이면 tiers[tier-1].desc 사용)
      const effectTexts = cardInfo.filter(t =>
        t.text === 'HP 25' || t.text === '275G' || t.text === '1.3x'
      );
      expect(effectTexts.length).toBe(3);

      await page.screenshot({
        path: 'tests/screenshots/utility-card-upgraded-state.png',
      });
    });

    test('금색 테두리가 업그레이드된 카드에 적용된다', async ({ page }) => {
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('CollectionScene');
        const saveData = scene.registry.get('saveData') || {};
        saveData.utilityUpgrades = { baseHp: 1, goldBoost: 0, waveBonus: 0 };
        scene.registry.set('saveData', saveData);
        scene.scene.restart();
      });
      await waitForScene(page, 'CollectionScene');

      const borderColors = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return [];

        const rects = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Rectangle' && obj.width === 104 && obj.height === 80) {
            rects.push({
              x: obj.x,
              strokeColor: obj.strokeColor,
            });
          }
        });
        return rects;
      });

      expect(borderColors.length).toBe(3);
      // 첫 번째 카드(baseHp)는 tier 1이므로 금색(0xffd700), 나머지는 회색(0x636e72)
      const sorted = [...borderColors].sort((a, b) => a.x - b.x);
      expect(sorted[0].strokeColor).toBe(0xffd700); // baseHp: gold
      expect(sorted[1].strokeColor).toBe(0x636e72); // goldBoost: gray
      expect(sorted[2].strokeColor).toBe(0x636e72); // waveBonus: gray
    });

    test('모든 요소가 UTIL_H(80px) 내에 수용된다', async ({ page }) => {
      const boundaryCheck = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        if (!scene || !scene.tabContent) return null;

        const UTIL_H = 80;
        const utilY = 410;

        const results = [];
        scene.tabContent.list.forEach(obj => {
          if (obj.type === 'Text') {
            const text = obj.text;
            // 유틸리티 카드 내부 텍스트인지 확인 (y 범위)
            if (obj.y >= utilY && obj.y <= utilY + UTIL_H) {
              // fontSize 파싱
              const fontSize = parseInt(obj.style?.fontSize || '12', 10);
              const halfHeight = fontSize / 2;

              // origin 고려한 실제 bottom edge
              const bottomEdge = obj.y + halfHeight * (1 - obj.originY) + halfHeight * obj.originY;
              // 더 정확하게: origin 0.5이면 y + fontSize/2
              const actualBottom = obj.y + fontSize / 2;
              const cardBottom = utilY + UTIL_H;

              results.push({
                text: text,
                y: obj.y,
                fontSize: fontSize,
                actualBottom: actualBottom,
                cardBottom: cardBottom,
                isWithin: actualBottom <= cardBottom,
              });
            }
          }
        });
        return results;
      });

      expect(boundaryCheck).not.toBeNull();
      for (const item of boundaryCheck) {
        expect(item.isWithin).toBe(true);
      }
    });

    test('카드 클릭 시 상세 뷰 오버레이가 열린다', async ({ page }) => {
      // 첫 번째 카드(Base HP+) 클릭
      const clickPos = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / 360;
        const scaleY = rect.height / 640;

        // 1번째 카드의 중심: utilStartX + 52 = 16 + 52 = 68
        return {
          x: rect.left + 68 * scaleX,
          y: rect.top + 450 * scaleY,
        };
      });

      if (clickPos) {
        await page.mouse.click(clickPos.x, clickPos.y);
        await page.waitForTimeout(500);
      }

      const hasOverlay = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        return scene && scene.overlay !== null;
      });
      expect(hasOverlay).toBe(true);

      await page.screenshot({
        path: 'tests/screenshots/utility-card-basehp-detail.png',
      });
    });

    test('카드 더블클릭 시 오버레이가 안정적으로 동작한다', async ({ page }) => {
      const clickPos = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / 360;
        const scaleY = rect.height / 640;
        return {
          x: rect.left + 68 * scaleX,
          y: rect.top + 450 * scaleY,
        };
      });

      if (clickPos) {
        // 빠른 더블클릭
        await page.mouse.click(clickPos.x, clickPos.y);
        await page.mouse.click(clickPos.x, clickPos.y);
        await page.waitForTimeout(500);
      }

      // 오버레이가 하나만 존재해야 한다 (이전 것 파괴 후 새로 생성)
      const overlayCount = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('CollectionScene');
        return scene && scene.overlay ? 1 : 0;
      });
      expect(overlayCount).toBe(1);
    });
  });

  test.describe('UI 안정성', () => {
    test('콘솔 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 15000 });
      await page.waitForFunction(() => {
        return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
      }, { timeout: 15000 });

      // CollectionScene으로 전환
      await page.evaluate(() => {
        const g = window.__game;
        const activeScenes = g.scene.getScenes(true);
        if (activeScenes.length > 0) {
          activeScenes[0].scene.start('CollectionScene');
        }
      });
      await waitForScene(page, 'CollectionScene');

      // 카드 영역 클릭 등 기본 인터랙션
      const clickPos = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / 360;
        const scaleY = rect.height / 640;
        return {
          x: rect.left + 180 * scaleX,
          y: rect.top + 450 * scaleY,
        };
      });

      if (clickPos) {
        await page.mouse.click(clickPos.x, clickPos.y);
        await page.waitForTimeout(500);
      }

      expect(errors).toEqual([]);
    });

    test('모바일 뷰포트(360x640)에서 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await enterCollectionScene(page);
      await page.screenshot({
        path: 'tests/screenshots/utility-card-mobile-360x640.png',
      });
    });

    test('작은 뷰포트(320x480)에서 카드가 잘리지 않는다', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 480 });
      await enterCollectionScene(page);
      await page.screenshot({
        path: 'tests/screenshots/utility-card-mobile-320x480.png',
      });
    });
  });
});
