#!/usr/bin/env python3
"""
診所藥局資料抓取腳本
從健保署開放資料 API 抓取桃園市、新竹市、新竹縣的診所與藥局資料
輸出 CSV 供匯入 Google Sheets

使用方式：
    # 方式 1：自動從 API 抓取（需在台灣網路環境）
    python fetch_data.py

    # 方式 2：從手動下載的 CSV 匯入
    #   1. 到 https://data.gov.tw/dataset/39283 下載診所 CSV
    #   2. 到 https://data.gov.tw/dataset/39284 下載藥局 CSV
    #   3. 執行：
    python fetch_data.py --csv 診所.csv 藥局.csv

輸出：
    clinic_pharmacy_data.csv — 合併後的診所+藥局資料
"""

import csv
import json
import sys
import time
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# === 設定 ===

# 健保署開放資料 API（info.nhi.gov.tw）
NHI_API_BASE = "https://info.nhi.gov.tw/api/iode0010/v1"

# 資源 ID
RESOURCE_IDS = {
    "診所": "A21030000I-D21004-001",
    "藥局": "A21030000I-D21005-001",
}

# 篩選地區
TARGET_CITIES = ["桃園市", "新竹市", "新竹縣"]

# 輸出檔名
OUTPUT_FILE = "clinic_pharmacy_data.csv"

# Google Sheets 欄位對應
OUTPUT_COLUMNS = [
    "機構ID",
    "機構名稱",
    "類別",
    "地址",
    "電話",
    "負責醫師/藥師",
    "開發階段",
    "拜訪次數",
    "最後拜訪日",
    "備註/跟進事項",
]

# 診療科別對應
DEPT_CATEGORY_MAP = {
    "01": "西醫",
    "02": "中醫",
    "03": "牙科",
    "04": "西醫",
    "05": "西醫",
    "06": "西醫",
    "10": "西醫",
    "11": "中醫",
    "12": "牙科",
    "13": "西醫",
    "22": "中醫",
    "40": "藥局",
    "60": "西醫",
    "81": "西醫",
    "82": "中醫",
    "83": "牙科",
    "84": "藥局",
}


