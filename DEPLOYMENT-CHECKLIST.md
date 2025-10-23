# Lazy PageSpeed 部署檢查清單

## 📋 GitHub 上傳前檢查

### ✅ 1. 敏感資訊檢查
- [ ] 確認沒有硬編碼的 API Keys
- [ ] 確認 wrangler.toml 不包含敏感資訊
- [ ] 確認 .gitignore 已正確設定
- [ ] 檢查 demo/ 和 tst/ 目錄已被排除

```bash
# 執行檢查命令
grep -r "AIza[0-9A-Za-z_-]\{35\}" --exclude-dir={node_modules,demo,tst} .
```

### ✅ 2. 檔案結構檢查
- [ ] `.gitignore` 存在且包含必要的排除項目
- [ ] `_headers` 存在且配置正確
- [ ] `README.md` 更新完整
- [ ] 移除不必要的備份檔案（*.backup, *.bak）

### ✅ 3. 代碼品質檢查
- [ ] 所有 console.log 已移除或改用 logger
- [ ] 沒有 TODO/FIXME 標記的關鍵問題
- [ ] 測試檔案已移除或放在 tst/ 目錄

---

## 🚀 Cloudflare Pages 部署

### ✅ 1. 連接 GitHub Repository
1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 **Workers & Pages**
3. 點擊 **Create application** → **Pages** → **Connect to Git**
4. 選擇您的 GitHub repository

### ✅ 2. 建置設定
配置以下參數：

| 設定項目 | 值 |
|---------|---|
| **Production branch** | `main` 或 `master` |
| **Build command** | 留空（靜態網站） |
| **Build output directory** | `/` |
| **Root directory** | `/` |

### ✅ 3. 環境變數（非必要，前端不需要）
前端應用不需要設定環境變數。API Keys 由 Workers 管理。

---

## 🔧 Cloudflare Workers 部署

### ✅ 1. 安裝 Wrangler CLI
```bash
npm install -g wrangler
```

### ✅ 2. 登入 Cloudflare
```bash
wrangler login
```

### ✅ 3. 設定 Secret（Google API Key）
```bash
cd workers
wrangler secret put GOOGLE_API_KEY
# 輸入您的 Google PageSpeed API Key
```

### ✅ 4. 建立 R2 Bucket（用於分享功能）
```bash
wrangler r2 bucket create lazy-pagespeed-reports
```

### ✅ 5. 建立 KV Namespace（用於分享功能）
```bash
# 生產環境
wrangler kv:namespace create "SHARE_KV"

# 記下返回的 ID，更新 wrangler.toml:
# id = "返回的ID"
```

### ✅ 6. 部署 Workers
```bash
cd workers
wrangler deploy
```

### ✅ 7. 更新 Workers URL
部署後，更新前端代碼中的 Workers URL：

**檔案**: `js/config.js`
```javascript
export const config = {
  api: {
    workersUrl: 'https://YOUR-WORKER-NAME.workers.dev'  // 更新為實際的 URL
  }
  // ...
};
```

**檔案**: `_headers`
```
Content-Security-Policy: ... connect-src 'self' https://YOUR-WORKER-NAME.workers.dev ...
```

---

## 🔐 安全性檢查

### ✅ Critical 優先級（必須修復）
- [ ] **實施 Workers API 速率限制**
  - 使用 Cloudflare Workers KV 或 Durable Objects
  - 限制每個 IP 每小時 10 次請求

```javascript
// workers/src/index.js 添加速率限制
async function checkRateLimit(clientIP, env) {
  const key = `ratelimit:${clientIP}`;
  const requests = await env.RATE_LIMIT_KV.get(key);
  const count = requests ? parseInt(requests) : 0;

  if (count >= 10) {
    throw new Error('Rate limit exceeded');
  }

  await env.RATE_LIMIT_KV.put(key, String(count + 1), {
    expirationTtl: 3600 // 1 小時
  });
}
```

### ✅ High 優先級（強烈建議）
- [ ] **修復 XSS 風險** - `convertLinks()` 和 `stripHtml()` 函數
- [ ] **限制 CORS** - 只允許特定來源
- [ ] **添加 URL 驗證** - 前後端都要驗證

### ✅ 安全標頭驗證
部署後使用 [Security Headers](https://securityheaders.com/) 檢查：
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security
- [ ] Content-Security-Policy

---

## 🧪 部署後測試

### ✅ 1. 功能測試
- [ ] 首頁正常載入
- [ ] 可以添加 URL 進行分析
- [ ] Workers API 正常回應
- [ ] 分享功能正常運作
- [ ] Download JSON 功能正常
- [ ] Download Report 功能正常

### ✅ 2. 效能測試
- [ ] Lighthouse Score > 90
- [ ] 首次內容繪製 < 2s
- [ ] 可互動時間 < 3s

### ✅ 3. 安全性測試
```bash
# 測試 CORS
curl -H "Origin: https://evil.com" https://your-site.pages.dev/

# 測試速率限制（應該被擋下）
for i in {1..15}; do curl https://your-worker.workers.dev/api/analyze; done
```

### ✅ 4. 跨瀏覽器測試
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## 📊 監控設定

### ✅ 1. Cloudflare Analytics
- [ ] 啟用 Web Analytics
- [ ] 設定自訂事件追蹤

### ✅ 2. Workers Analytics
- [ ] 監控請求量
- [ ] 設定配額警報
- [ ] 追蹤錯誤率

### ✅ 3. Google PageSpeed API 配額
- [ ] 檢查每日配額使用量
- [ ] 設定警報（接近上限時通知）

---

## 🔄 持續整合建議

### GitHub Actions Workflow
建立 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: lazy-pagespeed
          directory: .
```

---

## 📝 部署後記錄

部署完成後，記錄以下資訊：

| 項目 | 值 | 備註 |
|-----|---|------|
| **Pages URL** | | 主要網址 |
| **Workers URL** | | API 端點 |
| **部署日期** | | |
| **Git Commit** | | |
| **Cloudflare Dashboard** | https://dash.cloudflare.com | |

---

## 🆘 故障排除

### 問題：Pages 部署失敗
- 檢查建置日誌
- 確認檔案路徑正確
- 檢查 _headers 語法

### 問題：Workers 無法存取
- 檢查 CORS 設定
- 確認 Secret 已設定
- 檢查 Workers 路由規則

### 問題：API Key 配額耗盡
- 實施速率限制
- 檢查是否被濫用
- 考慮輪換 API Key

---

## ✅ 最終檢查清單

上線前最後確認：

- [ ] 所有敏感資訊已移除
- [ ] .gitignore 和 _headers 已提交
- [ ] Workers Secret 已設定
- [ ] Pages 部署成功
- [ ] Workers 部署成功
- [ ] 功能測試全部通過
- [ ] 安全標頭配置正確
- [ ] 監控和警報已設定
- [ ] 文件已更新

---

**部署日期**: ____________
**部署人員**: ____________
**檢查人員**: ____________
