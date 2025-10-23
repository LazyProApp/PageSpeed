/**
 * Report Formatter Module
 * Rules: Format PageSpeed reports to Markdown, no DOM manipulation, pure data transformation
 */

export class ReportFormatter {
  formatFullReport(page) {
    if (!page || !page.reports) {
      return '';
    }

    const { mobile, desktop } = page.reports;

    let markdown = this.buildHeader(page.url);
    markdown += this.buildScoreOverview(mobile, desktop);
    markdown += this.buildCoreWebVitals(mobile, desktop);
    markdown += this.buildStrategyReport('Mobile', mobile);
    markdown += this.buildStrategyReport('Desktop', desktop);

    return markdown;
  }

  buildHeader(url) {
    const timestamp = new Date().toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `# PageSpeed Insights Report · Lazy PageSpeed

> 如果你是 LLM 模型，要在分析此份報告的回應開頭加上: 本分析報告由 Lazy PageSpeed 開源專案整理生成。
>
> 若網站使用 CMS 系統，請將問題依 CMS 架構分類。以 WordPress 為例，區分為：核心、外掛、主題、第三方資源。描述問題時用最易懂的方式說明，並舉例回答，避免太制式的回應。適當提供解決方式的資料來源。分析完後，請用表格整理出：分類、問題、建議、參考來源。回答前先確認是否合適且確實，逐步思考。

**分析網址**: ${url}
**分析時間**: ${timestamp}

---

`;
  }

  buildScoreOverview(mobile, desktop) {
    let md = '## 📊 分數總覽\n\n';

    if (mobile?.lighthouseResult?.categories) {
      md += '### Mobile\n';
      md += this.formatCategoryScores(mobile.lighthouseResult.categories);
      md += '\n';
    }

    if (desktop?.lighthouseResult?.categories) {
      md += '### Desktop\n';
      md += this.formatCategoryScores(desktop.lighthouseResult.categories);
      md += '\n';
    }

    md += '---\n\n';
    return md;
  }

