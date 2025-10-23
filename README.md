# Lazy Page Insights

PageSpeed 效能分析工具

## 本地開發

### 啟動本地伺服器

```bash
# 使用 Python 3
cd /Users/neltseng/Dropbox/Works/NT/lazy-page-insights
python3 -m http.server 8000

# 或使用 PHP
php -S localhost:8000
```

然後訪問：`http://localhost:8000`

### 目錄結構

```
lazy-page-insights/
├── index.html              # 主頁面
├── assets/                 # 靜態資源
│   ├── css/styles.css
│   ├── images/
│   └── favicon.png
├── js/                     # JavaScript 模組
│   ├── main.js
│   ├── core/               # 核心業務邏輯
│   ├── ui/                 # UI 層
│   ├── modules/            # 外部模組封裝
│   └── utils/              # 工具函數
├── url-templates/          # URL 測試範本
├── demo/                   # Demo 頁面
└── tst/                    # 測試檔案
```

## 部署

建議域名：`page-insights.lazypro.app`

使用 Cloudflare Pages 部署。
