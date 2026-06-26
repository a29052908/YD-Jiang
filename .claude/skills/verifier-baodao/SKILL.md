---
description: Launch and drive 報刀_v2.html in a headless browser for verification or debugging
---

# Tandry 報刀 Verifier

This skill launches `報刀_v2.html` locally and drives it with Playwright for verification or debugging.

## Environment

- **Playwright**: `/opt/node22/lib/node_modules/playwright/index.mjs`
- **Chromium**: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
- **Local server**: Python HTTP server on port 8765 (start if not running)
- **Working directory**: `/home/user/YD-Jiang`

## Setup

### 1. Start HTTP server (if not already running)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8765/報刀_v2.html | grep -q 200 \
  || (cd /home/user/YD-Jiang && python3 -m http.server 8765 &>/tmp/httpserver.log & sleep 1)
```

### 2. Auth injection (always needed — page redirects to login.html without it)

In every `ctx.addInitScript()`, inject these localStorage keys:

```js
localStorage.setItem('tandry_token', 'fake-token');
localStorage.setItem('tandry_token_exp', String(Date.now() + 3600000));
localStorage.setItem('tandry_user', JSON.stringify({ displayName:'Ivan', role:'admin', email:'test@test.com' }));
localStorage.setItem('tandry_sales_current', 'Ivan');
localStorage.setItem('tandry_warehouse_current', '桃庫');
```

### 3. Playwright launch template

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // 手機尺寸
```

## Key Selectors

| 目標 | Selector |
|---|---|
| 醫院按鈕 | `.btn-option` |
| 部位按鈕 | `.buwei-btn` |
| V1 規格按鈕 | `[onclick*="setV1"]` |
| V2 規格按鈕 | `[onclick*="setV2"]` |
| V3 規格按鈕 | `[onclick*="setV3"]` |
| 加入產品 | `#addBtn` |
| 病人姓名 | `#patientInput` |
| 病歷號 | `#patientIdInput` |
| 預覽 Modal | `#previewModal` |
| 確認送出 | `#confirmBtn` |
| 圖片儲存 toggle | `#saveImgToggle` |
| toggle knob | `#saveImgKnob` |

## Driving the Full Report Flow

```js
// 選醫院
await page.locator('.btn-option', { hasText: '中天' }).first().click();

// 選部位
await page.locator('.buwei-btn', { hasText: 'VA小骨' }).first().click();

// 選 V1
await page.locator('[onclick*="setV1"]', { hasText: 'Volar [Narrow]' }).first().click();

// 選 V2（注意：值可能含單引號，用 onclick 屬性定位）
await page.locator('[onclick*="setV2"]').first().click();

// 選 V3
await page.locator('[onclick*="setV3"]', { hasText: '2H' }).first().click();

// 填病人資料並加入
await page.fill('#patientInput', '測試病人');
await page.fill('#patientIdInput', 'T123456');
await page.locator('#addBtn').click();

// 開啟預覽（繞過庫別確認）
await page.evaluate(() => { window._bypassWarehouseCheck = true; window.showPreview(); });
```

## Shortcut: Inject productItems Directly

For testing preview/submit without going through the spec picker:

```js
await page.evaluate(() => {
  window.productItems = [{
    buwei: 'VA小骨', spec: 'Volar [Narrow] / L\'t / 2H', 品號: '471502L-V00',
    qty: 1, innerCode: 'OS2P03', 大區: '桃竹苗', 負責業務: 'Ivan'
  }];
  window.selectedHospital = '中天';
  window._bypassWarehouseCheck = true;
  document.getElementById('patientInput').value = '測試病人';
  document.getElementById('patientIdInput').value = 'T123456';
  window.showPreview();
});
```

## Checking JS Errors

```js
page.on('console', m => { if (m.type() === 'error') console.log('JS ERROR:', m.text()); });
```

Ignore these known non-blocking errors:
- `ERR_CERT_AUTHORITY_INVALID` — 外部 CDN (zeabur.app) SSL in local env
- `404` on icon/manifest — GitHub Pages assets not served locally

## Common Checks

```js
// toggle 狀態
const toggleBg = await page.locator('#saveImgToggle').evaluate(el => el.style.background);
// green = rgb(76, 175, 80) = ON；grey = rgb(204, 204, 204) = OFF

// sel 狀態（規格選擇）
const sel = await page.evaluate(() => JSON.stringify(sel));

// localStorage
const val = await page.evaluate(() => localStorage.getItem('tandry_save_image'));

// addBtn 可見性（有選到品號才會顯示）
const addVisible = await page.locator('#addBtn').isVisible();
```

## Screenshot + SendUserFile

```js
await page.screenshot({ path: '/tmp/snap.png' });
// Then use SendUserFile tool to deliver /tmp/snap.png to the user
```
