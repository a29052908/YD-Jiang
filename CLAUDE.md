# Tandry 報刀系統

## 技術架構
- 前端：純 HTML/CSS/JS，部署在 GitHub Pages
- 後端：n8n，部署在 https://ydj.zeabur.app
- 資料：Google Sheets（ID: 1z0UJIwXpV1yUTqbbovoH9pcqQNDLMxLIMNwI9h4B7D4）

## 維護 SOP
- 新增人員／離職交接／院所・品號異動 → 見 `docs/SOP.md`（含資料落點對照、逐項檢查清單、資料健檢）

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
- doctor-habits.html：醫師習慣（慣用器械/復位工具/釘子鎖入/torque/補充），全員可閱覽編輯、不需審核。查詢頁一次看一筆（手機瀏覽考量）。`ZONE_HOSPITAL_DB` 是從 報刀_v2.html 的 `innerCodeDb`（大區/醫院）+ `rulesDb`（醫院/醫師）join 產生的靜態快照，非即時同步——院所/醫師異動時需重新產生並替換。「大千/新光/部桃/聯新/新竹台大/敏盛」因 innerCodeDb 無大區對應，暫未列入；「台中老人/中國醫總院」目前無醫師資料，畫面顯示「尚無醫師資料」。漢堡選單入口已加入（報刀_v2/track/edit-request/review/dashboard/performance 皆全員可見）。⚠️ n8n 踩雷紀錄：`讀取醫師習慣表`／`讀取醫師習慣表2`（Get Row(s)）查到 0 筆時，n8n 預設會直接停止整條流程（"No output data returned"），導致存檔/查詢完全沒有回應，不是憑證問題。兩個 node 都要在 Settings → **Always Output Data** 開啟，否則分頁剛重建、或第一次存檔（尚無既有資料）時會整條卡死。
`讀取醫師習慣表`／`讀取醫師習慣表2`（Get Row(s)）查到 0 筆時，n8n 預設會直接停止整條流程（"No output data returned"），導致存檔/查詢完全沒有回應——不是憑證問題。兩個 node 都要在 **Settings → Always Output Data** 開啟，否則分頁剛重建、或第一次存檔時（尚無既有資料）會整條卡死。
- 收據辨識.html：獨立小工具，服務室內設計朋友的「免用統一發票收據」辨識建檔，與報刀系統無關（品牌文字已中性化）。串接獨立 n8n webhook（不共用報刀單辨識頁面的 webhook/localStorage），localStorage key 為 `receipt_webhook_url`／`receipt_history`。表格欄位：日期／買受人／地址／品名／數量／單價／總價／合計金額／備註；備註以「⚠️」開頭時該列會醒目標示，提醒人工複核。上傳 file field 名稱為 `receipt`。

## n8n Webhook
- /webhook/manual-baodao：報刀送出
- /webhook/login：登入
- /webhook/verify-token：Token驗證
- /webhook/get-cases：撈總表資料
- /webhook/submit-track：送出追蹤
- /webhook/get-tracks：撈追蹤清單
- /webhook/resolve-track：追蹤結案（主管/admin）
- /webhook/respond-track：業務對追蹤任務送出說明（寫入 業務說明/回覆者/回覆時間）
- /webhook/submit-edit：送出變更申請
- /webhook/get-edit-requests：撈變更申請
- /webhook/review-edit：審核變更
- /webhook/get-pickup：撈抓貨清單
- /webhook/mark-picked：標記抓貨狀態
- /webhook/save-doctor-habit：新增/覆寫一筆醫師習慣（依院區+醫師+部位比對，存在則更新）
- /webhook/get-doctor-habit：查詢醫師習慣（依醫院+醫師，回傳該醫師底下所有部位）

## Google Sheets 分頁
- 報刀單格式（gid=713793623）：主資料
- 變更申請表（gid=414619609）：變更申請
- 變更Log表（gid=237787039）：異動記錄
- 追蹤表（gid=1786361494）：案件追蹤
- 醫師習慣表（gid=1123380667）：欄位為 院區/醫師/部位/慣用器械/復位工具/釘子鎖入/torque/補充/最後編輯人/最後編輯時間。⚠️ 分頁曾重建過 gid（原為 919579337），n8n 的「更新既有資料」「新增資料」兩個 node 記得同步改選新分頁，否則會變成讀新表、寫舊表。

## 角色權限
- sales：業務，只看自己的資料
- manager：主管，看全部
- admin：內勤/管理員，看全部（目前 Ivan 是 admin）

## 業績歸屬規則（共管院所）
共管院所的 `負責業務` 以 `/` 分隔多人（如 `Henry/Darren`）。`業務`＝實際報刀者（單一），`負責業務`＝院所歸屬（可多人）。前提：同一台刀不會兩人各自重複報。
- **業績數 → 依 `負責業務`，兩人共算**：個人／切換視角以 `/` 拆分比對，共管刀 Henry、Darren 各算一筆；整體視角不過濾、每台只計一次（自動去重＝1 台）。故 Σ個人 > 整體 屬預期。
- **跟刀費 → 依 `業務`（報刀者），只算一人**：總表主表本來就顯示 `業務`。
- 實作：
  - `performance.html` `splitSales()`/`isInCharge()` → `filterRows()`、`populateSalesSwitch()`（下拉拆成各別業務，不出現「Henry/Darren」）。
  - `dashboard.html` `buildPivot()` support 判定＝「報刀者不在 `負責業務` 名單內」才算支援刀，避免共管刀被誤判 support。

