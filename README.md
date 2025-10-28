# Lazy PageSpeed

> 天下網頁，唯快不破

![Lazy PageSpeed](https://pagespeed.lazypro.app/assets/images/og-image.png)

Lazy PageSpeed 是 Google PageSpeed Insights API 的增強工具，僅花費極少的時間就能整理好大量網址的分析報告，再交由 AI 整理分析，取代手動操作與整理，用最短的時間取得全面性的完整分析報告。

## 解決什麼問題？

Google PageSpeed Insights 每次只能測一個網址，要優化整個網站、比較多個頁面、或定期追蹤效能時，重複貼網址測試既枯燥又容易出錯，更關鍵的問題是 PageSpeed Insights 網頁沒有下載功能，只能截圖或手動複製關鍵數據來記錄，無法保存完整報告，也就無法把完整資料給 AI 做全局分析，只能根據片段資訊各自判斷。

```
傳統流程：
網址 → PageSpeed Insights 網頁 → 看結果 → 截圖/手動複製 → 無法給 AI 分析
       (每次一個)                   (無法下載)      (片段資訊)
```

Lazy PageSpeed 作為中間層處理這些問題：批次呼叫 API 測試多個網址，將每個網址的龐大原始報告壓縮整理成精簡的 Markdown 檔案，使用者可以逐一貼給 AI 分析，或是整理成一個資料夾再配合提示讓 AI 系統性的總結，完整的 JSON 原始資料也會保留下來，報告能產生分享連結讓團隊協作，API Key 和報告資料都在使用者自己掌控中。

```
Lazy PageSpeed 流程：
多個網址 → Lazy PageSpeed → PageSpeed API → 完整報告下載
          (批次處理)         (自動呼叫)      (JSON + Markdown)
                                                    ↓
                                        ┌───────────┴───────────┐
                                        ↓                       ↓
                                  逐一給 AI               資料夾 + 提示
                                   單頁分析                  系統性總結
```

## 快速開始

### 線上使用
訪問 [https://pagespeed.lazypro.app](https://pagespeed.lazypro.app)

**隱私說明**：
- 免費版（3 個網址）使用 Cloudflare Workers 轉發 API 請求
- Pro 模式直接從瀏覽器呼叫你的 API Key，中間沒有伺服器
- 報告分享功能使用你自己的 Cloudflare R2（選用）
- 不記錄、不儲存任何分析資料

## 使用文件

完整的功能說明、JSON 格式、API Key 申請方式，都在文件裡：

📖 **[使用文件](https://docs.lazypro.app)**

文件包含：
- 快速開始指南
- Pro 模式設定（API Key 申請）
- R2 設定教學（報告分享功能）
- JSON 檔案格式說明
- 各功能按鈕詳解

## 技術架構

- **前端**：原生 JavaScript (ES6 模組)，無框架依賴
- **UI**：Material Design 3 (Material Web Components)
- **API**：Cloudflare Workers（免費版轉發 + 分享功能）
- **儲存**：Cloudflare R2（報告分享）、KV（短網址）
- **分析**：Google PageSpeed Insights API

## 開發指南

### 專案結構

```
lazy-pagespeed/
├── index.html              # 主頁面
├── assets/                 # 靜態資源
├── js/                     # JavaScript 模組
│   ├── main.js            # 程式進入點
│   ├── core/              # 核心業務邏輯
│   ├── ui/                # UI 層
│   ├── modules/           # 外部模組封裝
│   └── utils/             # 工具函數
└── docs/                  # GitBook 文件
```

## 授權

**個人使用授權** - 允許個人/公司內部使用，禁止整合至對外服務

### 允許
- 個人或公司內部自行使用
- 修改以符合內部需求
- 學習研究用途

### 禁止
- 整合到對外提供的服務（免費或付費）
- 作為 SaaS 平台的一部分
- 再分發為商業產品

詳細條款請見 [LICENSE](LICENSE)

## 技術支援

- **文件**：[https://docs.lazypro.app](https://docs.lazypro.app)
- **Issues**：[GitHub Issues](https://github.com/LazyPro/pagespeed/issues)

---

© 2025 Nel Tseng
