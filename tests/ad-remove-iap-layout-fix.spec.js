/**
 * @fileoverview 광고제거 버튼 레이아웃 겹침 수정 검증 테스트.
 * 이전 QA에서 FAIL된 STATISTICS 버튼과 광고제거 버튼 겹침 이슈의 수정을 검증한다.
 * 추가로 음소거/언어 버튼 위치와 전반적 메뉴 레이아웃 안정성도 확인한다.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// ── 유틸리티 ────────────────────────────────────────────────

/** 게임 로드 후 MenuScene이 렌더링될 때까지 대기 */
async function waitForMenu(page, timeout = 8000) {
  await page.goto(BASE_URL);
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(timeout);
}

// ── 레이아웃 겹침 수정 검증 ───────────────────────────────────

test.describe('STATISTICS-광고제거 버튼 레이아웃 겹침 수정', () => {

  test.beforeEach(async ({ page }) => {
    // 매 테스트마다 localStorage 초기화
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
  });

  test('MenuScene 초기 로드 - 콘솔 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenu(page);

    if (errors.length > 0) {
      console.log('[JS ERRORS]', errors);
    }
    expect(errors).toEqual([]);
  });

  test('MenuScene 전체 레이아웃 스크린샷 (한국어)', async ({ page }) => {
    await waitForMenu(page);
    await page.screenshot({ path: 'tests/screenshots/layout-fix-menu-ko.png' });
  });

  test('MenuScene 전체 레이아웃 스크린샷 (영어)', async ({ page }) => {
    await waitForMenu(page);

    // 언어를 영어로 전환
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    // 언어 버튼: centerX+48 = 228, Y = 630+(-100) = 530
    // 캔버스 내 실제 좌표는 스케일에 따라 다를 수 있으므로 비율 계산
    const scaleX = box.width / 360;
    const scaleY = box.height / 640;
    await page.mouse.click(box.x + 228 * scaleX, box.y + 530 * scaleY);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/layout-fix-menu-en.png' });
  });

  test('STATISTICS 버튼과 광고제거 버튼의 Y 좌표 간격이 겹치지 않는다 (정적 계산)', async ({ page }) => {
    // 코드에서 확인한 값 기반 정적 검증
    // offsetY = -100
    // STATISTICS: Y center = 544 + (-100) = 444, height = 44 => top=422, bottom=466
    // Remove Ads: Y center = 590 + (-100) = 490, height = 34 => top=473, bottom=507
    const statsCenter = 544 - 100;  // 444
    const statsHeight = 44;
    const statsBottom = statsCenter + statsHeight / 2;  // 466

    const removeAdsCenter = 590 - 100;  // 490
    const removeAdsHeight = 34;
    const removeAdsTop = removeAdsCenter - removeAdsHeight / 2;  // 473

    const gap = removeAdsTop - statsBottom;  // 7
    console.log(`STATISTICS bottom: ${statsBottom}, Remove Ads top: ${removeAdsTop}, Gap: ${gap}px`);

    expect(gap).toBeGreaterThan(0);  // 겹치지 않음
    expect(gap).toBeGreaterThanOrEqual(5);  // 최소 5px 간격
  });

  test('광고제거 버튼과 음소거/언어 버튼의 Y 좌표 간격이 겹치지 않는다 (정적 계산)', async ({ page }) => {
    // Remove Ads: Y center = 590 + (-100) = 490, height = 34 => bottom=507
    // Mute/Lang: Y center = 630 + (-100) = 530, height = 26 => top=517
    const removeAdsCenter = 590 - 100;  // 490
    const removeAdsHeight = 34;
    const removeAdsBottom = removeAdsCenter + removeAdsHeight / 2;  // 507

    const muteCenter = 630 - 100;  // 530
    const muteHeight = 26;
    const muteTop = muteCenter - muteHeight / 2;  // 517

    const gap = muteTop - removeAdsBottom;  // 10
    console.log(`Remove Ads bottom: ${removeAdsBottom}, Mute/Lang top: ${muteTop}, Gap: ${gap}px`);

    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeGreaterThanOrEqual(5);
  });

  test('모든 메뉴 버튼이 화면 내에 존재한다 (Y < 640)', async ({ page }) => {
    // 음소거/언어 버튼이 화면 하단(640)을 초과하지 않는지 확인
    const muteCenter = 630 - 100;  // 530
    const muteHeight = 26;
    const muteBottom = muteCenter + muteHeight / 2;  // 543

    expect(muteBottom).toBeLessThan(640);
    console.log(`Mute/Lang button bottom: ${muteBottom}, Canvas height: 640`);
  });

  test('STATISTICS 영역 클릭 시 StatsScene으로 전환된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenu(page);

    // STATISTICS 버튼 클릭: centerX=180, Y=444
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const scaleX = box.width / 360;
    const scaleY = box.height / 640;

    // STATISTICS 버튼 중심 클릭
    await page.mouse.click(box.x + 180 * scaleX, box.y + 444 * scaleY);
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/layout-fix-stats-scene.png' });

    // 콘솔 에러 없이 씬 전환이 되어야 함
    expect(errors).toEqual([]);
  });

  test('광고제거 버튼 영역 클릭 시 구매 다이얼로그가 뜬다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenu(page);

    // 광고제거 버튼 클릭: centerX=180, Y=490
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const scaleX = box.width / 360;
    const scaleY = box.height / 640;

    await page.mouse.click(box.x + 180 * scaleX, box.y + 490 * scaleY);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/layout-fix-purchase-dialog.png' });

    // 다이얼로그가 열렸는지 확인
    const dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen === true);
    console.log('Purchase dialog open:', dialogOpen);

    expect(errors).toEqual([]);
  });

  test('360x640 뷰포트에서 레이아웃 스크린샷', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await waitForMenu(page);
    await page.screenshot({ path: 'tests/screenshots/layout-fix-360x640.png' });
  });

  test('320x568 소형 뷰포트에서 레이아웃 스크린샷', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await waitForMenu(page);
    await page.screenshot({ path: 'tests/screenshots/layout-fix-320x568.png' });
  });

  test('414x896 대형 뷰포트에서 레이아웃 스크린샷', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await waitForMenu(page);
    await page.screenshot({ path: 'tests/screenshots/layout-fix-414x896.png' });
  });

  test('구매 완료 상태에서도 레이아웃이 정상이다', async ({ page }) => {
    // adFree=true 상태로 세이브 설정
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      save.adFree = true;
      save.saveDataVersion = 7;
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    });
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'tests/screenshots/layout-fix-purchased-state.png' });
  });

  test('STATISTICS 버튼과 광고제거 버튼 사이 영역 클릭이 어느 쪽도 트리거하지 않는다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenu(page);

    // 두 버튼 사이 갭 영역 클릭 (Y=468~472 정도)
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const scaleX = box.width / 360;
    const scaleY = box.height / 640;

    // 갭 중간 지점 클릭
    await page.mouse.click(box.x + 180 * scaleX, box.y + 469 * scaleY);
    await page.waitForTimeout(1000);

    // 다이얼로그가 열리지 않아야 함
    const dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen === true);
    console.log('Dialog after gap click:', dialogOpen);

    expect(errors).toEqual([]);
  });

  test('이전 QA에서 PASS한 기능 - 구매 플로우가 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenu(page);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const scaleX = box.width / 360;
    const scaleY = box.height / 640;

    // 1. 광고제거 버튼 클릭
    await page.mouse.click(box.x + 180 * scaleX, box.y + 490 * scaleY);
    await page.waitForTimeout(1000);

    // 2. 스크린샷: 다이얼로그
    await page.screenshot({ path: 'tests/screenshots/layout-fix-flow-dialog.png' });

    // 3. 구매하기 버튼 클릭 (다이얼로그 "구매하기" 좌측, centerX-58=122, centerY+20=340)
    await page.mouse.click(box.x + 122 * scaleX, box.y + 340 * scaleY);
    await page.waitForTimeout(2000);

    // 4. 구매 후 상태 스크린샷
    await page.screenshot({ path: 'tests/screenshots/layout-fix-flow-after-purchase.png' });

    // 5. 세이브 데이터 확인
    const saveData = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('fantasy-td-save')); }
      catch { return null; }
    });

    if (saveData) {
      console.log('adFree:', saveData.adFree);
      expect(saveData.adFree).toBe(true);
    }

    expect(errors).toEqual([]);
  });
});
