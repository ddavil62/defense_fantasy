/**
 * @fileoverview Galmuri 픽셀 폰트 적용 QA 테스트.
 * 폰트 파일 로드, @font-face 적용, 게임 정상 부팅을 검증한다.
 */
import { test, expect } from '@playwright/test';

test.describe('Galmuri 폰트 적용 검증', () => {

  // ── 정상 동작 ──

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const response = await page.goto('http://localhost:3456/', { waitUntil: 'load' });
    expect(response.status()).toBe(200);

    // 캔버스가 존재하는지 확인
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    expect(errors).toEqual([]);
  });

  test('폰트 파일 3개가 200 OK로 로드된다', async ({ page }) => {
    const fontRequests = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('Galmuri')) {
        fontRequests.push({
          url: url,
          status: response.status(),
          contentType: response.headers()['content-type'] || '',
        });
      }
    });

    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });

    // 3개의 폰트 파일이 모두 로드되어야 한다
    expect(fontRequests.length).toBeGreaterThanOrEqual(3);

    for (const req of fontRequests) {
      expect(req.status).toBe(200);
    }

    // 각 파일이 존재하는지 개별 확인
    const fontNames = ['Galmuri11.woff2', 'Galmuri11-Bold.woff2', 'Galmuri9.woff2'];
    for (const name of fontNames) {
      const found = fontRequests.some(r => r.url.includes(name));
      expect(found, `${name} should be loaded`).toBeTruthy();
    }
  });

  test('document.fonts에 Galmuri11 폰트가 등록되어 있다', async ({ page }) => {
    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });

    // 게임이 BootScene을 지나 MenuScene에서 텍스트를 렌더링할 때까지 대기
    await page.waitForTimeout(3000);

    // document.fonts.ready 가 resolve될 때까지 대기
    await page.evaluate(() => document.fonts.ready);

    // Galmuri11 폰트가 로드되었는지 확인
    const hasGalmuri11 = await page.evaluate(() => document.fonts.check('16px Galmuri11'));
    expect(hasGalmuri11, 'Galmuri11 Regular 폰트가 로드되어야 한다').toBeTruthy();

    const hasGalmuri11Bold = await page.evaluate(() => document.fonts.check('bold 16px Galmuri11'));
    expect(hasGalmuri11Bold, 'Galmuri11 Bold 폰트가 로드되어야 한다').toBeTruthy();

    // Galmuri9는 @font-face가 선언되어 있지만, 어떤 JS 파일에서도 참조하지 않으므로
    // 브라우저가 lazy loading으로 인해 실제 로드하지 않는다. 이는 스펙 의도대로 정상 동작이다.
    // (스펙: "Galmuri9는 현재 소형 텍스트에 별도 적용하지 않고... Galmuri11 단일 폰트로 전체 통일")
    const hasGalmuri9 = await page.evaluate(() => document.fonts.check('16px Galmuri9'));
    // Galmuri9 미사용으로 미로드는 정상 -- 경고만 출력
    if (!hasGalmuri9) {
      console.log('[INFO] Galmuri9 is declared but not loaded (unused font - expected)');
    }
  });

  test('BootScene에서 MenuScene으로 정상 전환된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    // 캔버스가 나타나고 게임이 부팅될 때까지 대기
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 폰트 로드 대기 후 MenuScene 전환이 완료되도록 추가 대기
    await page.waitForTimeout(3000);

    // 콘솔 에러 없음 확인
    expect(errors).toEqual([]);

    // 캔버스가 여전히 존재하는지 (크래시 없음)
    await expect(canvas).toBeVisible();
  });

  // ── 시각적 검증 ──

  test('메뉴 화면 스크린샷 캡처', async ({ page }) => {
    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // MenuScene 렌더링 대기
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: 'tests/screenshots/menu-screen-galmuri.png',
      fullPage: true,
    });
  });

  test('모바일 뷰포트(360x640)에서 정상 렌더링', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(4000);

    await page.screenshot({
      path: 'tests/screenshots/menu-screen-mobile-galmuri.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('넓은 뷰포트(1920x1080)에서 정상 렌더링', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(4000);

    await page.screenshot({
      path: 'tests/screenshots/menu-screen-desktop-galmuri.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  // ── 예외 및 엣지케이스 ──

  test('콘솔 에러가 발생하지 않는다 (전체 부팅 과정)', async ({ page }) => {
    const errors = [];
    const warnings = [];

    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // 폰트 관련 에러가 없어야 한다
    const fontErrors = errors.filter(e =>
      e.toLowerCase().includes('font') ||
      e.toLowerCase().includes('galmuri') ||
      e.toLowerCase().includes('woff')
    );
    expect(fontErrors, '폰트 관련 에러 없어야 한다').toEqual([]);

    // 전체 에러도 없어야 한다
    expect(errors, '콘솔 에러 없어야 한다').toEqual([]);
  });

  test('네트워크 요청에서 404 에러가 없다', async ({ page }) => {
    const failedRequests = [];

    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 404 에러 목록 출력 (디버깅용)
    if (failedRequests.length > 0) {
      console.log('Failed requests:', JSON.stringify(failedRequests, null, 2));
    }

    // 폰트 파일 관련 404가 없어야 한다
    const fontFailed = failedRequests.filter(r => r.url.includes('Galmuri') || r.url.includes('font'));
    expect(fontFailed, '폰트 파일 로드 실패가 없어야 한다').toEqual([]);
  });

  test('빠른 새로고침 시 폰트 로드가 깨지지 않는다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 빠르게 3번 새로고침
    await page.goto('http://localhost:3456/', { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 게임 부팅 + MenuScene 텍스트 렌더링까지 대기
    await page.waitForTimeout(4000);

    // 폰트가 여전히 로드 가능해야 한다
    await page.evaluate(() => document.fonts.ready);
    const hasGalmuri11 = await page.evaluate(() => document.fonts.check('16px Galmuri11'));
    expect(hasGalmuri11, '새로고침 후에도 Galmuri11이 로드되어야 한다').toBeTruthy();

    expect(errors).toEqual([]);
  });

  test('캔버스 크기가 뷰포트에 맞게 설정된다', async ({ page }) => {
    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const canvasSize = await canvas.boundingBox();
    expect(canvasSize).not.toBeNull();
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
  });

  // ── @font-face CSS 경로 검증 ──

  test('CSS @font-face가 올바르게 파싱된다', async ({ page }) => {
    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });

    // CSS 스타일시트에서 @font-face 규칙 확인
    const fontFaceRules = await page.evaluate(() => {
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSFontFaceRule) {
              rules.push({
                family: rule.style.fontFamily,
                src: rule.style.src,
                weight: rule.style.fontWeight,
              });
            }
          }
        } catch (e) {
          // 크로스 오리진 스타일시트 접근 불가
        }
      }
      return rules;
    });

    // 최소 3개의 @font-face가 있어야 한다
    expect(fontFaceRules.length).toBeGreaterThanOrEqual(3);

    // Galmuri11 Regular 확인
    const galmuri11Regular = fontFaceRules.find(r =>
      r.family.includes('Galmuri11') && (r.weight === 'normal' || r.weight === '400' || r.weight === '')
    );
    expect(galmuri11Regular, 'Galmuri11 Regular @font-face가 존재해야 한다').toBeTruthy();

    // Galmuri11 Bold 확인
    const galmuri11Bold = fontFaceRules.find(r =>
      r.family.includes('Galmuri11') && (r.weight === 'bold' || r.weight === '700')
    );
    expect(galmuri11Bold, 'Galmuri11 Bold @font-face가 존재해야 한다').toBeTruthy();

    // Galmuri9 확인
    const galmuri9 = fontFaceRules.find(r =>
      r.family.includes('Galmuri9')
    );
    expect(galmuri9, 'Galmuri9 @font-face가 존재해야 한다').toBeTruthy();
  });

  // ── preload 링크 검증 ──

  test('HTML preload 링크가 올바르게 존재한다', async ({ page }) => {
    await page.goto('http://localhost:3456/', { waitUntil: 'load' });

    const preloadLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('link[rel="preload"][as="font"]');
      return Array.from(links).map(l => ({
        href: l.getAttribute('href'),
        type: l.getAttribute('type'),
        crossorigin: l.hasAttribute('crossorigin'),
      }));
    });

    expect(preloadLinks.length).toBe(3);

    const fontNames = ['Galmuri11.woff2', 'Galmuri11-Bold.woff2', 'Galmuri9.woff2'];
    for (const name of fontNames) {
      const found = preloadLinks.some(l => l.href && l.href.includes(name));
      expect(found, `${name}에 대한 preload 링크가 있어야 한다`).toBeTruthy();
    }

    // 모두 woff2 타입이어야 한다
    for (const link of preloadLinks) {
      expect(link.type).toBe('font/woff2');
      expect(link.crossorigin).toBeTruthy();
    }
  });

});
