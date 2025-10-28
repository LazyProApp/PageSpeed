/**
 * Scores Renderer Module
 * Rules: Render score cards (Performance, Accessibility, Best Practices, SEO)
 */

import { getScoreLevel, formatScore } from './report-utils.js';

export class ScoresRenderer {
  constructor(animateNumberFn) {
    this.animateNumber = animateNumberFn;
  }

  renderScores(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileScores' : 'desktopScores';
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = data.lighthouseResult.categories;
    const list = [
      { key: 'performance', label: 'Performance', subtitle: '效能' },
      { key: 'accessibility', label: 'Accessibility', subtitle: '無障礙' },
      { key: 'best-practices', label: 'Best Practices', subtitle: '最佳做法' },
      { key: 'seo', label: 'SEO', subtitle: '搜尋引擎最佳化' }
    ];

    const scoreCardsHTML = list
      .map((cat, i) => {
        const score = Math.round((categories[cat.key]?.score || 0) * 100);
        const level = getScoreLevel(score / 100);
        return this.buildScoreCard(cat, score, level, i, strategy);
      })
      .join('');

    container.innerHTML = `
      <div class="scores-main-title">
        <span class="material-symbols-outlined">troubleshoot</span>
        <span>診斷效能問題</span>
      </div>
      <div class="scores-title-divider"></div>
      <div class="scores-grid-wrapper">
        ${scoreCardsHTML}
      </div>
    `;

    container.querySelectorAll('.score-card').forEach((card) => {
      delete card.dataset.animated;
    });

    this.setupScoreAnimation(container);
    container.style.display = 'grid';
  }

  replayAnimations(data, strategy) {
    const containerId =
      strategy === 'mobile' ? 'mobileScores' : 'desktopScores';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.score-card').forEach((card) => {
      delete card.dataset.animated;
      const circle = card.querySelector('.score-circle-progress');
      if (circle) {
        circle.classList.remove('animated');
        const circumference = parseFloat(circle.dataset.circumference);
        circle.style.strokeDashoffset = `${circumference}`;
      }
    });

    this.setupScoreAnimation(container);
  }

  buildScoreCard(cat, score, level, index, strategy) {
    const radius = 31;
    const circumference = 2 * Math.PI * radius;
    const gradientId = `gradient-${strategy}-${level}-${index}`;
    const colors = {
      good: { start: '#d0d0d0', end: '#a0a0a0' },
      average: { start: '#b0b0b0', end: '#909090' },
      poor: { start: '#909090', end: '#707070' }
    };
    const c = colors[level] || colors.good;

    return `
      <div class="score-card" data-level="${level}">
        <div class="score-card-content">
          <div class="score-title">
            <span class="crux-metric-badge ${level}"></span>
            ${cat.label}
          </div>
          <div class="score-circle">
            <svg viewBox="0 0 70 70">
              <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${c.start}" stop-opacity="1" />
                  <stop offset="100%" stop-color="${c.end}" stop-opacity="1" />
                </linearGradient>
              </defs>
              <circle class="score-circle-bg" cx="35" cy="35" r="${radius}"></circle>
              <circle class="score-circle-progress" cx="35" cy="35" r="${radius}"
                data-circumference="${circumference}" data-score="${score}"
                style="stroke: url(#${gradientId})"></circle>
            </svg>
            <div class="score-circle-text">
              <div class="score-number" data-target="${score}" data-unit="score">0</div>
            </div>
          </div>
        </div>
        <div class="score-subtitle">${cat.subtitle}</div>
      </div>
    `;
  }

  setupScoreAnimation(container) {
    requestAnimationFrame(() => {
      container.querySelectorAll('.score-circle-progress').forEach((circle) => {
        const circumference = parseFloat(circle.dataset.circumference);
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = `${circumference}`;
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            const scoreEl = entry.target.querySelector('.score-number');
            if (scoreEl) {
              const target = parseFloat(scoreEl.dataset.target);
              this.animateNumber(scoreEl, 0, target, 1500, formatScore);
            }
            const circle = entry.target.querySelector('.score-circle-progress');
            if (circle) {
              const score = parseFloat(circle.dataset.score);
              const circumference = parseFloat(circle.dataset.circumference);
              const offset = circumference - (score / 100) * circumference;
              circle.classList.add('animated');
              circle.style.strokeDashoffset = `${offset}`;
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    container
      .querySelectorAll('.score-card')
      .forEach((card) => observer.observe(card));
  }
}
