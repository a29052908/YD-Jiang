const { chromium } = require('playwright');
const fs = require('fs');

const CRM_DIR = '/home/user/YD-Jiang/CRM';
const BASE_URL = `file://${CRM_DIR}`;
const SCREENSHOT_DIR = '/tmp/claude-0/-home-user-YD-Jiang/2b21e91d-86bf-5996-8355-97052e740910/scratchpad/screenshots';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 開始簡化版 CRM 截圖流程...\n');

    // 1. 登入頁
    console.log('📍 1. 打開登入頁');
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true });
    console.log('✅ 已截圖: 01-login.png');

    // 2. 點擊 YD
    console.log('\n📍 2. 選擇 YD 身份');
    await page.click('button.identity-btn.yd');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-client-list.png`, fullPage: true });
    console.log('✅ 已截圖: 02-client-list.png (客戶清單)');

    // 3. 測試篩選
    console.log('\n📍 3. 測試篩選功能');
    await page.click('div.stat-chip[data-filter="簡報"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-client-list-filter.png`, fullPage: true });
    console.log('✅ 已截圖: 03-client-list-filter.png (篩選後清單)');

    // 4. 重置篩選
    await page.click('div.stat-chip[data-filter="all"]');
    await page.waitForTimeout(500);

    // 5. 新增客戶頁面
    console.log('\n📍 4. 打開新增客戶表單');
    await page.click('a.btn-new');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-input-form.png`, fullPage: true });
    console.log('✅ 已截圖: 04-input-form.png (新增客戶表單)');

    // 6. 編輯頁面 (crm-edit.html)
    console.log('\n📍 5. 打開編輯客戶頁面');
    await page.goto(`${BASE_URL}/crm-edit.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-edit-form.png`, fullPage: true });
    console.log('✅ 已截圖: 05-edit-form.png (編輯客戶表單)');

    // 7. 手機版 - 登入頁
    console.log('\n📍 6. 手機版 RWD 測試 - 登入頁');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-mobile-login.png`, fullPage: true });
    console.log('✅ 已截圖: 06-mobile-login.png (手機登入)');

    // 8. 手機版 - 客戶清單
    console.log('\n📍 7. 手機版 RWD 測試 - 客戶清單');
    await page.click('button.identity-btn.yd');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-mobile-list.png`, fullPage: true });
    console.log('✅ 已截圖: 07-mobile-list.png (手機清單)');

    // 9. 手機版 - 新增表單
    console.log('\n📍 8. 手機版 RWD 測試 - 新增表單');
    await page.click('a.btn-new');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-mobile-input.png`, fullPage: true });
    console.log('✅ 已截圖: 08-mobile-input.png (手機新增)');

    console.log('\n✅ 截圖流程完成！\n');
    console.log('📋 生成的截圖：');
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    files.forEach((f, i) => {
      const size = (fs.statSync(`${SCREENSHOT_DIR}/${f}`).size / 1024).toFixed(1);
      console.log(`  ${i + 1}. ${f} (${size} KB)`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
