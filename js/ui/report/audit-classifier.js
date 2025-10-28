/**
 * Audit Classifier Module
 * Rules: Pure data classification logic, no rendering
 *
 * 職責：從 auditRefs 中分類 audits
 * - Performance: insights, diagnostics, passed
 * - Generic: 各分組的 failed/passed、special (manual/notApplicable/passed)
 *
 * 原則：
 * 1. 只處理資料分類，不涉及 DOM 或 Markdown 產出
 * 2. UI 和 Report 都使用此模組確保邏輯一致
 * 3. 符合物理邊界原則：資料層獨立於呈現層
 */

import { showAsPassed } from './report-utils.js';

/**
 * 分類 Performance audits
 * @param {Object} category - Performance category
 * @param {Object} audits - All audits
 * @returns {Object} { insights, diagnostics, passed }
 */
export function classifyPerformanceAudits(category, audits) {
  const insightsRefs = category.auditRefs.filter(
    (ref) => ref.group === 'insights'
  );
  const diagnosticsRefs = category.auditRefs.filter(
    (ref) => ref.group === 'diagnostics'
  );

  const insights = insightsRefs
    .map((ref) => ({
      ...audits[ref.id],
      id: ref.id,
      weight: ref.weight,
      acronym: ref.acronym
    }))
    .filter((a) => a)
    .filter((insight) => !showAsPassed(insight));

  const diagnostics = diagnosticsRefs
    .map((ref) => ({
      ...audits[ref.id],
      id: ref.id,
      weight: ref.weight,
      acronym: ref.acronym
    }))
    .filter((a) => a)
    .filter((audit) => !showAsPassed(audit));

  const allRefs = [...insightsRefs, ...diagnosticsRefs];
  const passed = allRefs
    .map((ref) => ({
      ...audits[ref.id],
      id: ref.id,
      weight: ref.weight,
      acronym: ref.acronym
    }))
    .filter((a) => a)
    .filter((audit) => showAsPassed(audit));

  return {
    insights,
    diagnostics,
    passed
  };
}

/**
 * 排序 group order（與 UI 一致）
 */
function sortGroupOrder(groupOrder, categoryKey) {
  const preferredOrder = {
    'best-practices': [
      'best-practices-general',
      'best-practices-trust-safety',
      'best-practices-ux',
      'best-practices-browser-compat'
    ],
    accessibility: [
      'a11y-color-contrast',
      'a11y-names-labels',
      'a11y-navigation',
      'a11y-best-practices',
      'a11y-aria',
      'a11y-language',
      'a11y-audio-video',
      'a11y-tables-lists'
    ],
    seo: ['seo-mobile', 'seo-content', 'seo-crawl']
  };

  const order = preferredOrder[categoryKey];
  if (!order) {
    return groupOrder;
  }

  return groupOrder.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
}

/**
 * 分類 Generic audits (Accessibility/Best Practices/SEO)
 * @param {Object} category - Category object
 * @param {Object} audits - All audits
 * @param {String} categoryKey - Category key (for sorting)
 * @returns {Object} { auditsByGroup, groupOrder, special }
 */
export function classifyGenericAudits(category, audits, categoryKey = null) {
  const auditsByGroup = {};
  const groupOrder = [];
  const special = { manual: [], notApplicable: [], passed: [] };

  category.auditRefs.forEach((ref) => {
    const audit = audits[ref.id];
    if (!audit) return;

    const auditData = { ...audit, id: ref.id, weight: ref.weight };

    // Special types
    if (audit.scoreDisplayMode === 'manual') {
      special.manual.push(auditData);
      return;
    }
    if (audit.scoreDisplayMode === 'notApplicable') {
      special.notApplicable.push(auditData);
      return;
    }

    // Hidden group 不處理
    if (ref.group === 'hidden') return;

    const group = ref.group || 'no-group';
    if (!auditsByGroup[group]) {
      auditsByGroup[group] = { nonPassed: [], passed: [] };
      groupOrder.push(group);
    }

    // informative 算失敗（即使 score=1）
    if (audit.scoreDisplayMode === 'informative') {
      auditsByGroup[group].nonPassed.push(auditData);
    } else if (audit.score === 1) {
      auditsByGroup[group].passed.push(auditData);
      special.passed.push(auditData);
    } else {
      auditsByGroup[group].nonPassed.push(auditData);
    }
  });

  // 排序 groupOrder（與 UI 一致）
  const sortedGroupOrder = categoryKey ? sortGroupOrder(groupOrder, categoryKey) : groupOrder;

  return {
    auditsByGroup,
    groupOrder: sortedGroupOrder,
    special
  };
}
