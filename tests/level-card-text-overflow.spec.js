// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Level Card Text Overflow QA Tests
 * LevelSelectScene / EndlessMapSelectScene 카드 텍스트 좌우 오버플로 수정 검증.
 * - cardLeft/cardRight 패딩 35px 적용 확인
 * - 설명 텍스트 wordWrap: { width: 160 } 적용 확인
 * - 텍스트가 기둥 장식 안쪽에 위치하는지 시각적 검증
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
  // Phaser 렌더링 안정화 대기
  await page.waitForTimeout(800);
}

/** LevelSelectScene으로 전환 (forest 월드) */
async function enterLevelSelectScene(page, worldId = 'forest') {
  await waitForGame(page);
  await page.evaluate((wId) => {
    const g = window.__game;
    const activeScenes = g.scene.getScenes(true);
    if (activeScenes.length > 0) {
      activeScenes[0].scene.start('LevelSelectScene', { worldId: wId });
    }
  }, worldId);
  await waitForScene(page, 'LevelSelectScene');
}

/** EndlessMapSelectScene으로 전환 */
async function enterEndlessMapSelectScene(page) {
  await waitForGame(page);
  await page.evaluate(() => {
    const g = window.__game;
    const activeScenes = g.scene.getScenes(true);
    if (activeScenes.length > 0) {
      activeScenes[0].scene.start('EndlessMapSelectScene');
    }
  });
  await waitForScene(page, 'EndlessMapSelectScene');
}

/** LevelSelectScene 내 모든 텍스트 객체의 위치/크기 정보를 추출 */
async function getLevelSelectTextObjects(page) {
  return await page.evaluate(() => {
    const scene = window.__game.scene.getScene('LevelSelectScene');
    if (!scene) return null;
    const texts = [];
    scene.children.list.forEach(obj => {
      if (obj.type === 'Text') {
        texts.push({
          text: obj.text,
          x: obj.x,
          y: obj.y,
          originX: obj.originX,
          originY: obj.originY,
          width: obj.width,
          height: obj.height,
          fontSize: obj.style?.fontSize,
          wordWrapWidth: obj.style?.wordWrapWidth || null,
        });
      }
    });
    return texts;
  });
}

/** EndlessMapSelectScene 내 카드 텍스트 객체 추출 */
async function getEndlessTextObjects(page) {
  return await page.evaluate(() => {
    const scene = window.__game.scene.getScene('EndlessMapSelectScene');
    if (!scene) return null;
    const texts = [];
    scene.children.list.forEach(obj => {
      if (obj.type === 'Text') {
        texts.push({
          text: obj.text,
          x: obj.x,
          y: obj.y,
          originX: obj.originX,
          originY: obj.originY,
          width: obj.width,
          height: obj.height,
          fontSize: obj.style?.fontSize,
          wordWrapWidth: obj.style?.wordWrapWidth || null,
        });
      }
    });
    return texts;
  });
}

// ── 상수 ──────────────────────────────────────────────────────────
const GAME_WIDTH = 360;
const CENTER_X = GAME_WIDTH / 2; // 180
const CARD_W = 320;
const EXPECTED_CARD_LEFT = CENTER_X - CARD_W / 2 + 35;  // 55
const EXPECTED_CARD_RIGHT = CENTER_X + CARD_W / 2 - 35;  // 305

// 기둥 장식 화면 좌표 (이미지 왼쪽 엣지 = 180 - 160 = 20)
const LEFT_PILLAR_END = 51;   // 왼쪽 기둥 끝
const RIGHT_PILLAR_START = 316; // 오른쪽 기둥 시작

// ── Tests ──────────────────────────────────────────────────────────

