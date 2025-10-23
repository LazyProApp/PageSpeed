# JSON 檔案格式

## 格式規格

```json
{
  "credentials": {
    "api_key": "你的 Google PageSpeed API Key"
  },
  "urls": [
    "https://example.com",
    "https://example.com/page2"
  ],
  "reports": {
    "https://example.com": {
      "mobile": { /* PageSpeed 報告資料 */ },
      "desktop": { /* PageSpeed 報告資料 */ }
    }
  }
}
```

## 欄位說明

### credentials
- `api_key`: 選填，填入後會自動啟用 Pro Mode

### urls
- 必填，要分析的網址清單

### reports
- 選填，已經分析過的報告
- 包含手機版和桌面版的分析結果
