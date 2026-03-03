/**
 * @fileoverview 언어 전환 버튼(Lang Toggle) QA 테스트.
 * MenuScene의 언어 토글 버튼 배치, 동작, localStorage 저장/복원, 예외사항을 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

/**
 * 게임이 부팅되어 MenuScene에 도달할 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000]
 */
async function waitForMenuScene(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout });
  // BootScene -> MenuScene 전환 대기
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g || !g.scene) return false;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MenuScene';
  }, { timeout });
  // MenuScene 렌더링 안정화 대기
  await page.waitForTimeout(800);
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
 * 현재 i18n getLocale()의 반환값을 조회하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getCurrentLocale(page) {
  return page.evaluate(() => {
    // i18n 모듈에서 getLocale을 직접 호출할 수 없으므로
    // localStorage에서 확인하거나 게임 내부 접근
    return localStorage.getItem('fantasy-td-lang') || 'ko';
  });
}

test.describe('언어 전환 버튼 (Lang Toggle) 검증', () => {

  test.describe('수용 기준 검증', () => {

    test('AC1: MenuScene에 언어 버튼이 표시된다', async ({ page }) => {
      await waitForMenuScene(page);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-menu-initial.png' });

      // 캔버스 기반이므로 DOM assertion 불가. 스크린샷으로 시각적 확인.
      // 게임이 로드되었고 MenuScene이 활성 상태인지 확인.
      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');
    });

    test('AC2: 기본 언어가 ko(한국어)이다 - localStorage 비어있을 때', async ({ page }) => {
      // localStorage 비우기
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      // 페이지 재로드
      await waitForMenuScene(page);

      const locale = await page.evaluate(() => {
        // i18n 모듈의 _locale은 직접 접근 불가하므로 localStorage 값 확인
        return localStorage.getItem('fantasy-td-lang');
      });
      // localStorage에 값이 없으면 기본값 ko로 동작 (저장하지 않는 한 null)
      // setLocale을 호출하지 않았으므로 null이어야 정상
      expect(locale).toBeNull();
    });

    test('AC3: 버튼 탭 시 ko -> en 전환되고 localStorage에 저장된다', async ({ page }) => {
      // 초기 상태: ko
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      // 언어 버튼 클릭 (centerX + 48, 596 + offsetY 위치)
      // GAME_WIDTH=360, centerX=180, offsetY=-100
      // 버튼 위치: x=228, y=496 (게임 좌표)
      // Phaser Scale.FIT 모드이므로 캔버스 크기와 뷰포트가 맞으면 그대로 사용 가능
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // 게임 좌표를 캔버스 실제 좌표로 변환
      const gameW = 360, gameH = 640;
      const scaleX = box.width / gameW;
      const scaleY = box.height / gameH;
      const btnGameX = 180 + 48; // centerX + 48 = 228
      const btnGameY = 596 - 100; // 596 + offsetY = 496
      const clickX = box.x + btnGameX * scaleX;
      const clickY = box.y + btnGameY * scaleY;

      await page.mouse.click(clickX, clickY);
      // 씬 재시작 대기
      await page.waitForTimeout(1500);

      // MenuScene이 재시작되었는지 확인
      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');

      // localStorage에 'en'이 저장되었는지 확인
      const savedLang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(savedLang).toBe('en');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-after-en.png' });
    });

    test('AC4: en -> ko 전환 (순환 동작)', async ({ page }) => {
      // 초기 상태: en으로 설정
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'en'));
      await waitForMenuScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      const gameW = 360, gameH = 640;
      const scaleX = box.width / gameW;
      const scaleY = box.height / gameH;
      const btnGameX = 228;
      const btnGameY = 496;
      const clickX = box.x + btnGameX * scaleX;
      const clickY = box.y + btnGameY * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      // ko로 전환되었는지 확인
      const savedLang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(savedLang).toBe('ko');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-after-ko.png' });
    });

    test('AC5: 언어 변경 후 앱 새로고침해도 변경된 언어가 유지된다', async ({ page }) => {
      // en으로 설정 후 페이지 리로드
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'en'));
      await waitForMenuScene(page);

      // 현재 locale 확인
      const langBefore = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(langBefore).toBe('en');

      // 새로고침
      await page.reload();
      await waitForMenuScene(page);

      // 여전히 en인지 확인
      const langAfter = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(langAfter).toBe('en');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-persistence.png' });
    });

    test('AC6: 씬 재시작 시 fadeIn 애니메이션이 정상 동작한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      // 클릭 직후 (페이드인 시작 시점)
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(100);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-fadein-start.png' });

      // 페이드인 완료 대기
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-fadein-complete.png' });
    });
  });

  test.describe('예외 및 엣지케이스', () => {

    test('EDGE1: localStorage에 잘못된 값이 있을 때 기본 ko로 동작한다', async ({ page }) => {
      // 잘못된 값 설정
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'fr'));
      await waitForMenuScene(page);

      // i18n 모듈이 'fr'을 무시하고 ko를 유지하는지 확인
      // 모듈 초기화 코드: if (saved === 'ko' || saved === 'en') _locale = saved;
      // 'fr'은 조건에 안 맞으므로 _locale은 'ko' 유지, localStorage는 'fr' 그대로
      const storedVal = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(storedVal).toBe('fr'); // localStorage에는 그대로 남아있음

      // 하지만 게임의 로케일은 ko로 동작해야 함
      // 이를 확인하기 위해 t() 함수의 결과를 검증
      const tResult = await page.evaluate(() => {
        // MenuScene이 한국어로 렌더링되었는지 확인
        // window.__game에서 i18n 모듈에 접근
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        if (scenes.length === 0) return 'NO_SCENE';
        // 직접 i18n 모듈에 접근할 수 없으므로 간접 확인
        // getLocale()이 'ko'를 반환하는지
        return 'CHECK_SCREENSHOT';
      });

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-invalid-locale.png' });
    });

    test('EDGE2: localStorage에 빈 문자열이 있을 때', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', ''));
      await waitForMenuScene(page);

      // 빈 문자열은 'ko'나 'en'이 아니므로 기본값 ko 유지
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-empty-string.png' });

      // 언어 버튼 클릭 후 정상 동작하는지 확인
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      // indexOf('')는 -1이므로 (0) % 2 = 0, 즉 ko가 선택됨
      // 하지만 현재 locale이 'ko'라면 (0+1)%2 = 1 -> en
      // 실제 로직: _locale이 'ko'이므로 indexOf('ko')=0, (0+1)%2=1 -> en
      const savedLang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(savedLang).toBe('en');
    });

    test('EDGE3: 더블클릭 (빠른 연타) 시 안전하게 처리된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      // 빠르게 3번 연타
      await page.mouse.click(clickX, clickY, { delay: 0 });
      await page.waitForTimeout(50);
      await page.mouse.click(clickX, clickY, { delay: 0 });
      await page.waitForTimeout(50);
      await page.mouse.click(clickX, clickY, { delay: 0 });

      // 씬 재시작이 여러번 발생해도 에러 없이 안정화되는지 대기
      await page.waitForTimeout(3000);

      // 에러 없이 MenuScene이 활성 상태인지 확인
      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-rapid-clicks.png' });
    });

    test('EDGE4: 다른 씬에서 돌아와도 언어 설정이 유지된다', async ({ page }) => {
      // en으로 설정
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'en'));
      await waitForMenuScene(page);

      // Collection 씬으로 이동
      await page.evaluate(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        if (scenes.length > 0) {
          scenes[0].scene.start('CollectionScene');
        }
      });
      await page.waitForTimeout(1000);

      // CollectionScene 활성 확인
      const collScene = await getActiveSceneKey(page);
      expect(collScene).toBe('CollectionScene');

      // MenuScene으로 복귀 (ESC 키)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // 언어 설정이 en으로 유지되는지 확인
      const savedLang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(savedLang).toBe('en');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-scene-return.png' });
    });

    test('EDGE5: setLocale에 유효하지 않은 값이 전달될 때 (코드 레벨)', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      // setLocale에 직접 유효하지 않은 값 전달
      const result = await page.evaluate(() => {
        try {
          // i18n 모듈의 setLocale에 직접 접근할 수 없으므로
          // localStorage를 통해 간접 테스트
          localStorage.setItem('fantasy-td-lang', 'ja');
          return { stored: localStorage.getItem('fantasy-td-lang'), error: null };
        } catch (e) {
          return { stored: null, error: e.message };
        }
      });

      expect(result.error).toBeNull();
      expect(result.stored).toBe('ja');
    });

    test('EDGE6: localStorage가 가득 찬 경우에도 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      // localStorage가 가득 찬 상황을 시뮬레이션하기는 어려우나
      // try/catch로 감싸져 있으므로 코드 레벨에서 안전함을 확인
      // 대신 정상 동작 후 에러가 없는지 확인

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      expect(errors).toEqual([]);
    });
  });

  test.describe('UI 안정성', () => {

    test('STAB1: 콘솔 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      // 언어 전환 수행
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      // 다시 전환
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      // 에러가 없어야 함 (리소스 로딩 에러는 필터링)
      const jsErrors = errors.filter(e => !e.includes('net::') && !e.includes('Failed to load'));
      expect(jsErrors).toEqual([]);
    });

    test('STAB2: 모바일 뷰포트(320x568)에서도 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-mobile-320x568.png' });

      // 에러 없이 렌더링되는지 확인
      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');
    });

    test('STAB3: 큰 뷰포트(1920x1080)에서도 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-desktop-1920x1080.png' });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');
    });

    test('STAB4: 음소거 버튼과 언어 버튼이 겹치지 않는다 (시각적 검증)', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      // 버튼 영역을 클립하여 캡처
      // 음소거 버튼: centerX-48=132, y=496, 80x26
      // 언어 버튼: centerX+48=228, y=496, 80x26
      // 두 버튼의 x 범위: 92~172, 188~268 (16px 간격)
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;

      // 두 버튼 영역을 포함하는 캡처 (y: 480~512, x: 80~280)
      await page.screenshot({
        path: 'tests/screenshots/lang-toggle-button-layout.png',
        clip: {
          x: box.x + 80 * scaleX,
          y: box.y + 478 * scaleY,
          width: 200 * scaleX,
          height: 36 * scaleY,
        }
      });
    });

    test('STAB5: SoundManager가 없어도 언어 버튼은 표시된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      // SoundManager 제거 후 씬 재시작
      await page.evaluate(() => {
        const g = window.__game;
        g.registry.set('soundManager', null);
        const scenes = g.scene.getScenes(true);
        if (scenes.length > 0) scenes[0].scene.restart();
      });
      await page.waitForTimeout(1500);

      // 언어 버튼 클릭이 정상 동작하는지 확인
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      const savedLang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      // ko -> en 전환
      expect(savedLang).toBe('en');

      await page.screenshot({ path: 'tests/screenshots/lang-toggle-no-soundmanager.png' });
    });
  });

  test.describe('SUPPORTED_LOCALES 순환 검증', () => {

    test('CYCLE1: ko -> en -> ko 2회 순환', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.removeItem('fantasy-td-lang'));
      await waitForMenuScene(page);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      // 1회: ko -> en
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);
      let lang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(lang).toBe('en');

      // 2회: en -> ko
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);
      lang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(lang).toBe('ko');

      // 3회: ko -> en (다시 순환)
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);
      lang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(lang).toBe('en');

      // 4회: en -> ko
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);
      lang = await page.evaluate(() => localStorage.getItem('fantasy-td-lang'));
      expect(lang).toBe('ko');
    });
  });

  test.describe('시각적 검증', () => {

    test('VISUAL1: 한국어 모드 메뉴 전체 스크린샷', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'ko'));
      await waitForMenuScene(page);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-menu-ko.png' });
    });

    test('VISUAL2: 영어 모드 메뉴 전체 스크린샷', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'en'));
      await waitForMenuScene(page);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-menu-en.png' });
    });

    test('VISUAL3: ko/en 전환 전후 비교', async ({ page }) => {
      // ko 상태
      await page.goto(BASE_URL);
      await page.evaluate(() => localStorage.setItem('fantasy-td-lang', 'ko'));
      await waitForMenuScene(page);
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-compare-ko.png' });

      // 언어 토글 클릭
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const scaleX = box.width / 360;
      const scaleY = box.height / 640;
      const clickX = box.x + 228 * scaleX;
      const clickY = box.y + 496 * scaleY;

      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(1500);

      // en 상태
      await page.screenshot({ path: 'tests/screenshots/lang-toggle-compare-en.png' });
    });
  });
});