test.describe('LevelSelectScene 텍스트 오버플로 수정 검증', () => {

  test.describe('정상 동작 - 좌표 검증', () => {

    test('AC1: 해금 카드 - 맵 번호/이름이 좌측 기둥 안쪽에 위치한다', async ({ page }) => {
      await enterLevelSelectScene(page);
      const texts = await getLevelSelectTextObjects(page);
      expect(texts).not.toBeNull();

      // 맵 번호 "1" - 첫 번째 카드 (해금)
      const mapNumber = texts.find(t => t.text === '1' && t.fontSize === '22px');
      expect(mapNumber).toBeDefined();
      expect(mapNumber.x).toBeGreaterThanOrEqual(LEFT_PILLAR_END);
      expect(mapNumber.x).toBe(EXPECTED_CARD_LEFT);

      // 맵 이름 - origin(0,0)이므로 x가 텍스트 시작점
      const mapNames = texts.filter(t => t.fontSize === '14px' && t.originX === 0 && t.x === EXPECTED_CARD_LEFT);
      expect(mapNames.length).toBeGreaterThan(0);
      for (const name of mapNames) {
        expect(name.x).toBeGreaterThanOrEqual(LEFT_PILLAR_END);
      }
    });

    test('AC2: 잠금 카드 - 맵 번호/이름이 좌측 기둥 안쪽에 위치한다', async ({ page }) => {
      await enterLevelSelectScene(page);
      const texts = await getLevelSelectTextObjects(page);
      expect(texts).not.toBeNull();

      // 잠금 카드의 맵 번호 (color: #333340)
      const lockedNumbers = texts.filter(t => t.fontSize === '22px' && t.x === EXPECTED_CARD_LEFT);
      // 첫 번째 맵은 해금, 2번부터 잠금 (saveData가 비어있으므로)
      // 최소 5개의 잠금 카드가 있어야 함 (6개 중 1개만 해금)
      expect(lockedNumbers.length).toBeGreaterThanOrEqual(1);
      for (const num of lockedNumbers) {
        expect(num.x).toBeGreaterThanOrEqual(LEFT_PILLAR_END);
      }
    });

    test('AC3: 해금 카드 - 설명 텍스트에 wordWrap이 적용되었다', async ({ page }) => {
      await enterLevelSelectScene(page);
      const texts = await getLevelSelectTextObjects(page);
      expect(texts).not.toBeNull();

      // 설명 텍스트 (11px, origin 0,0)
      const descTexts = texts.filter(t => t.fontSize === '11px' && t.originX === 0 && t.x === EXPECTED_CARD_LEFT);
      expect(descTexts.length).toBeGreaterThan(0);

      for (const desc of descTexts) {
        // wordWrap 적용 여부 확인
        expect(desc.wordWrapWidth).toBe(160);
        // 텍스트 렌더 너비가 160px 이하인지 확인
        expect(desc.width).toBeLessThanOrEqual(165); // 약간의 렌더링 오차 허용
      }
    });

    test('AC4: 해금 카드 - 설명 텍스트가 카드 내부에 수용된다', async ({ page }) => {
      await enterLevelSelectScene(page);
      const texts = await getLevelSelectTextObjects(page);

      const descTexts = texts.filter(t => t.fontSize === '11px' && t.originX === 0 && t.x === EXPECTED_CARD_LEFT);
      for (const desc of descTexts) {
        // 텍스트 오른쪽 끝이 오른쪽 기둥 시작보다 왼쪽이어야 함
        const textRightEdge = desc.x + desc.width;
        expect(textRightEdge).toBeLessThan(RIGHT_PILLAR_START);
      }
    });

    test('AC5: 우측 요소(별점, Wave, START)가 우측 기둥 안쪽에 위치한다', async ({ page }) => {
      await enterLevelSelectScene(page);
      const texts = await getLevelSelectTextObjects(page);

      // Wave 텍스트 (11px, origin(1,0) - 우측 정렬)
      const waveTexts = texts.filter(t => t.text && t.text.startsWith('Wave:'));
      for (const wave of waveTexts) {
        // origin(1,0)이므로 x가 텍스트 오른쪽 끝
        expect(wave.x).toBeLessThan(RIGHT_PILLAR_START);
        expect(wave.x).toBe(EXPECTED_CARD_RIGHT);
      }

      // START 버튼 텍스트 (origin 0.5)
      const startBtns = texts.filter(t => t.text === 'START' || t.text === '시작');
      for (const btn of startBtns) {
        // 버튼 센터 + 반폭이 기둥 시작보다 작아야 함
        const btnRightEdge = btn.x + btn.width / 2;
        expect(btnRightEdge).toBeLessThan(RIGHT_PILLAR_START);
      }
    });
  });

  test.describe('시각적 검증', () => {

    test('해금 카드 전체 화면 스크린샷', async ({ page }) => {
      await enterLevelSelectScene(page);
      await page.screenshot({
        path: 'tests/screenshots/level-select-forest-overview.png',
      });
    });

    test('엔드리스 클래식 카드 스크린샷', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      await page.screenshot({
        path: 'tests/screenshots/endless-classic-card.png',
      });
    });

    test('엔드리스 월드(forest) 카드 스크린샷', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      // forest 탭 클릭 (F 버튼)
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('EndlessMapSelectScene');
        if (scene && scene._tabElements) {
          // index 1 = forest tab
          scene._tabElements[1].bg.emit('pointerdown');
        }
      });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: 'tests/screenshots/endless-forest-cards.png',
      });
    });
  });

  test.describe('예외 및 엣지케이스', () => {

    test('콘솔 에러가 발생하지 않는다 (LevelSelectScene)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await enterLevelSelectScene(page);
      expect(errors).toEqual([]);
    });

    test('콘솔 에러가 발생하지 않는다 (EndlessMapSelectScene)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await enterEndlessMapSelectScene(page);
      // 모든 탭을 순회
      const tabIds = ['classic', 'forest', 'desert', 'tundra', 'volcano', 'shadow'];
      for (let i = 0; i < tabIds.length; i++) {
        await page.evaluate((idx) => {
          const scene = window.__game.scene.getScene('EndlessMapSelectScene');
          if (scene && scene._tabElements && scene._tabElements[idx]) {
            scene._tabElements[idx].bg.emit('pointerdown');
          }
        }, i);
        await page.waitForTimeout(500);
      }
      expect(errors).toEqual([]);
    });

    test('모든 월드에서 텍스트 좌표가 올바르다 (forest/desert/tundra/volcano/shadow)', async ({ page }) => {
      const worlds = ['forest', 'desert', 'tundra', 'volcano', 'shadow'];
      for (const worldId of worlds) {
        await waitForGame(page);
        await page.evaluate((wId) => {
          const g = window.__game;
          const activeScenes = g.scene.getScenes(true);
          if (activeScenes.length > 0) {
            activeScenes[0].scene.start('LevelSelectScene', { worldId: wId });
          }
        }, worldId);
        await waitForScene(page, 'LevelSelectScene');

        const texts = await getLevelSelectTextObjects(page);
        expect(texts).not.toBeNull();

        // 해금 카드 (첫 번째 맵) 맵 번호
        const mapNumber1 = texts.find(t => t.text === '1' && t.fontSize === '22px');
        expect(mapNumber1).toBeDefined();
        expect(mapNumber1.x).toBe(EXPECTED_CARD_LEFT);
      }
    });

    test('가장 긴 설명 텍스트가 카드 내에 수용된다', async ({ page }) => {
      // forest 월드 m2가 가장 긴 설명: "구불구불한 오솔길이 깊은 숲으로 이어진다."
      await enterLevelSelectScene(page, 'forest');

      // 모든 맵을 해금 상태로 설정하여 모든 설명이 표시되도록 함
      await page.evaluate(() => {
        const g = window.__game;
        const sd = g.registry.get('saveData') || {};
        if (!sd.worldProgress) sd.worldProgress = {};
        // forest 맵 전부 별 3개로 설정
        ['f1_m1', 'f1_m2', 'f1_m3', 'f1_m4', 'f1_m5', 'f1_m6'].forEach(id => {
          sd.worldProgress[id] = { stars: 3 };
        });
        g.registry.set('saveData', sd);
        const activeScenes = g.scene.getScenes(true);
        if (activeScenes.length > 0) {
          activeScenes[0].scene.start('LevelSelectScene', { worldId: 'forest' });
        }
      });
      await waitForScene(page, 'LevelSelectScene');

      const texts = await getLevelSelectTextObjects(page);
      const descTexts = texts.filter(t => t.fontSize === '11px' && t.originX === 0 && t.x === EXPECTED_CARD_LEFT);

      // 모든 해금 카드의 설명이 표시되어야 함 (6개)
      expect(descTexts.length).toBe(6);

      for (const desc of descTexts) {
        // 텍스트 오른쪽 끝이 기둥 안쪽
        const rightEdge = desc.x + desc.width;
        expect(rightEdge).toBeLessThan(RIGHT_PILLAR_START);
        // 텍스트 높이가 카드 높이(86)의 하단 여백(28px) 안에 수용
        expect(desc.height).toBeLessThanOrEqual(30); // 2줄이면 약 22~24px
      }

      await page.screenshot({
        path: 'tests/screenshots/level-select-all-unlocked.png',
      });
    });

    test('가장 짧은 맵 이름도 정상 표시된다', async ({ page }) => {
      // 가장 짧은 이름: "숲 입구" (3자), "깊은 숲" (3자)
      await enterLevelSelectScene(page, 'forest');
      const texts = await getLevelSelectTextObjects(page);
      const nameTexts = texts.filter(t => t.fontSize === '14px' && t.originX === 0 && t.x === EXPECTED_CARD_LEFT);
      expect(nameTexts.length).toBeGreaterThan(0);
      // 이름이 비어있지 않아야 함
      for (const name of nameTexts) {
        expect(name.text.length).toBeGreaterThan(0);
        expect(name.width).toBeGreaterThan(0);
      }
    });

    test('폴백(Rectangle 배경) 모드에서도 텍스트 위치가 동일하다', async ({ page }) => {
      // panel_level_card 텍스처를 제거하여 Rectangle 폴백 모드로 전환
      await waitForGame(page);
      await page.evaluate(() => {
        const g = window.__game;
        // 텍스처를 제거하여 폴백 모드 강제
        if (g.textures.exists('panel_level_card')) {
          g.textures.remove('panel_level_card');
        }
        const activeScenes = g.scene.getScenes(true);
        if (activeScenes.length > 0) {
          activeScenes[0].scene.start('LevelSelectScene', { worldId: 'forest' });
        }
      });
      await waitForScene(page, 'LevelSelectScene');

      const texts = await getLevelSelectTextObjects(page);
      expect(texts).not.toBeNull();

      // 맵 번호가 여전히 cardLeft(55)에 위치해야 함
      const mapNumber = texts.find(t => t.text === '1' && t.fontSize === '22px');
      expect(mapNumber).toBeDefined();
      expect(mapNumber.x).toBe(EXPECTED_CARD_LEFT);

      await page.screenshot({
        path: 'tests/screenshots/level-select-rectangle-fallback.png',
      });
    });
  });
});

