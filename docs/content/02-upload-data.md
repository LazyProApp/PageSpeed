# 上傳資料

## 功能
上傳要分析的網址或憑證，格式為 JSON

## 操作流程
1. 點擊底部輸入框左側的 + 按鈕
2. 選擇 JSON 檔案
3. 系統自動載入資料

## 上傳邏輯

系統根據 JSON 內容自動判斷處理方式：

### 情境 1：只上傳憑證（不清空現有資料）
**使用時機**：打開分享連結後，想啟用 Pro Mode 繼續分析

**JSON 內容**：
```json
{
  "credentials": {
    "api_key": "YOUR_API_KEY"
  }
}
```

**系統行為**：
- ✅ 保留現有的網址和報告
- ✅ 啟用 Pro Mode
- ✅ 可以繼續分析或新增更多網址

---

### 情境 2：上傳完整資料（清空並載入新資料）
**使用時機**：匯入新的分析專案

**JSON 內容**：
```json
{
  "credentials": {
    "api_key": "YOUR_API_KEY"
  },
  "share_report": {
    "upload": true,
    "r2": { /* R2 設定，用於分享功能，詳見下一章 */ }
  },
  "urls": [
    "https://example.com",
    "https://example.com/page2"
  ],
  "reports": {
    "https://example.com": {
      "mobile": { /* 報告資料 */ },
      "desktop": { /* 報告資料 */ }
    }
  }
}
```

**系統行為**：
- ⚠️ 清空現有的所有資料
- ✅ 載入新的網址清單
- ✅ 載入已分析的報告（若有）
- ✅ 啟用 Pro Mode（若有 API Key）

---

### 情境 3：只上傳網址（基本模式）
**使用時機**：快速分析幾個網址，使用免費配額

**JSON 內容**：
```json
{
  "urls": [
    "https://example.com",
    "https://example.com/page2"
  ]
}
```

**系統行為**：
- ⚠️ 清空現有的所有資料
- ✅ 載入新的網址清單
- ✅ 使用基本模式（最多 3 個網址）

---

## 注意事項

- ⚠️ **情境 2 和 3 會清空現有資料**：如果只想啟用 Pro Mode，使用情境 1
- ✅ **JSON 必須包含網址或憑證**：至少要有其中一項
- 💾 **分享功能設定**（`share_report`）：可選欄位，用於自動上傳報告到你的 R2 儲存空間，詳見 [JSON 檔案格式](03-json-format.md)
- ✅ **詳細格式說明**：請參閱 [JSON 檔案格式](03-json-format.md)
