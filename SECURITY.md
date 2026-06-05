# Security Policy

## Supported Versions

目前只維護 `main` branch。

## Reporting a Vulnerability

若你發現安全問題，請不要直接公開 issue。請寄信到：

hello@lazypro.app

請盡量提供：

- 受影響的頁面或功能。
- 重現步驟。
- 可能影響範圍。
- 是否涉及 API Key、分享連結、Cloudflare R2 或使用者報告資料。

## Security Scope

Lazy PageSpeed 的安全重點包含：

- PageSpeed API Key 不應被提交或意外外洩。
- Pro 模式應盡量由使用者瀏覽器直接呼叫 API。
- 分享報告功能不應暴露非預期資料。
- CSP 與第三方資源應維持最小必要範圍。
- 測試資料與範例報告應去識別化。

## Disclosure

收到回報後會先確認影響範圍，再安排修補與公開說明。若問題涉及第三方服務或平台限制，會在修補說明中標明。