def fetch_json(url, retries=3):
    """以 GET 取得 JSON 資料，含重試機制"""
    for attempt in range(retries):
        try:
            req = Request(url, headers={
                "User-Agent": "Mozilla/5.0 (clinic-crm-fetcher)",
                "Accept": "application/json",
            })
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (URLError, HTTPError) as e:
            print(f"  [重試 {attempt+1}/{retries}] {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return None


def fetch_nhi_api(resource_id, category_label):
    """從健保署 API 抓取資料"""
    print(f"\n📥 正在抓取：{category_label}（{resource_id}）...")

    # 先嘗試 dump endpoint（一次取得全部）
    dump_url = f"{NHI_API_BASE}/dump/datastore/{resource_id}"
    print(f"  嘗試 dump API: {dump_url}")
    data = fetch_json(dump_url)
    if data and isinstance(data, list) and len(data) > 0:
        print(f"  ✅ dump API 成功，共 {len(data)} 筆")
        return data

    # 改用 REST endpoint（分頁取得）
    all_records = []
    offset = 0
    limit = 1000
    while True:
        rest_url = f"{NHI_API_BASE}/rest/datastore/{resource_id}?offset={offset}&limit={limit}"
        print(f"  REST API offset={offset}...")
        data = fetch_json(rest_url)
        if not data:
            break

        records = []
        if isinstance(data, dict):
            if "result" in data and "records" in data["result"]:
                records = data["result"]["records"]
            elif "records" in data:
                records = data["records"]

        if not records:
            break

        all_records.extend(records)
        print(f"  取得 {len(records)} 筆（累計 {len(all_records)}）")

        if len(records) < limit:
            break
        offset += limit

    if all_records:
        print(f"  ✅ REST API 成功，共 {len(all_records)} 筆")
    return all_records


def fetch_data_gov_tw(resource_id, category_label):
    """備用：從 data.gov.tw API 抓取"""
    print(f"\n📥 嘗試 data.gov.tw API：{category_label}...")
    url = f"https://data.gov.tw/api/v2/rest/datastore/{resource_id}?format=json&limit=10000"
    data = fetch_json(url)
    if data and isinstance(data, dict) and "records" in data:
        records = data["records"]
        print(f"  ✅ data.gov.tw 成功，共 {len(records)} 筆")
        return records
    return []


def extract_address_city(address):
    """從地址提取縣市"""
    if not address:
        return ""
    for city in TARGET_CITIES:
        if address.startswith(city) or city in address[:6]:
            return city
    return ""


def classify_institution(record, fallback_category):
    """判斷機構類別"""
    # 嘗試從診療科別判斷
    dept = record.get("醫事機構種類", "") or record.get("HOSP_KIND", "") or ""
    for code, cat in DEPT_CATEGORY_MAP.items():
        if code in dept:
            return cat

    # 從名稱判斷
    name = record.get("醫事機構名稱", "") or record.get("HOSP_ID_NAME", "") or ""
    if "藥局" in name or "藥房" in name:
        return "藥局"
    if "牙" in name:
        return "牙科"
    if "中醫" in name:
        return "中醫"

    return fallback_category


def normalize_record(record, fallback_category):
    """
    將 API 回傳的原始欄位統一格式
    健保署 API 欄位可能是中文或英文 key
    """
    # 嘗試各種可能的欄位名
    hosp_id = (
        record.get("醫事機構代碼")
        or record.get("HOSP_ID")
        or record.get("機構代碼")
        or ""
    )
    name = (
        record.get("醫事機構名稱")
        or record.get("HOSP_ID_NAME")
        or record.get("機構名稱")
        or ""
    )
    address = (
        record.get("地址")
        or record.get("醫事機構地址")
        or record.get("HOSP_ID_ADDRESS")
        or record.get("機構地址")
        or ""
    )
    phone = (
        record.get("電話")
        or record.get("HOSP_ID_TEL")
        or record.get("機構電話")
        or ""
    )
    owner = (
        record.get("負責人")
        or record.get("負責醫事人員")
        or record.get("HOSP_OWNER")
        or ""
    )

    address = address.strip()
    city = extract_address_city(address)

    if not city:
        return None

    category = classify_institution(record, fallback_category)

    return {
        "機構ID": hosp_id.strip(),
        "機構名稱": name.strip(),
        "類別": category,
        "地址": address,
        "電話": phone.strip(),
        "負責醫師/藥師": owner.strip(),
        "開發階段": "冷開發",
        "拜訪次數": "0",
        "最後拜訪日": "",
        "備註/跟進事項": "",
    }


def import_from_csv(csv_files):
    """從手動下載的 CSV 檔案匯入"""
    all_results = []
    seen_ids = set()

    for filepath in csv_files:
        print(f"\n📂 讀取：{filepath}")
        try:
            # 嘗試各種編碼
            content = None
            for enc in ["utf-8-sig", "utf-8", "big5", "cp950"]:
                try:
                    with open(filepath, "r", encoding=enc) as f:
                        content = f.read()
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue

            if not content:
                print(f"  ⚠️  無法讀取 {filepath}（編碼問題）")
                continue

            lines = content.strip().split("\n")
            reader = csv.DictReader(lines)
            count = 0
            for row in reader:
                # 猜測類別
                fallback = "診所"
                name_val = ""
                for key in row:
                    if "名稱" in key:
                        name_val = row[key]
                        break
                if "藥局" in (name_val or "") or "藥局" in filepath:
                    fallback = "藥局"

                normalized = normalize_record(row, fallback)
                if normalized and normalized["機構ID"] not in seen_ids:
                    seen_ids.add(normalized["機構ID"])
                    all_results.append(normalized)
                    count += 1

            print(f"  ✅ 讀取成功，篩選後：{count} 筆（桃園+新竹）")

        except FileNotFoundError:
            print(f"  ❌ 找不到檔案：{filepath}")
        except Exception as e:
            print(f"  ❌ 讀取失敗：{e}")

    return all_results


def main():
    # 檢查命令列參數
    csv_mode = "--csv" in sys.argv
    csv_files = []
    if csv_mode:
        idx = sys.argv.index("--csv")
        csv_files = sys.argv[idx + 1:]

    print("=" * 60)
    print("🏥 診所藥局資料抓取腳本")
    print(f"📍 目標地區：{', '.join(TARGET_CITIES)}")
    print(f"📅 執行時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if csv_mode:
        print(f"📂 模式：CSV 匯入（{len(csv_files)} 個檔案）")
    else:
        print("📂 模式：API 自動抓取")
    print("=" * 60)

    all_results = []
    seen_ids = set()

    if csv_mode and csv_files:
        all_results = import_from_csv(csv_files)
    else:
        for category_label, resource_id in RESOURCE_IDS.items():
            # 嘗試健保署 API
            records = fetch_nhi_api(resource_id, category_label)

            # 備用：data.gov.tw
            if not records:
                records = fetch_data_gov_tw(resource_id, category_label)

            if not records:
                print(f"  ⚠️  無法取得{category_label}資料，跳過")
                continue

            # 正規化 + 篩選地區
            count = 0
            for rec in records:
                normalized = normalize_record(rec, category_label)
                if normalized and normalized["機構ID"] not in seen_ids:
                    seen_ids.add(normalized["機構ID"])
                    all_results.append(normalized)
                    count += 1

            print(f"  🎯 篩選後（桃園+新竹）：{count} 筆")

    if not all_results:
        print("\n❌ 沒有取得任何資料。")
        print("可能原因：")
        print("  1. API 暫時無法連線")
        print("  2. 需要先申請 API 金鑰")
        print("  3. 網路環境限制")
        print("\n替代方案：")
        print("  1. 前往 https://data.gov.tw/dataset/39283 下載診所 CSV")
        print("  2. 前往 https://data.gov.tw/dataset/39284 下載藥局 CSV")
        print("  3. 手動篩選桃園市、新竹市、新竹縣的資料")

        # 產出範例 CSV 供參考
        print(f"\n📝 產出範例 CSV（{OUTPUT_FILE}）供格式參考...")
        sample_data = [
            {
                "機構ID": "SAMPLE001",
                "機構名稱": "（範例）仁愛診所",
                "類別": "西醫",
                "地址": "桃園市桃園區中正路100號",
                "電話": "03-1234567",
                "負責醫師/藥師": "",
                "開發階段": "冷開發",
                "拜訪次數": "0",
                "最後拜訪日": "",
                "備註/跟進事項": "",
            },
            {
                "機構ID": "SAMPLE002",
                "機構名稱": "（範例）康健藥局",
                "類別": "藥局",
                "地址": "新竹市東區光復路200號",
                "電話": "03-7654321",
                "負責醫師/藥師": "",
                "開發階段": "冷開發",
                "拜訪次數": "0",
                "最後拜訪日": "",
                "備註/跟進事項": "",
            },
            {
                "機構ID": "SAMPLE003",
                "機構名稱": "（範例）明德中醫診所",
                "類別": "中醫",
                "地址": "新竹縣竹北市光明六路50號",
                "電話": "03-9876543",
                "負責醫師/藥師": "",
                "開發階段": "冷開發",
                "拜訪次數": "0",
                "最後拜訪日": "",
                "備註/跟進事項": "",
            },
        ]
        write_csv(sample_data)
        sys.exit(1)

    # 排序：先按地區、再按類別、再按名稱
    all_results.sort(key=lambda x: (x["地址"][:3], x["類別"], x["機構名稱"]))

    write_csv(all_results)

    # 統計
    print("\n" + "=" * 60)
    print("📊 統計")
    print("=" * 60)

    by_city = {}
    by_type = {}
    for r in all_results:
        city = r["地址"][:3] if len(r["地址"]) >= 3 else "其他"
        by_city[city] = by_city.get(city, 0) + 1
        by_type[r["類別"]] = by_type.get(r["類別"], 0) + 1

    print("\n📍 依地區：")
    for city, cnt in sorted(by_city.items()):
        print(f"  {city}：{cnt} 筆")

    print("\n🏷️ 依類別：")
    for t, cnt in sorted(by_type.items()):
        print(f"  {t}：{cnt} 筆")

    print(f"\n📊 總計：{len(all_results)} 筆")
    print(f"📄 已輸出至：{OUTPUT_FILE}")
    print("\n下一步：")
    print("  1. 將 CSV 匯入 Google Sheets「客戶總表」分頁")
    print("  2. 新增「拜訪歷史」分頁（欄位：拜訪ID、機構ID、拜訪日期、拜訪人、備註）")
    print("  3. 在 n8n 建立 Webhook")


def write_csv(data):
    """寫入 CSV"""
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(data)
    print(f"\n✅ 已輸出 {len(data)} 筆至 {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
