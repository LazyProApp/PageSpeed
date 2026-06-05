# Open Source Readiness

這個目錄整理 Lazy PageSpeed 申請 OpenAI Codex for Open Source 前的準備資料。

## 目前判斷

Lazy PageSpeed 有明確的開源申請價值：它把 Google PageSpeed Insights API 的單頁分析流程，整理成可批次處理、可下載、可交給 AI 做後續分析的工作流。這類維護會長期受到 PageSpeed API、Lighthouse 報告格式、瀏覽器安全政策、Cloudflare Workers / R2 行為與前端 UI 需求影響，適合用 Codex 協助維護。

目前最大阻礙是 LICENSE 還不是一般認定的 open source license。送出申請前，需要先決定是否移除「禁止商業利用、禁止服務整合、禁止再分發」這類限制，並改用 OSI 常見授權。

## 申請主軸

- 讓開發者與網站維護者批次分析多個網址，不再逐頁手動截圖或複製 PageSpeed 結果。
- 產出 JSON 與 Markdown 報告，方便交給 AI 進行完整效能診斷。
- Pro 模式可由使用者自己的瀏覽器與 API Key 直接呼叫 PageSpeed API，降低資料外洩與伺服器依賴。
- 分享功能可接入使用者自己的 Cloudflare R2，讓團隊保有資料掌控權。
- 專案維護需要持續追蹤 PageSpeed / Lighthouse 回傳格式、瀏覽器 CSP、Cloudflare Workers、報告 UI 與測試案例。

## 文件索引

- [TODO.md](TODO.md)：送出前工作清單。
- [APPLICATION-DRAFT.md](APPLICATION-DRAFT.md)：申請表可用草稿。
- [LICENSE-DECISION.md](LICENSE-DECISION.md)：授權選項與影響。