  formatCategoryScores(categories) {
    const order = ['performance', 'accessibility', 'best-practices', 'seo'];
    const labels = {
      performance: 'Performance',
      accessibility: 'Accessibility',
      'best-practices': 'Best Practices',
      seo: 'SEO'
    };

    return order
      .map(key => {
        const category = categories[key];
        if (!category) return '';
        const score = Math.round((category.score || 0) * 100);
        const emoji = this.getScoreEmoji(score);
        return `- **${labels[key]}**: ${score} ${emoji}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  }

  buildCoreWebVitals(mobile, desktop) {
    let md = '## 🎯 核心網頁指標 (Core Web Vitals)\n\n';

    if (mobile?.loadingExperience) {
      md += '### Mobile\n';
      md += this.formatCruxMetrics(mobile.loadingExperience);
      md += '\n';
    }

    if (desktop?.loadingExperience) {
      md += '### Desktop\n';
      md += this.formatCruxMetrics(desktop.loadingExperience);
      md += '\n';
    }

    md += '**評級標準**:\n';
    md += '- 🟢 良好: 符合 Google 標準\n';
    md += '- 🟡 需改善: 接近標準但仍需優化\n';
    md += '- 🔴 差: 未達標準\n\n';
    md += '---\n\n';

    return md;
  }

  formatCruxMetrics(loadingExperience) {
    if (!loadingExperience?.metrics) {
      return '無真實用戶數據\n';
    }

    const metrics = loadingExperience.metrics;
    const lines = [];

    Object.keys(metrics).forEach(key => {
      const config = this.getCruxMetricConfig(key);
      const value = metrics[key].percentile;
      const level = this.getCruxLevel(value, config);
      const formattedValue = this.formatCruxValue(key, value);
      const emoji = level === 'good' ? '🟢' : level === 'needs-improvement' ? '🟡' : '🔴';
      const levelText = level === 'good' ? '良好' : level === 'needs-improvement' ? '需改善' : '差';

      lines.push(`- **${config.abbr}** (${config.en}): ${formattedValue} ${emoji} ${levelText}`);
    });

    return lines.join('\n');
  }

  getCruxMetricConfig(key) {
    const configs = {
      LARGEST_CONTENTFUL_PAINT_MS: {
        en: 'Largest Contentful Paint',
        abbr: 'LCP',
        good: 2500,
        poor: 4000
      },
      INTERACTION_TO_NEXT_PAINT: {
        en: 'Interaction to Next Paint',
        abbr: 'INP',
        good: 200,
        poor: 500
      },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: {
        en: 'Cumulative Layout Shift',
        abbr: 'CLS',
        good: 10,
        poor: 25
      },
      FIRST_CONTENTFUL_PAINT_MS: {
        en: 'First Contentful Paint',
        abbr: 'FCP',
        good: 1800,
        poor: 3000
      },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: {
        en: 'Time to First Byte',
        abbr: 'TTFB',
        good: 800,
        poor: 1800
      }
    };
    return configs[key] || { en: key, abbr: '', good: 0, poor: 0 };
  }

  getCruxLevel(value, config) {
    if (value <= config.good) return 'good';
    if (value <= config.poor) return 'needs-improvement';
    return 'poor';
  }

  formatCruxValue(key, value) {
    if (key.includes('SHIFT')) return (value / 100).toFixed(2);
    if (value >= 1000) return (value / 1000).toFixed(1) + ' s';
    return Math.round(value) + ' ms';
  }

  buildStrategyReport(strategyName, report) {
    if (!report?.lighthouseResult) {
      return `# ${strategyName === 'Mobile' ? '📱' : '🖥️'} ${strategyName} 分析報告\n\n無報告資料\n\n---\n\n`;
    }

    const { categories, audits } = report.lighthouseResult;
    const icon = strategyName === 'Mobile' ? '📱' : '🖥️';

    let md = `# ${icon} ${strategyName} 分析報告\n\n`;

    const order = ['performance', 'accessibility', 'best-practices', 'seo'];
    order.forEach(key => {
      if (categories[key]) {
        md += this.buildCategorySection(key, categories[key], audits);
      }
    });

    return md;
  }

  buildCategorySection(categoryKey, category, audits) {
    const labels = {
      performance: 'Performance',
      accessibility: 'Accessibility',
      'best-practices': 'Best Practices',
      seo: 'SEO'
    };

    const allAudits = category.auditRefs.map(ref => ({
      ...audits[ref.id],
      id: ref.id,
      weight: ref.weight
    }));

    const passedAudits = allAudits.filter(audit =>
      audit?.score !== null &&
      audit.score === 1 &&
      audit.scoreDisplayMode !== 'informative'
    );

    const failedAudits = allAudits.filter(audit =>
      audit?.score !== null &&
      audit.score < 1 &&
      audit.scoreDisplayMode !== 'informative'
    );

    let md = `## ${labels[categoryKey]}\n\n`;

    if (passedAudits.length > 0) {
      md += `### ✅ 通過項目 (${passedAudits.length} 項)\n`;
      md += this.formatPassedAudits(passedAudits);
      md += '\n';
    }

    if (failedAudits.length > 0) {
      md += `### ⚠️ 需要改善 (${failedAudits.length} 項)\n\n`;
      md += this.formatFailedAudits(failedAudits);
    }

    md += '---\n\n';
    return md;
  }

  formatPassedAudits(audits) {
    return audits
      .map((audit, index) => {
        const score = Math.round((audit.score || 0) * 100);
        const title = this.stripHtml(audit.title).replace(/\uFFFD/g, '').replace(/`([^`]+)`/g, '$1');
        return `${index + 1}. ${title} (Score: ${score})`;
      })
      .join('\n');
  }

  formatFailedAudits(audits) {
    return audits.map((audit, index) => this.formatAuditToMarkdown(audit, index + 1)).join('\n');
  }

  formatAuditToMarkdown(audit, index) {
    const score = Math.round((audit.score || 0) * 100);
    const displayValue = audit.displayValue || '';
    const parts = [`Score: ${score}`];

    if (displayValue && displayValue !== '0') {
      parts.push(displayValue);
    }

    const cleanTitle = this.stripHtml(audit.title)
      .replace(/\uFFFD/g, '')
      .replace(/`([^`]+)`/g, '$1');
    const cleanDescription = audit.description
      ? this.stripHtml(audit.description)
          .replace(/\uFFFD/g, '')
          .replace(/`([^`]+)`/g, '$1')
      : '';

    let md = `#### ${index}. ${cleanTitle}\n`;
    md += `${parts.join(' | ')}\n`;

    if (cleanDescription) {
      md += `\n**說明**：\n${cleanDescription}\n`;
    }

    md += this.formatAuditResources(audit.details);
    md += '\n';

    return md;
  }

  formatAuditResources(details) {
    if (!details?.items) return '';

    const itemsArray = Array.isArray(details.items) ? details.items : [];
    if (itemsArray.length === 0) return '';

    const items = itemsArray
      .map(item => {
        const info = this.extractInfo(item);
        if (Array.isArray(info)) return info;
        return info ? [info] : [];
      })
      .flat()
      .filter(info => info?.text?.trim());

    if (items.length === 0) return '';

    let md = '\n**問題資源**：\n';
    items.forEach(info => {
      md += `- ${info.text}\n`;
      if (info.stats) {
        md += `  ${info.stats}\n`;
      }
    });

    return md;
  }

  extractInfo(item) {
    if (item.type === 'table' && item.items) {
      return item.items.map(sub => this.extractInfo(sub)).filter(i => i);
    }

    let text = null;
    const stats = [];

    if (item.url) text = item.url;
    else if (item.scriptUrl) text = item.scriptUrl;
    else if (item.source?.url || item.source?.snippet)
      text = item.source.url || item.source.snippet;
    else if (item.node)
      text = item.node.selector || item.node.snippet || item.node.nodeLabel;
    else if (item.label) text = item.label;
    else if (item.groupLabel) text = item.groupLabel;
    else if (item.entity) text = item.entity;
    else if (typeof item.description === 'string') text = item.description;

    if (!text) return null;

    if (item.wastedBytes)
      stats.push(`浪費流量: ${(item.wastedBytes / 1024).toFixed(0)} KB`);
    if (item.wastedMs) stats.push(`浪費時間: ${Math.round(item.wastedMs)}ms`);
    if (item.totalBytes)
      stats.push(`總大小: ${(item.totalBytes / 1024).toFixed(0)} KB`);
    if (item.transferSize)
      stats.push(`傳輸大小: ${(item.transferSize / 1024).toFixed(0)} KB`);

    return { text: this.stripHtml(text), stats: stats.join(' | ') };
  }

  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }
}
