# 小崔幫手

女友藥局業務跑點打單用的工具。純 HTML/CSS/JS 單檔（`小崔幫手.html`），跟 repo 內其他頁面一樣可直接丟 GitHub Pages，不需要 build。

## 使用方式

1. 打開 `小崔幫手.html`（手機瀏覽器 or 電腦皆可，RWD）
2. **商品清單、客戶清單已經內建在檔案裡**（第一次打開就有 83 項商品、266 家有效客戶），不用匯入就能直接用
3. 右上角 ⚙️ 設定裡先填「員工代碼」
4. 選客戶 → 用「拍照辨識」或「按鈕下單」加品項 → 確認購物車（可直接改數量/單價）→ 「送出訂單」或「匯出 Excel」

資料存在瀏覽器 localStorage，換裝置/清瀏覽器資料要重新打開一次（會自動用內建清單重新種資料）。

## 資料更新方式

商品/客戶清單以後有異動，兩種方式擇一：
1. **設定裡「貼上匯入」**：從 Excel 複製整段表格貼上即可覆蓋目前資料（見下方格式）。
2. **改原始資料檔重新產生內建清單**：`data-products.tsv`、`data-customers.tsv` 是這份內建資料的原始檔（跟 Excel 一樣是 Tab 分隔），改完之後請回來讓我（或下一個 session）重新把它們包進 `小崔幫手.html` 裡的 `EMBEDDED_PRODUCTS_TSV`／`EMBEDDED_CUSTOMERS_TSV`。
3. 設定裡也有「還原出廠內建清單」按鈕，可以把資料還原成檔案內建的版本。

## 資料匯入格式

### 商品清單（貼上文字，Tab 分隔，含標題列）
```
產品大類	品名	存貨代碼	進價	卡多摩進價	定價	樣品價	國際條碼	保存期限	退換貨	註記
```

### 客戶清單（貼上文字，Tab 分隔，含標題列）
```
交易狀態	新客編	部門分類	開發者	區域	狀態	客戶名稱	藥局名稱(分店)	二&三聯發票	統編	發票抬頭	地址編號	出貨地	地址(郵遞區號)	電話	傳真	聯絡人	職稱
```
匯入時會自動略過「停止往來」「禁用」狀態的客戶。

### 匯出訂單欄位（Excel / 送出訂單 payload 共用）
```
員工代碼, 單據日期, 客戶代碼, 訂購人(客戶名稱), 收件人, 地址編號, 送貨地址, 收件人電話, 數量, 商品名稱, 存貨代碼, 進價, 訂單備註, 公定進價
```

## 需要在 n8n（https://ydj.zeabur.app）匯入的 workflow

兩支 workflow 已經寫好、可直接匯入 n8n，不用從零拉節點：

- [`n8n-workflow-ocr.json`](n8n-workflow-ocr.json) → `/webhook/pharma-ocr-order`
- [`n8n-workflow-submit-order.json`](n8n-workflow-submit-order.json) → `/webhook/pharma-submit-order`

**匯入步驟**：n8n 左上角 Workflows → Import from File，兩個檔案各匯入一次。匯入後兩支都還是「未啟用」狀態，且都有需要你手動接上的地方：

### 1. 拍照辨識（`n8n-workflow-ocr.json`）

流程：Webhook 收圖 → Code 節點把每張圖轉 base64 → HTTP Request 呼叫 Claude 視覺 API 辨識 → Code 節點合併多張結果 → 回傳給前端。

匯入後要做：
1. 打開「Claude 視覺辨識」這個 HTTP Request 節點，Credential 選「Header Auth」，新增一組：Header Name = `x-api-key`，Value = 你的 Anthropic API key（[console.anthropic.com](https://console.anthropic.com) 申請）
2. 存檔、右上角切到 Active
3. 前端設定裡的「拍照辨識 Webhook URL」填 `https://ydj.zeabur.app/webhook/pharma-ocr-order`

裡面的「拆出每張圖片並轉base64」Code 節點用的是 `$helpers.getBinaryDataBuffer(itemIndex, propertyName)`，如果你的 n8n 版本執行時報錯，改成 `this.helpers.getBinaryDataBuffer(...)` 試試（這支 API 不同版本寫法有差）。

- **回傳格式**：
```json
{
  "poNumber": "W202608160392",
  "items": [
    { "name": "4718287340707 小悠活兒童多醣體咀嚼錠", "qty": 2 }
  ]
}
```
前端拿到 `items` 後，會用商品名稱模糊比對本機已匯入的商品清單，選不到的會讓使用者手動下拉選擇。

### 2. 送出訂單（`n8n-workflow-submit-order.json`）

流程：Webhook 收訂單 JSON → Split Out 拆成一列一列 → 寫入 Google Sheets → 回傳成功筆數。

匯入後要做：
1. 打開「寫入 Google Sheets」節點，Credential 選你的 Google 帳號（沒有的話新增一組 Google Sheets OAuth2）
2. `Document ID` 欄位目前是 `REPLACE_WITH_YOUR_GOOGLE_SHEET_ID`，換成要寫入的 Google Sheet ID（建議另外開一份新的表，不要跟 CLAUDE.md 裡報刀系統那份共用）
3. `Sheet Name` 欄位目前是「訂單」，去那份 Google Sheet 建一個叫「訂單」的分頁，欄位順序照下面 14 欄
4. 存檔、切到 Active
5. 前端設定裡的「送出訂單 Webhook URL」填 `https://ydj.zeabur.app/webhook/pharma-submit-order`

- **前端送過來的格式**：
```json
{
  "rows": [
    {
      "員工代碼": "A115080301",
      "單據日期": "20260817",
      "客戶代碼": "C190402",
      "訂購人(客戶名稱)": "卡多摩Q002-林口仁愛二店",
      "收件人": "卡多摩Q002-林口仁愛二店",
      "地址編號": "190402Q002",
      "送貨地址": "244新北市林口區仁愛路二段249號",
      "收件人電話": "02-26089096",
      "數量": 2,
      "商品名稱": "小悠活多醣體咀嚼錠(30入/瓶)",
      "存貨代碼": "P4XDJ03001",
      "進價": 365,
      "訂單備註": "1.採購單號：W202608160392",
      "公定進價": 365
    }
  ]
}
```

### （選配，之後可做）自動同步商品/客戶清單
若不想每次改資料都手動貼，可以另外做 `GET /webhook/pharma-get-products`、`GET /webhook/pharma-get-customers` 讀 Google Sheets 回傳 JSON，前端改成開頁時自動打這兩支 API 覆蓋本機資料，取代目前「貼上匯入」的方式。目前先用貼上匯入版本，先讓工具能動起來。

## 已知限制 / 待確認的業務邏輯

- 送貨資訊（收件人/地址/電話）目前直接抓客戶清單那一列，沒有處理同一客戶多個聯絡人的情境。
- 有些商品清單row同一品項會自動搭配「贈品/小包裝」的 0 元品項（例如買 30入/瓶 同時搭 2入/包 贈品），這次沒有自動化這條規則，因為不確定觸發條件，需要的話用購物車手動加一行、把進價改 0 即可。
- 「進價」預設抓商品清單的「進價」欄位，可在購物車直接改（例如樣品/贈品出貨要改 0）。
