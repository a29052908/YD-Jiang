const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 使用本地文件路径而不是 GitHub Pages URL
const CRM_DIR = '/home/user/YD-Jiang/CRM';
const BASE_URL = `file://${CRM_DIR}`;
const SCREENSHOT_DIR = '/tmp/claude-0/-home-user-YD-Jiang/2b21e91d-86bf-5996-8355-97052e740910/scratchpad/screenshots';

// 測試假客戶資料
const testClients = [
  {
    name: '測試客A',
    job: '科技業主管',
    location: '信義區',
    familiarity: 'A',
    income: 300,
    budget: 500,
    tools: '美股ETF',
    house: '有房貸',
    fundType: '流量',
    decisionStyle: '自決',
    stage: '簡報',
    painpoint: '子女教育金規劃、退休財務準備',
    myConfig: '60/40資產配置、3-5年規劃',
  },
  {
    name: '測試客B',
    job: '房地產投資者',
    location: '松山區',
    familiarity: 'B',
    income: 500,
    budget: 2000,
    tools: '房產、藝術品',
    house: '無房貸',
    fundType: '存量',
    decisionStyle: '謹慎型',
    stage: '跟進',
    painpoint: '資產配置多元化、稅務優化',
    myConfig: '全球資產配置、避稅規劃',
  },
  {
    name: '測試客C',
    job: '上班族',
    location: '南港',
    familiarity: 'C',
    income: 120,
    budget: 80,
    tools: '定存、基金',
    house: '租屋',
    fundType: '流量',
    decisionStyle: '拖延型',
    stage: '預約',
    painpoint: '投資入門、風險承受度評估',
    myConfig: '保守型配置、月投方案',
  },
  {
    name: '測試客D',
    job: '企業主',
    location: '內湖',
    familiarity: 'A',
    income: 800,
    budget: 3000,
    tools: '海外資產',
    house: '有房貸',
    fundType: '流量+存量',
    decisionStyle: '衝動型',
    stage: '成交',
    painpoint: '公司資金管理、家族信託',
    myConfig: '高淨值客戶專案',
  },
  {
    name: '測試客E',
    job: '自由工作者',
    location: '中山',
    familiarity: 'B',
    income: 180,
    budget: 60,
    tools: '虛擬貨幣',
    house: '租屋',
    fundType: '流量',
    decisionStyle: '需配偶',
    stage: '潛在',
    painpoint: '穩定收入規劃、夫妻理財協調',
    myConfig: '中保守型配置',
  },
];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 開始 CRM 截圖流程...');
    console.log(`📂 使用本地文件: ${CRM_DIR}`);

    // 1. 打開登入頁
    console.log('\n📍 步驟 1: 打開登入頁');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true });
    console.log('✅ 已截圖: 01-login.png');

    // 2. 點擊 YD 身份
    console.log('\n📍 步驟 2: 選擇 YD 身份');
    await page.click('button.identity-btn.yd');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);

    // 3. 截圖客戶總表 (初始狀態)
    console.log('📍 步驟 3: 截圖客戶清單 (初始狀態)');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-client-list.png`, fullPage: true });
    console.log('✅ 已截圖: 02-client-list.png');

    // 4. 新增測試客戶
    console.log('\n📍 步驟 4: 新增 5 筆測試客戶');
    for (let i = 0; i < testClients.length; i++) {
      const client = testClients[i];
      console.log(`  └─ 新增客戶 ${i + 1}/5: ${client.name}`);

      // 點擊新增按鈕
      await page.click('a.btn-new');
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});

      // 填寫表單
      await page.fill('#name', client.name);
      await page.fill('#job', client.job);
      await page.fill('#location', client.location);
      await page.click(`button[data-field="familiarity"][data-val="${client.familiarity}"]`);
      await page.fill('#income', client.income.toString());
      await page.fill('#budget', client.budget.toString());
      await page.fill('#tools', client.tools);
      await page.fill('#house', client.house);
      await page.click(`button[data-field="fundType"][data-val="${client.fundType}"]`);
      await page.click(`button[data-field="decisionStyle"][data-val="${client.decisionStyle}"]`);
      await page.click(`button[data-stage="${client.stage}"]`);

      // 設定日期
      const today = new Date().toISOString().split('T')[0];
      await page.fill('#stageStart', today);
      await page.fill('#lastContact', today);
      await page.fill('#painpoint', client.painpoint);
      await page.fill('#myConfig', client.myConfig);

      // 提交表單
      await page.click('button.btn-submit');
      await page.waitForTimeout(2000); // 等待提交完成

      // 返回列表
      if (i < testClients.length - 1) {
        await page.goto(`${BASE_URL}/crm-list.html`, { waitUntil: 'networkidle' });
      }
    }

    console.log('✅ 所有客戶已新增');

    // 5. 回到清單
    console.log('\n📍 步驟 5: 回到客戶清單');
    await page.goto(`${BASE_URL}/crm-list.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // 等待資料同步

    // 6. 截圖客戶清單
    console.log('📍 步驟 6: 截圖客戶清單 (含5筆客戶)');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-client-list-full.png`, fullPage: true });
    console.log('✅ 已截圖: 03-client-list-full.png');

    // 7. 測試篩選功能 - 按階段
    console.log('\n📍 步驟 7: 測試篩選功能 - "簡報" 階段');
    await page.click('div.stat-chip[data-filter="簡報"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-client-list-filter.png`, fullPage: true });
    console.log('✅ 已截圖: 04-client-list-filter.png');

    // 8. 重置篩選
    await page.click('div.stat-chip[data-filter="all"]');
    await page.waitForTimeout(500);

    // 9. 點開客戶詳情 (第一個客戶)
    console.log('\n📍 步驟 8: 打開單一客戶檔案');
    const firstCard = await page.locator('.client-card').first();
    await firstCard.click();
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);

    // 10. 截圖客戶詳情頁
    console.log('📍 步驟 9: 截圖客戶詳情頁');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-client-detail.png`, fullPage: true });
    console.log('✅ 已截圖: 05-client-detail.png');

    // 11. 測試編輯功能
    console.log('\n📍 步驟 10: 測試編輯功能');
    const editBtn = await page.locator('button:has-text("編輯")').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      await page.screenshot({ path: `${SCREENSHOT_DIR}/06-edit-form.png`, fullPage: true });
      console.log('✅ 已截圖: 06-edit-form.png');
    } else {
      console.log('⚠️  編輯功能尚未實裝');
    }

    // 12. 回到清單
    await page.goto(`${BASE_URL}/crm-list.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 13. 測試新增頁面
    console.log('\n📍 步驟 11: 截圖新增客戶表單');
    await page.click('a.btn-new');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-input-form.png`, fullPage: true });
    console.log('✅ 已截圖: 07-input-form.png');

    // 14. RWD 測試 - 手機版
    console.log('\n📍 步驟 12: 手機版 RWD 測試');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-mobile-login.png`, fullPage: true });
    console.log('✅ 已截圖: 08-mobile-login.png');

    // 點擊 YD
    await page.click('button.identity-btn.yd');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-mobile-list.png`, fullPage: true });
    console.log('✅ 已截圖: 09-mobile-list.png');

    // 點開第一個客戶
    const mobileCard = await page.locator('.client-card').first();
    await mobileCard.click();
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-mobile-detail.png`, fullPage: true });
    console.log('✅ 已截圖: 10-mobile-detail.png');

    console.log('\n✅ 截圖流程完成！');
    console.log(`📁 所有截圖已儲存至: ${SCREENSHOT_DIR}`);

    // 列出所有已生成的截圖
    const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    console.log('\n📋 生成的截圖列表:');
    screenshots.forEach((f, idx) => {
      const stats = fs.statSync(`${SCREENSHOT_DIR}/${f}`);
      const size = (stats.size / 1024).toFixed(1);
      console.log(`  ${idx + 1}. ${f} (${size} KB)`);
    });

    console.log('\n✅ 所有工作已完成！');

  } catch (error) {
    console.error('❌ 發生錯誤:', error.message);
    console.error('📍 錯誤詳情:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
