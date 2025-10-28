/**
 * Screenshot Renderer Module
 * Rules: Render screenshot sections in report dialog
 */

/**
 * Render final screenshot
 */
export function renderFinalScreenshot(data, strategy) {
  const containerId =
    strategy === 'mobile'
      ? 'mobileFinalScreenshot'
      : 'desktopFinalScreenshot';
  const container = document.getElementById(containerId);
  if (!container) return;

  const screenshot =
    data.lighthouseResult.audits['final-screenshot']?.details?.data;
  if (screenshot) {
    container.innerHTML = `
      <div class="screenshot-wrapper">
        <img src="${screenshot}" alt="Final Screenshot" style="opacity: 0;">
      </div>
    `;

    const img = container.querySelector('img');
    const wrapper = container.querySelector('.screenshot-wrapper');

    img.onload = () => {
      wrapper.classList.add('animate');
    };

    img.onerror = () => {
      wrapper.innerHTML = '<p style="color: #CAC4D0;">圖片載入失敗</p>';
    };
  }
}

/**
 * Render screenshot thumbnails timeline
 */
export function renderScreenshotThumbnails(data, strategy) {
  const containerId =
    strategy === 'mobile'
      ? 'mobileScreenshotThumbnails'
      : 'desktopScreenshotThumbnails';
  const container = document.getElementById(containerId);
  if (!container) return;

  const thumbnails = data.lighthouseResult.audits['screenshot-thumbnails'];
  if (thumbnails?.details?.items) {
    const items = thumbnails.details.items;
    const html = items
      .map((item, index) => {
        const timeInSeconds = (item.timing / 1000).toFixed(1);
        const finalOpacity = 0.3 + (index / (items.length - 1)) * 0.7;
        return `
          <div class="screenshot-thumbnail" style="animation-delay: ${index * 0.1}s; --final-opacity: ${finalOpacity.toFixed(2)};">
            <div class="screenshot-img-wrapper">
              <img src="${item.data}" alt="Screenshot at ${timeInSeconds}s">
            </div>
            <div class="screenshot-time">${timeInSeconds} s</div>
          </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="screenshot-section-title">頁面載入過程</div>
      <div class="screenshot-thumbnails-wrapper">
        <div class="screenshot-thumbnails">
          ${html}
        </div>
      </div>
    `;

    setupThumbnailsAnimation(container);

    const sectionCard = container.closest('.section-card');
    if (sectionCard) sectionCard.style.display = 'block';
  }
}

function setupThumbnailsAnimation(container) {
  const wrapper = container.querySelector('.screenshot-thumbnails-wrapper');
  if (!wrapper) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          wrapper.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '100px 0px 0px 0px'
    }
  );

  observer.observe(wrapper);
}
