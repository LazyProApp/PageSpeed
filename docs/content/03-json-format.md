# JSON 檔案格式

> 💡 **提示**：根據使用情境，可以只包含部分欄位。詳見 [上傳資料](02-upload-data.md) 的三種情境說明。

## 完整格式規格

```json
{
  "credentials": {
    "api_key": "你的 Google PageSpeed API Key"
  },
  "share_report": {
    "upload": false,
    "r2": {
      "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
      "accessKeyId": "YOUR_R2_ACCESS_KEY_ID",
      "secretAccessKey": "YOUR_R2_SECRET_ACCESS_KEY",
      "bucketName": "YOUR_R2_BUCKET_NAME",
      "autoDelete": true,
      "deleteDays": 7,
      "shareExpireDays": 7
    }
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

## 最小格式範例

### 只啟用 Pro Mode（不清空資料）
```json
{
  "credentials": {
    "api_key": "YOUR_API_KEY"
  }
}
```

### 只匯入網址（基本模式）
```json
{
  "urls": [
    "https://example.com"
  ]
}
```

## 欄位說明

### credentials
- `api_key`: 選填，填入後會自動啟用 Pro Mode

### share_report
- 選填，用於分享報告功能
- 不需要分享功能可省略此區塊

#### share_report.upload
- `true`: 啟用上傳功能，分析後自動上傳報告到你的 R2
- `false`: 停用上傳功能，即使填寫了 r2 設定也不會上傳

#### share_report.r2
- 選填，你的 Cloudflare R2 儲存空間設定
- 只有當 `upload: true` 時才會使用
- `accountId`: Cloudflare Account ID
- `accessKeyId`: R2 API Token 的 Access Key ID
- `secretAccessKey`: R2 API Token 的 Secret Access Key
- `bucketName`: R2 Bucket 名稱
- `autoDelete`: 是否自動刪除過期報告（預設 true）
- `deleteDays`: 報告保留天數（預設 7 天）
- `shareExpireDays`: 分享連結有效天數（預設 7 天）

#### ⚠️ 重要：R2 Bucket 必須設定 CORS

使用自己的 R2 儲存時，**必須**在 R2 Bucket 設定 CORS Policy，否則瀏覽器會阻擋連線。

**設定步驟**：

1. 前往 Cloudflare Dashboard 的 R2 Bucket 設定頁面：
   ```
   https://dash.cloudflare.com/[你的 Account ID]/r2/buckets/[Bucket 名稱]/settings
   ```

2. 找到「**CORS Policy**」區塊，點擊「**Edit**」

3. 貼上以下 JSON 設定：

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

4. 點擊「**Save**」儲存設定

**CORS 設定說明**：
- `AllowedOrigins: ["*"]`：允許所有來源存取（生產環境建議改為特定網域，如 `["https://yourdomain.com"]`）
- `AllowedMethods`：允許的 HTTP 方法（GET、PUT、DELETE、HEAD）
- `AllowedHeaders: ["*"]`：允許所有請求標頭
- `ExposeHeaders: ["ETag"]`：允許瀏覽器讀取 ETag 標頭
- `MaxAgeSeconds: 3000`：預檢請求（preflight）的快取時間（50 分鐘）

**如果沒有設定 CORS**，匯入 JSON 時會出現：
```
Pro Mode
您上傳的設定檔中，R2 連線資訊有問題（NetworkError when attempting to fetch resource.）。
分享功能暫時無法使用，但網站分析功能不受影響唷！
```

### urls
- **必填**（除非只上傳憑證）
- 要分析的網址清單
- 上傳時會清空現有資料並載入新網址

### reports
- 選填，已經分析過的報告
- 包含手機版和桌面版的分析結果
- 格式：`{ "url": { "mobile": {...}, "desktop": {...} } }`

---

## 範例檔案

完整的範例 JSON 檔案位於專案中：

```
/url-templates/example-urls.json
```

線上檢視：[example-urls.json](https://pagespeed.lazypro.app/url-templates/example-urls.json)

此範例包含完整的欄位結構，可作為建立自己的設定檔時的參考。

---

## 使用建議

1. **首次使用**：上傳完整格式（含 `urls`）
2. **分享後繼續分析**：只上傳 `credentials`（不清空資料）
3. **切換專案**：上傳新的完整格式（會清空舊資料）
4. **匯出分享**：使用 Download 按鈕（不含憑證，安全分享）

詳細說明請參閱：[上傳資料](02-upload-data.md)
