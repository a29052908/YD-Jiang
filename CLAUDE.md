# Tandry 報刀系統

## 技術架構
- 前端：純 HTML/CSS/JS，部署在 GitHub Pages
- 後端：n8n，部署在 https://ydj.zeabur.app
- 資料：Google Sheets（ID: 1z0UJIwXpV1yUTqbbovoH9pcqQNDLMxLIMNwI9h4B7D4）

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
業務代碼：IV=Ivan, DI=Dino, HE=Henry, VI=Vincent, KA=Kaley, TA=Tan, ED=Eddie, BR=Bruce

## 正字記數系統（已實作於 報刀_v2.html）
- `renderZheng(n, color)` → HTML 正字符號（5的倍數=粗體「正」，1-4=SVG筆畫）
- `svgPartialZheng(strokes, color)` → SVG 局部正字，W=17 H=14 sw=4.5 viewBox="0 0 28 30"
- `_buildZhengHTML(boards, state)` → 產生整個釘盤的正字 HTML（底色19%透明、br=7、×分隔、/組間）
- `buildScrewHTML()` / `buildDamageScrewHTML()` → 呼叫 _buildZhengHTML
- `toZheng(n)` → 純數字字串（給 n8n / Google Sheets 用）
- 介面：componentDisplay div（HTML）+ componentInput textarea（隱藏，存純文字）
- 待移植：Baodao.html（架構已確認，可參考 報刀_v2.html 直接抄）
- 待移植：pickup.html（品項數量＋組件欄位正字顯示，PDF維持純數字）

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
