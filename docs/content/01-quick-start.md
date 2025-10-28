# 快速開始

## 基本流程
1. 點擊表格右上角 + New 按鈕新增網址
2. 點擊底部 Start 按鈕開始分析（最多 3 個）
3. 表格顯示分析狀態
4. 點擊表格內 Analyze 按鈕查看報告

## Pro Mode 專業模式分析流程

需要使用自己的 Google PageSpeed API Key

1. 建立包含 API Key 的 JSON 檔案
2. 點擊底部 + 按鈕上傳 JSON 檔案（自動啟用 Pro Mode）
3. 點擊表格右上角 + New 按鈕新增網址
4. 點擊底部 Start 按鈕開始分析（無數量限制）
5. 表格顯示分析狀態
6. 點擊表格內 Analyze 按鈕查看報告

## 如何申請 Google PageSpeed API Key

### 申請步驟
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 PageSpeed Insights API
4. 建立 API 金鑰（API Key）
5. 將 API Key 寫入 JSON 檔案（格式見 JSON 檔案格式章節）

### API Key 限制
- Google 提供每日 25,000 次免費查詢額度
- 超過額度需付費使用
- 建議自行監控使用量

## 如何設定 Cloudflare R2（選用）

### 用途
- 用於分享報告功能
- 報告會儲存在你自己的 R2 空間
- 不設定也可正常使用分析功能，只是無法分享

### 申請步驟

#### 步驟 1：建立 R2 Bucket
1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 前往「R2 Object Storage」頁面
3. 點擊「Create bucket」
4. 輸入 Bucket 名稱（例如：my-pagespeed-reports）
5. Location 選項：
   - 保持「Automatic」讓 Cloudflare 自動選擇最近的區域
   - 或選擇「Specify jurisdiction」指定區域
6. 點擊「Create bucket」完成

#### 步驟 2：建立 API Token
1. 在 R2 頁面，點擊「Manage R2 API Tokens」
2. 點擊「Create API token」
3. 選擇 Token 類型：
   - User API Token（建議）：綁定你的個人帳號
   - Account API Token：綁定整個 Cloudflare 帳號（需 Super Administrator）
4. 設定 Token：
   - Token name: `PageSpeed Reporter`（可自訂）
   - Permissions: 選擇「Object Read & Write」
   - Apply to specific buckets: 選擇剛建立的 bucket
5. 點擊「Create API Token」

#### 步驟 3：保存憑證
建立後會顯示以下資訊（**只顯示一次，務必立即複製**）：
- **Access Key ID**（客戶端 ID）
- **Secret Access Key**（客戶端密鑰）

#### 步驟 4：取得 Account ID
1. 在 Cloudflare Dashboard 任何頁面
2. 右側會顯示你的 Account ID
3. 或前往「Workers & Pages」→「Overview」查看
4. Account ID 格式：32 字元的英數字串

#### 步驟 5：填入 JSON 檔案
將這些資訊寫入 JSON 檔案的 `share_report.r2` 區塊：
```json
{
  "share_report": {
    "upload": true,
    "r2": {
      "accountId": "你的 Account ID",
      "accessKeyId": "Access Key ID",
      "secretAccessKey": "Secret Access Key",
      "bucketName": "my-pagespeed-reports"
    }
  }
}
```

### R2 免費額度
- 每月 10 GB 儲存空間
- 100 萬次上傳操作
- 1000 萬次下載操作
- 無流量費用

### 安全提醒
- **Secret Access Key 是敏感資訊**
- 不要將包含 R2 憑證的 JSON 檔案上傳到公開位置
- 不要分享給他人
- 建議定期輪換 API Token
- JSON 檔案應儲存在本機安全位置