test.describe('EndlessMapSelectScene 텍스트 오버플로 수정 검증', () => {

  test.describe('정상 동작 - 좌표 검증', () => {

    test('AC6: 클래식 카드 - 맵 이름/설명이 기둥 안쪽에 위치한다', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      const texts = await getEndlessTextObjects(page);
      expect(texts).not.toBeNull();

      // 클래식 맵 이름 (16px, origin(0,0))
      const classicName = texts.find(t => t.fontSize === '16px' && t.originX === 0);
      expect(classicName).toBeDefined();
      expect(classicName.x).toBe(EXPECTED_CARD_LEFT);
      expect(classicName.x).toBeGreaterThanOrEqual(LEFT_PILLAR_END);

      // 클래식 맵 설명 (12px, origin(0,0))
      const classicDesc = texts.find(t => t.fontSize === '12px' && t.originX === 0);
      expect(classicDesc).toBeDefined();
      expect(classicDesc.x).toBe(EXPECTED_CARD_LEFT);
      expect(classicDesc.wordWrapWidth).toBe(160);
    });

    test('AC7: 월드 맵 카드 - 패딩과 wordWrap이 올바르다', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      // forest 탭으로 전환
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('EndlessMapSelectScene');
        if (scene) {
          scene._activeTab = 'forest';
          scene._updateTabStyles();
          scene._renderCards(180);
        }
      });
      await page.waitForTimeout(800);

      const texts = await getEndlessTextObjects(page);
      expect(texts).not.toBeNull();

      // 맵 번호 (20px, origin(0,0))
      const mapNums = texts.filter(t => t.fontSize === '20px' && t.originX === 0);
      expect(mapNums.length).toBe(6);
      for (const num of mapNums) {
        expect(num.x).toBe(EXPECTED_CARD_LEFT);
      }

      // 맵 이름 (13px, origin(0,0))
      const mapNames = texts.filter(t => t.fontSize === '13px' && t.originX === 0);
      expect(mapNames.length).toBe(6);
      for (const name of mapNames) {
        expect(name.x).toBe(EXPECTED_CARD_LEFT);
      }

      // 설명 텍스트 (10px, origin(0,0))
      const descs = texts.filter(t => t.fontSize === '10px' && t.originX === 0);
      expect(descs.length).toBe(6);
      for (const desc of descs) {
        expect(desc.x).toBe(EXPECTED_CARD_LEFT);
        expect(desc.wordWrapWidth).toBe(160);
        // 텍스트 우측 끝이 기둥 안쪽
        const rightEdge = desc.x + desc.width;
        expect(rightEdge).toBeLessThan(RIGHT_PILLAR_START);
      }
    });

    test('AC7: 월드 카드 우측 요소가 기둥 안쪽이다', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('EndlessMapSelectScene');
        if (scene) {
          scene._activeTab = 'forest';
          scene._updateTabStyles();
          scene._renderCards(180);
        }
      });
      await page.waitForTimeout(800);

      const texts = await getEndlessTextObjects(page);

      // Wave 텍스트 (11px, origin(1,0))
      const waveTexts = texts.filter(t => t.text && t.text.startsWith('Wave:') && t.fontSize === '11px');
      expect(waveTexts.length).toBe(6);
      for (const wave of waveTexts) {
        expect(wave.x).toBe(EXPECTED_CARD_RIGHT);
        expect(wave.x).toBeLessThan(RIGHT_PILLAR_START);
      }

      // START 버튼 텍스트
      const startBtns = texts.filter(t => t.text === 'START' || t.text === '시작');
      for (const btn of startBtns) {
        const btnRightEdge = btn.x + btn.width / 2;
        expect(btnRightEdge).toBeLessThan(RIGHT_PILLAR_START);
      }
    });
  });

  test.describe('예외 및 엣지케이스', () => {

    test('모든 엔드리스 월드 탭에서 좌표가 올바르다', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      const tabIds = ['forest', 'desert', 'tundra', 'volcano', 'shadow'];

      for (let i = 0; i < tabIds.length; i++) {
        await page.evaluate((idx) => {
          const scene = window.__game.scene.getScene('EndlessMapSelectScene');
          if (scene && scene._tabElements) {
            scene._tabElements[idx + 1].bg.emit('pointerdown'); // +1 because classic is index 0
          }
        }, i);
        await page.waitForTimeout(500);

        const texts = await getEndlessTextObjects(page);

        // 맵 번호 (20px)
        const mapNums = texts.filter(t => t.fontSize === '20px' && t.originX === 0);
        expect(mapNums.length).toBe(6);
        for (const num of mapNums) {
          expect(num.x).toBe(EXPECTED_CARD_LEFT);
        }
      }
    });

    test('엔드리스 탭 빠른 전환 시 에러 없음', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await enterEndlessMapSelectScene(page);

      // 빠른 연속 탭 전환 (50ms 간격)
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 6; i++) {
          await page.evaluate((idx) => {
            const scene = window.__game.scene.getScene('EndlessMapSelectScene');
            if (scene && scene._tabElements) {
              scene._tabElements[idx].bg.emit('pointerdown');
            }
          }, i);
          await page.waitForTimeout(50);
        }
      }

      expect(errors).toEqual([]);
    });

    test('엔드리스 월드 카드 설명 2줄 표시 시 카드 하단을 벗어나지 않는다', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('EndlessMapSelectScene');
        if (scene) {
          scene._activeTab = 'forest';
          scene._updateTabStyles();
          scene._renderCards(180);
        }
      });
      await page.waitForTimeout(800);

      // 카드 높이 76px에서 설명 텍스트 위치 확인
      const cardInfo = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('EndlessMapSelectScene');
        if (!scene) return null;
        const results = [];
        const cardH = 76;
        const startY = 100;
        const gap = 5;

        scene.children.list.forEach(obj => {
          if (obj.type === 'Text' && obj.style?.fontSize === '10px' && obj.originX === 0) {
            // 이 텍스트의 y와 height로 카드 하단 초과 여부 계산
            const textBottom = obj.y + obj.height;
            // 해당 카드의 cardY 추정 (가장 가까운 카드 중심)
            results.push({
              text: obj.text.substring(0, 20),
              y: obj.y,
              height: obj.height,
              textBottom,
            });
          }
        });
        return results;
      });

      expect(cardInfo).not.toBeNull();
      // 각 설명 텍스트의 하단이 카드 하단보다 위에 있어야 함
      const cardH = 76;
      const startY = 100;
      const gap = 5;
      for (let i = 0; i < cardInfo.length; i++) {
        const cardY = startY + i * (cardH + gap) + cardH / 2;
        const cardBottom = cardY + cardH / 2;
        expect(cardInfo[i].textBottom).toBeLessThanOrEqual(cardBottom + 2); // 2px 여유
      }
    });

    test('엔드리스 전체 탭 스크린샷 (시각적 검증)', async ({ page }) => {
      await enterEndlessMapSelectScene(page);
      const tabLabels = ['classic', 'forest', 'desert', 'tundra', 'volcano', 'shadow'];

      for (let i = 0; i < tabLabels.length; i++) {
        await page.evaluate((idx) => {
          const scene = window.__game.scene.getScene('EndlessMapSelectScene');
          if (scene && scene._tabElements) {
            scene._tabElements[idx].bg.emit('pointerdown');
          }
        }, i);
        await page.waitForTimeout(600);
        await page.screenshot({
          path: `tests/screenshots/endless-tab-${tabLabels[i]}.png`,
        });
      }
    });
  });
});

test.describe('정적 분석 기반 검증', () => {

  test('cardLeft 계산값이 기둥 끝(51)보다 크다', async ({ page }) => {
    // centerX=180, cardW=320, padding=35
    // cardLeft = 180 - 160 + 35 = 55
    expect(EXPECTED_CARD_LEFT).toBe(55);
    expect(EXPECTED_CARD_LEFT).toBeGreaterThan(LEFT_PILLAR_END);
  });

  test('cardRight 계산값이 기둥 시작(316)보다 작다', async ({ page }) => {
    // cardRight = 180 + 160 - 35 = 305
    expect(EXPECTED_CARD_RIGHT).toBe(305);
    expect(EXPECTED_CARD_RIGHT).toBeLessThan(RIGHT_PILLAR_START);
  });

  test('wordWrap 160px + cardLeft 55px = 215px, START 버튼 왼쪽(225) 안쪽', async ({ page }) => {
    const wrapEnd = EXPECTED_CARD_LEFT + 160; // 55 + 160 = 215
    const btnLeftEdge = EXPECTED_CARD_RIGHT - 80; // 305 - 80 = 225 (LevelSelect btnW)
    expect(wrapEnd).toBeLessThan(btnLeftEdge);
  });
});
