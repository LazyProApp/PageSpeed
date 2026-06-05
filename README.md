# Lazy PageSpeed

> 天下網頁，唯快不破

![Lazy PageSpeed](https://pagespeed.lazypro.app/assets/images/og-image.png)

Lazy PageSpeed 是 Google PageSpeed Insights API 的增強工具，僅花費極少的時間就能整理好大量網址的分析報告，方便轉交給 AI 整理分析，取代手動操作與整理，用最短的時間取得全面性的完整分析報告。

## 功能特色

- **批次分析**: 可以快速分析多個網址
- **完整報告下載**: JSON 原始資料 + Markdown 精簡格式
- **AI 友善**: 報告格式優化，可直接貼給 AI 分析
- **雙模式**: 免費版（3 個網址）/ Pro 模式（無限制）
- **報告分享**: 產生分享連結讓團隊協作
- **零信任架構**: API Key 和報告資料都在你自己掌控中

## 分析流程說明

**傳統 PageSpeed Insights 分析流程**：
```
網址 → PageSpeed Insights 網頁 → 看結果 → 截圖/手動複製 → 難給 AI 分析
       (每次一個)                   (無法下載)      (片段資訊)
```

**Lazy PageSpeed 分析流程**：
```
多個網址 → Lazy PageSpeed → PageSpeed API → 完整報告下載
          (批次處理)         (自動呼叫)      (JSON + Markdown)
                                                    ↓
                                        ┌───────────┴───────────┐
                                        ↓                       ↓
                                  逐一給 AI               資料彙整 + Prompt
                                   單頁分析                  系統性總結
```

## 關於

**網址**：https://pagespeed.lazypro.app

**使用文件**：https://docs.lazypro.app/content/pagespeed/00-overview.md

**隱私說明**：
- 免費版（3 個網址）使用 Cloudflare Workers 轉發 API 請求
- Pro 模式直接從瀏覽器呼叫你的 API Key，中間沒有伺服器
- 報告分享功能使用你自己的 Cloudflare R2（選用）
- 不記錄、不儲存任何分析資料


## 授權

Lazy PageSpeed 採用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 授權。

你可以使用、修改與散布本專案；若你修改本專案並透過網路服務提供給使用者，需依 AGPL-3.0 提供對應原始碼。

詳細條款請見 [LICENSE](LICENSE)

---

© 2025 Nel Tseng
