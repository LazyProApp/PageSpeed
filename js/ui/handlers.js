/**
 * UI Handlers Module
 * Rules:
 * - Handle user interactions, trigger Controller via COMMAND events
 * - Listen to EventBus events, update UI accordingly
 * - No business logic, pure UI event handling
 */

import { EVENTS } from '../core/events.js';

export class UIHandlers {
  constructor(eventBus, dialogs) {
    this.eventBus = eventBus;
    this.dialogs = dialogs;
    this.elementCache = new Map();
    this.domEventListeners = [];
    this.eventUnsubscribers = [];
    this.isDestroyed = false;
    this.dialogHandlerBound = false;
    this.originalUrl = null;
  }

  setupEventListeners() {
    this.setupDOMEventListeners();
    this.setupEventBusListeners();
    this.initScrollEffects();
  }

  setupDOMEventListeners() {
    this.addDOMListener('addNewBtn', 'click', () => this.handleAddURL());
    this.addDOMListener('mobileNewBtn', 'click', () => this.handleAddURL());

    this.addDOMListener('uploadBtn', 'click', () => this.openFilePicker());
    this.addDOMListener('fileInput', 'change', (e) => this.handleFileUpload(e));

    this.addDOMListener('downloadMenuItem', 'click', () => this.handleExport());
    this.addDOMListener('mobileDownloadMenuItem', 'click', () =>
      this.handleExport()
    );

    this.addDOMListener('clearDataMenuItem', 'click', () =>
      this.handleClearAll()
    );
    this.addDOMListener('mobileClearMenuItem', 'click', () =>
      this.handleClearAll()
    );

    // Strategy selection removed - always analyze both mobile and desktop

    this.addDOMListener('wordpressModeBtn', 'click', () =>
      this.handleToggleWordPressMode()
    );
    this.addDOMListener('proModeBtn', 'click', () =>
      this.handleToggleProMode()
    );

    this.addDOMListener('actionBtn', 'click', () => this.handleActionButton());
    this.addDOMListener('actionBtnText', 'click', () =>
      this.handleActionButtonText()
    );
    this.addDOMListener('actionBtnStop', 'click', () =>
      this.handleActionButtonStop()
    );

    this.addDOMListener('shareBtn', 'click', () => this.handleShare());
    this.addDOMListener('mobileShareBtn', 'click', () => this.handleShare());
    this.addDOMListener('closeShareDialogBtn', 'click', () =>
      this.closeShareDialog()
    );

    this.addDOMListener('newUrlInput', 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddUrlConfirm();
      }
    });

    this.addDOMListener('moreActionsBtn', 'click', () =>
      this.toggleMoreActions()
    );
    this.addDOMListener('mobileMoreBtn', 'click', () =>
      this.toggleMobileMore()
    );

    this.setupFilterTabs();
    this.setupAddUrlDialog();
  }


  setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach((tab) => {
      const handler = () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const status = tab.getAttribute('data-status');
        this.eventBus.emit(EVENTS.UI.FILTER_CHANGED, { filter: status });
      };
      tab.addEventListener('click', handler);
      this.domEventListeners.push({ element: tab, event: 'click', handler });
    });
  }

  setupEventBusListeners() {
    this.addEventListener(EVENTS.DOMAIN.CONFIG_UPDATED, (config) =>
      this.updateUI(config)
    );

    this.addEventListener(EVENTS.PROCESS.BATCH_STARTED, (data) =>
      this.showProgress(data)
    );
    this.addEventListener(EVENTS.PROCESS.BATCH_PROGRESS, (data) =>
      this.updateProgress(data)
    );
    this.addEventListener(EVENTS.PROCESS.BATCH_COMPLETED, () =>
      this.hideProgress()
    );
    this.addEventListener(EVENTS.PROCESS.BATCH_ABORTED, () =>
      this.hideProgress()
    );

    this.addEventListener(EVENTS.SYSTEM.PARSING_STARTED, () =>
      this.showTableProgress()
    );
    this.addEventListener(EVENTS.SYSTEM.PARSING_ENDED, () =>
      this.hideTableProgress()
    );

    this.addEventListener(EVENTS.SYSTEM.DOWNLOAD_REQUESTED, (data) =>
      this.triggerDownload(data)
    );

    this.addEventListener(EVENTS.UI.UPDATE_BUTTON, (data) =>
      this.handleUpdateButton(data)
    );

    this.addEventListener(EVENTS.UI.DIALOG_OPENED, (data) =>
      this.handleDialogOpened(data)
    );

    this.addEventListener(EVENTS.APP_EVENTS.SCROLL_STATE_CHANGED, (data) =>
      this.handleScrollStateChange(data)
    );
  }

  handleUpdateButton(data) {
    if (data.action === 'update_action_button') {
      this.updateActionButtonFromState(data);
    }
  }

  updateActionButtonFromState(buttonState) {
    const { isProcessing, showSend, showStart, showStop, canStart, canSend } =
      buttonState;

    const actionBtn = this.getElement('actionBtn');
    const actionBtnText = this.getElement('actionBtnText');
    const actionBtnStop = this.getElement('actionBtnStop');

    if (actionBtn) actionBtn.style.display = 'none';
    if (actionBtnText) actionBtnText.style.display = 'none';
    if (actionBtnStop) actionBtnStop.style.display = 'none';

    if (isProcessing && showStop) {
      this.showStopBtn(actionBtnStop);
      return;
    }

    if (showStart) {
      this.showStartBtn(actionBtnText, canStart);
      return;
    }

    if (showSend) {
      this.showSendBtn(actionBtn, canSend);
    }
  }

  showStopBtn(btn) {
    if (!btn) return;
    btn.style.display = 'inline-flex';
    btn.classList.remove('disabled');
  }

  showStartBtn(btn, canStart) {
    if (!btn) return;
    btn.style.display = 'inline-flex';
    btn.disabled = !canStart;
  }

  showSendBtn(btn, canSend) {
    if (!btn) return;
    btn.style.display = 'inline-flex';
    if (canSend) {
      btn.classList.remove('disabled');
    } else {
      btn.classList.add('disabled');
    }
  }

  // ===== DOM Event Handlers =====

  setupAddUrlDialog() {
    if (this.dialogHandlerBound) return;

    const dialog = this.getElement('addUrlDialog');
    if (!dialog) return;

    this.handleDialogClick = (e) => {
      const btn = e.target.closest('md-icon-button');
      if (!btn) return;

      if (btn.id === 'closeAddUrlBtn') {
        dialog.close();
      } else if (btn.id === 'confirmAddUrlBtn') {
        this.handleAddUrlConfirm();
      }
    };

    this.handleDialogClose = () => {
      const input = this.getElement('newUrlInput');
      if (!input) return;

      this.originalUrl = null;

      setTimeout(() => {
        input.error = false;
        input.setCustomValidity('');
      }, 0);

      this.dialogs.removeDialogBlurEffect();
    };

    dialog.addEventListener('click', this.handleDialogClick);
    dialog.addEventListener('close', this.handleDialogClose);
    this.dialogHandlerBound = true;
  }

  handleAddURL() {
    const dialog = this.getElement('addUrlDialog');
    const input = this.getElement('newUrlInput');

    if (!dialog || !input) return;

    this.originalUrl = null;
    input.value = '';

    setTimeout(() => {
      input.error = false;
      input.setCustomValidity('');
    }, 100);

    this.dialogs.applyDialogBlurEffect();
    dialog.show();
  }

  handleEditURLDialog(url) {
    const dialog = this.getElement('addUrlDialog');
    const input = this.getElement('newUrlInput');

    if (!dialog || !input) return;

    this.originalUrl = url;
    input.value = url;

    setTimeout(() => {
      input.error = false;
      input.setCustomValidity('');
    }, 100);

    this.dialogs.applyDialogBlurEffect();
    dialog.show();
  }

  handleAddUrlConfirm() {
    const dialog = this.getElement('addUrlDialog');
    const input = this.getElement('newUrlInput');

    const rawValue = (input.value ?? '').trim();

    if (!rawValue) {
      input.setCustomValidity('此欄位為必填');
      input.error = true;
      return;
    }

    input.setCustomValidity('');
    if (!input.checkValidity()) {
      const msg = input.getAttribute('error-text') ?? '請輸入有效的網址';
      input.setCustomValidity(msg);
      input.error = true;
      return;
    }

    input.setCustomValidity('');
    input.error = false;

    const url = rawValue.replace(/\s+/g, '');

    if (this.originalUrl && this.originalUrl !== url) {
      this.eventBus.emit(EVENTS.COMMAND.UPDATE_URL, {
        oldUrl: this.originalUrl,
        newUrl: url
      });
    } else if (!this.originalUrl) {
      const isSitemap =
        url.toLowerCase().includes('sitemap') &&
        url.toLowerCase().endsWith('.xml');

      this.eventBus.emit(
        isSitemap ? EVENTS.COMMAND.PARSE_SITEMAP : EVENTS.COMMAND.ADD_URL,
        { url }
      );
    }

    this.originalUrl = null;
    input.value = '';
    dialog.close();
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      this.eventBus.emit(EVENTS.COMMAND.IMPORT_DATA, { jsonData });

      const dataSource = this.getElement('dataSource');
      if (dataSource) {
        dataSource.value = file.name;
      }
    } catch (error) {
      this.eventBus.emit(EVENTS.SYSTEM.ALERT_REQUESTED, {
        title: '匯入失敗',
        message: `JSON 檔案解析失敗：${error.message}`
      });
    }
  }


  handleToggleWordPressMode() {
    this.eventBus.emit(EVENTS.COMMAND.TOGGLE_WORDPRESS_MODE, {});
  }

  handleToggleProMode() {
    this.eventBus.emit(EVENTS.COMMAND.TOGGLE_PRO_MODE, {});
  }

  handleActionButton() {
    const actionBtn = this.getElement('actionBtn');
    if (
      actionBtn &&
      (actionBtn.disabled || actionBtn.classList.contains('disabled'))
    ) {
      return;
    }

    this.eventBus.emit(EVENTS.COMMAND.START_ANALYSIS, {});
  }

  handleActionButtonText() {
    const actionBtnText = this.getElement('actionBtnText');
    if (
      actionBtnText &&
      (actionBtnText.disabled || actionBtnText.classList.contains('disabled'))
    ) {
      return;
    }

    this.eventBus.emit(EVENTS.COMMAND.START_ANALYSIS, {});
  }

  handleActionButtonStop() {
    this.eventBus.emit(EVENTS.COMMAND.STOP_ANALYSIS, {});
  }

  showPlayButton() {
    const actionBtn = this.getElement('actionBtn');
    const actionBtnText = this.getElement('actionBtnText');
    const actionBtnStop = this.getElement('actionBtnStop');

    if (actionBtn) actionBtn.style.display = 'inline-flex';
    if (actionBtnText) actionBtnText.style.display = 'none';
    if (actionBtnStop) actionBtnStop.style.display = 'none';
  }

  showStartButton(enabled = true) {
    const actionBtn = this.getElement('actionBtn');
    const actionBtnText = this.getElement('actionBtnText');
    const actionBtnStop = this.getElement('actionBtnStop');

    if (actionBtn) actionBtn.style.display = 'none';
    if (actionBtnText) {
      actionBtnText.style.display = 'inline-flex';
      actionBtnText.disabled = !enabled;
    }
    if (actionBtnStop) actionBtnStop.style.display = 'none';
  }

  showStopButton() {
    const actionBtn = this.getElement('actionBtn');
    const actionBtnText = this.getElement('actionBtnText');
    const actionBtnStop = this.getElement('actionBtnStop');

    if (actionBtn) actionBtn.style.display = 'none';
    if (actionBtnText) actionBtnText.style.display = 'none';
    if (actionBtnStop) actionBtnStop.style.display = 'inline-flex';
  }

  handleExport() {
    this.eventBus.emit(EVENTS.COMMAND.EXPORT_DATA, {});
  }

  handleClearAll() {
    this.eventBus.emit(EVENTS.UI.CONFIRM_REQUESTED, {
      title: '清空所有資料',
      message: '確定要清空所有網址和報告嗎？',
      onConfirm: () => {
        this.eventBus.emit(EVENTS.COMMAND.CLEAR_ALL, {});
      }
    });
  }

  // ===== EventBus Event Handlers =====

  updateUI(config) {
    if (config.wordpressMode !== undefined) {
      this.updateWordPressModeUI(config.wordpressMode);
    }
    if (config.proMode !== undefined) {
      this.updateProModeUI(config.proMode);
    }
  }

  updateWordPressModeUI(enabled) {
    const btn = this.getElement('wordpressModeBtn');
    if (btn) {
      if (enabled) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    }
  }

  updateProModeUI(enabled) {
    const btn = this.getElement('proModeBtn');
    if (btn) {
      if (enabled) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    }
  }

  showProgress(data) {
    const progress = this.getElement('fetchProgress');
    if (progress) {
      progress.style.display = 'block';
    }
  }

  updateProgress(data) {
    const { current, total, completed, failed } = data;
    const progressText = `Processing: ${current}/${total} (${completed} completed, ${failed} failed)`;
    console.log(progressText);
  }

  hideProgress() {
    const progress = this.getElement('fetchProgress');
    if (progress) {
      progress.style.display = 'none';
    }
  }

  showTableProgress() {
    const progress = this.getElement('tableProgress');
    if (progress) {
      progress.style.display = 'block';
    }
  }

  hideTableProgress() {
    const progress = this.getElement('tableProgress');
    if (progress) {
      progress.style.display = 'none';
    }
  }

  triggerDownload(payload) {
    const { filename, data, type } = payload;

    const blob = new Blob([data], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // ===== UI Helper Methods =====

  openFilePicker() {
    const fileInput = this.getElement('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }


  toggleMoreActions() {
    const menu = this.getElement('moreActionsMenu');
    if (menu) {
      menu.open = !menu.open;
    }
  }

  toggleMobileMore() {
    const menu = this.getElement('mobileMoreMenu');
    if (menu) {
      menu.open = !menu.open;
    }
  }

  // ===== Element Cache =====

  getElement(id) {
    if (this.isDestroyed) return null;

    if (this.elementCache.has(id)) {
      return this.elementCache.get(id);
    }

    const element = document.getElementById(id);
    if (element) {
      this.elementCache.set(id, element);
    }

    return element;
  }

  // ===== Event Listener Management =====

  addDOMListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, handler);
      this.domEventListeners.push({ element, event, handler });
    }
  }

  addEventListener(eventName, handler) {
    const unsubscribe = this.eventBus.on(eventName, handler);
    this.eventUnsubscribers.push(unsubscribe);
  }

  // ===== Cleanup =====

  handleShare() {
    this.eventBus.emit(EVENTS.COMMAND.CREATE_SHARE);
  }

  closeShareDialog() {
    const dialog = this.getElement('shareSuccessDialog');
    if (dialog) {
      dialog.close();
    }
  }

  handleDialogOpened(data) {
    if (!data || !data.dialogId) return;

    if (data.dialogId === 'addUrlDialog' && data.data?.mode === 'edit') {
      this.handleEditURLDialog(data.data.url);
    } else if (data.dialogId === 'shareSuccessDialog' && data.data) {
      const dialog = this.getElement('shareSuccessDialog');
      if (!dialog) return;

      const urlInput = this.getElement('shareUrlInput');

      if (urlInput) {
        urlInput.value = data.data.shareUrl;
      }

      const shareButtons = dialog.querySelectorAll('.share-icon-btn');
      shareButtons.forEach(btn => {
        const oldHandler = btn._shareHandler;
        if (oldHandler) {
          btn.removeEventListener('click', oldHandler);
        }

        const newHandler = () => {
          const platform = btn.getAttribute('data-platform');
          const urlInput = this.getElement('shareUrlInput');
          const shareUrl = urlInput ? urlInput.value : data.data.shareUrl;
          this.handleSharePlatform(platform, shareUrl, btn);
        };

        btn.addEventListener('click', newHandler);
        btn._shareHandler = newHandler;
      });

      if (!dialog.hasAttribute('data-close-listener')) {
        dialog.addEventListener('close', () => {
          this.dialogs.removeDialogBlurEffect();
        });
        dialog.setAttribute('data-close-listener', 'true');
      }

      this.dialogs.applyDialogBlurEffect();
      dialog.show();
    }
  }

  handleSharePlatform(platform, shareUrl, btn) {
    const text = 'PageSpeed 效能報告';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
        break;
      case 'line':
        window.open(`https://line.me/R/msg/text/?${encodedText}%20${encodedUrl}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl).then(() => {
          const icon = btn.querySelector('md-icon');
          const originalIcon = icon.textContent;
          icon.textContent = 'check';
          setTimeout(() => {
            icon.textContent = originalIcon;
          }, 2000);
        });
        break;
    }
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    this.eventUnsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.eventUnsubscribers.length = 0;

    this.domEventListeners.forEach(({ element, event, handler }) => {
      if (element) {
        element.removeEventListener(event, handler);
      }
    });
    this.domEventListeners.length = 0;

    const dialog = this.getElement('addUrlDialog');
    if (dialog) {
      if (this.handleDialogClick) {
        dialog.removeEventListener('click', this.handleDialogClick);
      }
      if (this.handleDialogClose) {
        dialog.removeEventListener('close', this.handleDialogClose);
      }
    }

    if (this.scrollEffectsHandler && this.scrollContainer) {
      if (this.scrollContainer === window) {
        window.removeEventListener('scroll', this.scrollEffectsHandler);
      }
    }

    this.elementCache.clear();

    this.eventBus = null;
  }

  initScrollEffects() {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const isScrolled = scrollTop > 10;

      this.eventBus.emit(EVENTS.APP_EVENTS.SCROLL_STATE_CHANGED, {
        isScrolled,
        scrollTop
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    this.scrollEffectsHandler = handleScroll;
    this.scrollContainer = window;
  }

  handleScrollStateChange(data) {
    const { isScrolled } = data;

    if (isScrolled) {
      document.body.classList.add('scrolled');
    } else {
      document.body.classList.remove('scrolled');
    }
  }
}
