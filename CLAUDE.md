# Tandry 報刀系統

## 技術架構
- 前端：純 HTML/CSS/JS，部署在 GitHub Pages
- 後端：n8n，部署在 https://ydj.zeabur.app
- 資料：Google Sheets（ID: 1z0UJIwXpV1yUTqbbovoH9pcqQNDLMxLIMNwI9h4B7D4）

## Project Skill
- `.claude/skills/verifier-baodao/` — Playwright headless 驗證腳本
  - 含 auth 注入、selector 速查、完整報刀流程驅動方式
  - 使用 `/verify` 或 `/run` 時自動套用此設定

## 頁面清單
- login.html：登入
- 報刀_v2.html：主要報刀頁面（v10+Baodao合併版）
- Baodao.html：舊版報刀頁面（仍在使用）
- dashboard.html：報刀總表
- track.html：案件追蹤（admin/manager）
- edit-request.html：變更申請
- review.html：審核變更
- pickup.html：抓貨管理（admin/manager）
- zheng-demo.html：正字記數參數調整 Demo（開發用）

## n8n Webhook
- /webhook/manual-baodao：報刀送出
- /webhook/login：登入
- /webhook/verify-token：Token驗證
- /webhook/get-cases：撈總表資料
- /webhook/submit-track：送出追蹤
- /webhook/get-tracks：撈追蹤清單
- /webhook/resolve-track：追蹤結案
- /webhook/submit-edit：送出變更申請
- /webhook/get-edit-requests：撈變更申請
- /webhook/review-edit：審核變更
- /webhook/get-pickup：撈抓貨清單
- /webhook/mark-picked：標記抓貨狀態

## Google Sheets 分頁
- 報刀單格式（gid=713793623）：主資料
- 變更申請表（gid=414619609）：變更申請
- 變更Log表（gid=237787039）：異動記錄
- 追蹤表（gid=1786361494）：案件追蹤

## 角色權限
- sales：業務，只看自己的資料
- manager：主管，看全部
- admin：內勤/管理員，看全部（目前 Ivan 是 admin）

## 流水號規則
格式：{業務代碼}{年後2碼}{月2碼}{日2碼}{序號2碼}
例：IV26050801
業務代碼：IV=Ivan, DI=Dino, HE=Henry, VI=Vincent, KA=Kaley, MA=Mandy, ED=Eddie, BR=Bruce

## 正字記數系統
### 報刀_v2.html（已完成）
- `renderZheng(n, color)` → HTML 正字符號（5的倍數=粗體「正」，1-4=SVG筆畫）
- `svgPartialZheng(strokes, color)` → SVG 局部正字，W=17 H=14 sw=4.5 viewBox="0 0 28 30"
- `_buildZhengHTML(boards, state)` → 釘盤正字 HTML（底色19%透明、br=7、×分隔、/組間）
- `buildScrewHTML()` / `buildDamageScrewHTML()` → 呼叫 _buildZhengHTML
- `toZheng(n)` → 純數字字串（給 n8n / Google Sheets 用）
- `_updateToolDisplay()` → 報損釘盤即時更新 toolDisplay div
- componentDisplay div（HTML顯示）+ componentInput textarea（隱藏，存純文字給n8n）
- toolDisplay div（HTML顯示）+ toolInput textarea（隱藏）
- **送出 payload**：組件用 `componentInput.value`，報損用 `buildDamageScrewText()`，不重複合併

### pickup.html（已完成）
- `renderZheng` / `svgPartialZheng` 已複製
- `parseComponentForPDF(text)` → 解析 "2.4 L: 14x3" 文字成正字 HTML，跨行保留顏色
- PDF 小卡：品項顯示數量（qty>1才顯示）、組件顯示正字SVG（L綠/C橙）
- PDF 末頁：`buildSummaryBlock(rows)` 植入物+釘子彙整表，含日期/時間/製表人

### Baodao.html（待移植）
- 架構已確認，參考 報刀_v2.html 直接抄
- 無 damageScrewState，跳過 toolDisplay 相關
- 重點：替換 componentInput textarea → display div、更新 updateComponentFromScrews、showPreview

## 漢堡選單（已實作）
所有頁面（報刀_v2、track、edit-request、review）右上角統一有 ☰ 選單
- admin/manager 多看：追蹤、審核、抓貨管理
- sales 只看基本連結
- 各頁面省略自己那個連結

## 開發原則
- 找到目標函數後直接修改，不要整個檔案重寫
- 修改完 commit push
- 中文繁體
- push 前先 git fetch，確認遠端有無新 commit，避免衝突
- 每次交接同時更新 CLAUDE.md