## 報刀_v2 部位特殊邏輯（report刀頁）
- **VA 分層（醫院感知）**：BUWEI_LIST 只放單一 `VA`；選 VA 後由 `vaPickerHtml()` 依 `selectedHospital` 從 innerCodeDb 撈出該院所有 `部位_院內碼` 開頭為 `VA` 的子部位。**是否有型號樹改為資料驅動**：`vaHasModel(b)=DB.some(r=>r.部位===b)`，DB 內有該部位資料就走一般骨板路徑顯示型號樹，否則「無型號直接加入」。目前有型號樹：`VA小骨`、`VA3.5直板`(直板/Recon)、`VA鎖骨`(Hook/Distal/Superior Clavicle)、`VA上肢`(LPHP)、`VA腓骨`(Distal Fibula)；仍無型號：VA5.0直板/VA下肢/VA骨釘/VA遠端腓骨。無左右的 VA 部位（VA3.5直板/VA上肢）需列入 `NO_RL` 才會顯示 V3 洞數。`setVaSub()` 把 sel.buwei 設為完整子部位名（如 `VA腓骨`），送出/下游維持原格式。
- **聖保祿/土庚小骨**：姊妹院，部位_院內碼用同格式細分型號，`lookupInnerCode` 特例以 specLabel 直接比對。
- **埋頭釘**：支援 `埋頭釘(自費)`/`埋頭釘(健保)` 變體（松山）及 `埋頭釘{直徑}` 變體（中壢長榮）。
- **負責業務**：支援 `/` 分隔多業務共管（如 `Henry/Darren` 兩人皆可見）。
- **人工骨**：容量 0.6/1.0/2.5/5.0cc；innerCodeKey=`人工骨{容量}`。骨粉統一命名為人工骨。
- **不記價**（`NO_PRICE_BUWEI`）：部位&品號卡片最下方獨立虛線按鈕（不在 BUWEI_LIST 內），給部位/品號跟平常不對應、無法比對院內碼的情境快速加入（無固定假設，不加文字註記）。點擊後跳過所有規格選擇層級，直接可設數量加入；`lookupInnerCode` 對此 buwei 明確 return ''，絕不自動比對院內碼（院內碼欄位維持空白，可手動輸入）。
- **support（贊助）**：骨板/埋頭釘等品項無償贊助時的標記，跟「另洽」按鈕並排。⚠️ 內部命名刻意避開撞名：報刀_v2.html 既有的 `supportMode`/`toggleSupportMode()`/`supportBtn` 是**跨區支援報刀**（業務代跑別區案件），dashboard.html 隱藏統計表也已有一欄英文「Support」是同一個跨區支援概念——這兩個跟贊助是**完全不同的東西**，只是內勤也習慣叫「support」。贊助功能程式碼內部一律用 `sponsor` 系列命名（`sponsorMode`/`toggleSponsor()`/`sponsorBtn`），資料欄位用 `support`（矩配內勤用語），畫面文字顯示「support」，但不可與既有的跨區支援程式碼共用識別字。品項欄位 `support:'是'/''`，業績（performance.html）計算時金額強制為0（單位/台數仍正常計入）。

## 流水號規則
格式：{業務代碼}{年後2碼}{月2碼}{日2碼}{序號2碼}
例：IV26050801
業務代碼：IV=Ivan, DI=Dino, HE=Henry, VI=Vincent, KA=Kaley, MA=Mandy, ED=Eddie, BR=Bruce, AN=Andrew, RI=Richie, EA=Eason, DA=Darren, DE=Derek。⚠️ Nick（新增業務，負責台中區）已加入 報刀_v2.html 的 salesList，但流水號代碼字母、email/角色需在 n8n + Google Sheets 登入帳號分頁另外設定，前端目前沒有他的代碼。
（email/角色/最新流水號存於 n8n + Google Sheets 登入帳號分頁，不在前端；前端僅 `報刀_v2.html` salesList 名單。角色：Ivan/Eddie/Bruce/Eason=admin，其餘 sales）

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
所有頁面（報刀_v2、track、edit-request、review、dashboard、performance）右上角統一有 ☰ 選單
- 統一邏輯：`_role !== 'sales'` 才顯示 變更申請/審核/抓貨管理（sales 隱藏；變更申請/審核尚未完成測試、抓貨管理僅內勤）
- 追蹤、業績儀表板、醫師習慣：全部角色可見
- 業績儀表板（performance.html）範圍由頁內控制：sales 無業務切換、只看本人（`負責業務===displayName`）；admin/manager 可切換/看整體。⚠️ 此頁選單邏輯跟其他頁不同，不是用 `_show()`：trackBtn/editRequestBtn/reviewBtn/pickupBtn 綁在同一組、只認 `IS_ADMIN`（沒有 manager 區分）；doctorHabitsBtn 因為全員可見，直接不加 `display:none`，不需要 JS 顯示邏輯。
- pickup.html 無漢堡選單
- 各頁面省略自己那個連結

## 總表 dashboard
- 業績統計視圖（viewStatsBtn/statsView）已隱藏（`display:none`）—「先移除」，日後要恢復把 style 拿掉即可

## 開發原則
- 找到目標函數後直接修改，不要整個檔案重寫
- 修改完 commit push
- 中文繁體
- push 前先 git fetch，確認遠端有無新 commit，避免衝突
- 每次交接同時更新 CLAUDE.md
