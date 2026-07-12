const { chromium } = require('playwright');
const fs = require('fs');

const CRM_DIR = '/home/user/YD-Jiang/CRM';
const BASE_URL = `file://${CRM_DIR}`;
const SCREENSHOT_DIR = '/tmp/claude-0/-home-user-YD-Jiang/2b21e91d-86bf-5996-8355-97052e740910/scratchpad/screenshots';

// 測試客戶資料
const mockClients = [
  {
    id: 1,
    姓名: '陳先生',
    職業: '科技業主管',
    居住地: '信義區',
    階段: '簡報',
    優先級: '高',
    最後聯繫日: '2026-07-10',
    跟進逾期天數: 2,
  },
  {
    id: 2,
    姓名: '王女士',
    職業: '房地產投資者',
    居住地: '松山區',
    階段: '跟進',
    優先級: '中',
    最後聯繫日: '2026-06-25',
    跟進逾期天數: 17,
  },
  {
    id: 3,
    姓名: '李先生',
    職業: '上班族',
    居住地: '南港',
    階段: '預約',
    優先級: '低',
    最後聯繫日: '2026-07-05',
    跟進逾期天數: 0,
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
    console.log('🚀 開始 CRM 截圖流程（含測試數據注入）...\n');

    // 1. 登入頁
    console.log('📍 1. 登入頁');
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true });
    console.log('✅ 已截圖: 01-login.png');

    // 2. 點擊 YD 並注入測試數據
    console.log('\n📍 2. 選擇 YD 身份並注入測試數據');
    await page.click('button.identity-btn.yd');
    await page.waitForTimeout(1000);

    // 在頁面中注入測試客戶數據到 localStorage
    await page.evaluate((clients) => {
      localStorage.setItem('crm_owner', 'YD');
      localStorage.setItem('crm_mode', 'test');
      // 模擬 API 回應
      window.mockClients = clients;
      window.clientsLoaded = true;
    }, mockClients);

    // 執行 JavaScript 來渲染客戶卡片
    await page.evaluate(() => {
      // 模擬清單渲染
      const grid = document.getElementById('clientGrid');
      if (grid && window.mockClients) {
        grid.innerHTML = '';
        window.mockClients.forEach(client => {
          const card = document.createElement('div');
          card.className = 'client-card ok';
          card.innerHTML = `
            <div class="card-top">
              <div>
                <div class="card-name">${client.姓名}</div>
                <div class="card-job">${client.職業}</div>
              </div>
              <div class="prob-badge prob-${client.優先級 || '未知'}">${client.優先級}</div>
            </div>
            <div class="card-tags">
              <span class="tag stage-${client.階段}">${client.階段}</span>
            </div>
            <div class="card-metrics">
              <div class="metric">
                <span class="metric-num">${client.跟進逾期天數 || 0}</span>
                <span class="metric-label">逾期天數</span>
              </div>
              <div class="metric">
                <span class="metric-num">3</span>
                <span class="metric-label">接觸次數</span>
              </div>
              <div class="metric">
                <span class="metric-num">85%</span>
                <span class="metric-label">成交機率</span>
              </div>
            </div>
            <div class="card-next">
              <strong>下次行動:</strong> 準備簡報資料
            </div>
          `;
          grid.appendChild(card);
        });
      }
      // 隱藏 loading 狀態
      const loading = document.getElementById('loadingState');
      if (loading) loading.style.display = 'none';
    });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-client-list.png`, fullPage: true });
    console.log('✅ 已截圖: 02-client-list.png (包含客戶數據)');

    // 3. 篩選功能
    console.log('\n📍 3. 篩選功能示範');
    await page.click('div.stat-chip[data-filter="簡報"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-client-list-filter.png`, fullPage: true });
    console.log('✅ 已截圖: 03-client-list-filter.png');

    // 重置
    await page.click('div.stat-chip[data-filter="all"]');
    await page.waitForTimeout(500);

    // 4. 新增客戶頁面
    console.log('\n📍 4. 新增客戶表單');
    await page.goto(`${BASE_URL}/crm-input.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-input-form.png`, fullPage: true });
    console.log('✅ 已截圖: 04-input-form.png');

    // 5. 編輯頁面
    console.log('\n📍 5. 編輯客戶表單');
    await page.goto(`${BASE_URL}/crm-edit.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-edit-form.png`, fullPage: true });
    console.log('✅ 已截圖: 05-edit-form.png');

    // 6. 手機版 - 登入
    console.log('\n📍 6. 手機版 RWD 測試 - 登入');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-mobile-login.png`, fullPage: true });
    console.log('✅ 已截圖: 06-mobile-login.png');

    // 7. 手機版 - 清單
    console.log('\n📍 7. 手機版 RWD 測試 - 客戶清單');
    await page.click('button.identity-btn.yd');
    await page.waitForTimeout(1000);

    // 再次注入測試數據
    await page.evaluate((clients) => {
      localStorage.setItem('crm_owner', 'YD');
      window.mockClients = clients;
    }, mockClients);

    await page.evaluate(() => {
      const grid = document.getElementById('clientGrid');
      if (grid && window.mockClients) {
        grid.innerHTML = '';
        window.mockClients.forEach(client => {
          const card = document.createElement('div');
          card.className = 'client-card ok';
          card.innerHTML = `
            <div class="card-top">
              <div>
                <div class="card-name">${client.姓名}</div>
                <div class="card-job">${client.職業}</div>
              </div>
              <div class="prob-badge prob-${client.優先級}">${client.優先級}</div>
            </div>
            <div class="card-tags">
              <span class="tag stage-${client.階段}">${client.階段}</span>
            </div>
            <div class="card-metrics">
              <div class="metric">
                <span class="metric-num">${client.跟進逾期天數 || 0}</span>
                <span class="metric-label">逾期天數</span>
              </div>
              <div class="metric">
                <span class="metric-num">3</span>
                <span class="metric-label">接觸次數</span>
              </div>
              <div class="metric">
                <span class="metric-num">85%</span>
                <span class="metric-label">成交機率</span>
              </div>
            </div>
          `;
          grid.appendChild(card);
        });
      }
      const loading = document.getElementById('loadingState');
      if (loading) loading.style.display = 'none';
    });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-mobile-list.png`, fullPage: true });
    console.log('✅ 已截圖: 07-mobile-list.png');

    // 8. 手機版 - 新增表單
    console.log('\n📍 8. 手機版 RWD 測試 - 新增表單');
    await page.goto(`${BASE_URL}/crm-input.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-mobile-input.png`, fullPage: true });
    console.log('✅ 已截圖: 08-mobile-input.png');

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
