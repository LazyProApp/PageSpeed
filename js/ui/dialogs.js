/**
 * Dialogs UI Module (Refactored Version)
 * Rules: Manage all dialogs (Report, Alert, Confirm)
 */

import { EVENTS } from '../core/events.js';
import { logger } from '../utils/logger.js';
import { ReportDialog } from './report/report-dialog.js';

export class Dialogs {
  constructor(eventBus, dataEngine) {
    this.eventBus = eventBus;
    this.dataEngine = dataEngine;
    this.reportDialogElement = document.getElementById('reportDialog');
    this.reportDialogHandlerBound = false;

    window.dialogs = this;
    this.reportDialog = new ReportDialog(this.reportDialogElement);
  }

  setupEventListeners() {
    this.setupReportDialog();

    this.eventBus.on(EVENTS.SYSTEM.ALERT_REQUESTED, (data) => {
      this.showAlert(data.title, data.message);
    });

    this.eventBus.on(EVENTS.SYSTEM.ERROR, (data) => {
      this.showAlert('錯誤', data.message);
    });

    this.eventBus.on(EVENTS.UI.CONFIRM_REQUESTED, (data) => {
      this.showConfirm(data.title, data.message, data.onConfirm, data.icon);
    });

    this.eventBus.on(EVENTS.UI.DIALOG_OPENED, (data) => {
      if (data.dialogId === 'reportDialog' && data.data) {
        this.showReport(data.data);
      }
    });
  }

  setupReportDialog() {
    if (this.reportDialogHandlerBound || !this.reportDialogElement) return;

    this.handleReportDialogClick = (e) => {
      const btn = e.target.closest('md-icon-button');
      if (btn) {
        const action = btn.getAttribute('value');
        if (action === 'cancel') {
          this.reportDialogElement.close();
        }
      }
    };

    this.handleReportDialogClose = () => {
      this.removeDialogBlurEffect();
    };

    this.reportDialogElement.addEventListener('click', this.handleReportDialogClick);
    this.reportDialogElement.addEventListener('close', this.handleReportDialogClose);

    this.reportDialogHandlerBound = true;
  }

  applyDialogBlurEffect() {
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.classList.add('dialog-blur');
    }

    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
      statsSection.classList.add('dialog-blur');
    }

    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.add('dialog-blur');
    }
  }

  removeDialogBlurEffect() {
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.classList.remove('dialog-blur');
    }

    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
      statsSection.classList.remove('dialog-blur');
    }

    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.classList.remove('dialog-blur');
    }
  }

  showAlert(title, message) {
    this.showAlertDialog(title, message, '確定', 'warning');
  }

  showConfirm(title, message, onConfirm, icon = 'delete') {
    this.showConfirmDialog(title, message, '確定', '取消', icon).then(
      (result) => {
        if (result && typeof onConfirm === 'function') {
          onConfirm();
        }
      }
    );
  }

  showAlertDialog(title, message, confirmText = '確定', icon = 'warning') {
    return new Promise((resolve) => {
      const alertDialog = document.createElement('md-dialog');
      alertDialog.setAttribute('type', 'alert');
      alertDialog.className = 'confirm-dialog';

      alertDialog.innerHTML = `
        <div slot="content" class="confirm-content">
          <md-icon class="confirm-icon">${icon}</md-icon>
          <h2 class="confirm-title"></h2>
          <p class="confirm-message"></p>
        </div>
        <div slot="actions">
          <md-text-button class="confirm-btn"></md-text-button>
        </div>
      `;

      document.body.appendChild(alertDialog);

      alertDialog.querySelector('.confirm-title').textContent = title;
      alertDialog.querySelector('.confirm-message').textContent = message;
      alertDialog.querySelector('.confirm-btn').textContent = confirmText;

      const confirmBtn = alertDialog.querySelector('.confirm-btn');

      confirmBtn.addEventListener('click', async () => {
        await alertDialog.close('confirm');
      });

      alertDialog.addEventListener('closed', () => {
        this.removeDialogBlurEffect();

        if (alertDialog.parentNode) {
          alertDialog.parentNode.removeChild(alertDialog);
        }

        const result = alertDialog.returnValue === 'confirm';
        resolve(result);
      });

      this.applyDialogBlurEffect();
      alertDialog.show();
      logger.debug('Alert shown', { title });
    });
  }

  showConfirmDialog(
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    icon = 'delete'
  ) {
    return new Promise((resolve) => {
      const confirmDialog = document.createElement('md-dialog');
      confirmDialog.setAttribute('type', 'alert');
      confirmDialog.className = 'confirm-dialog';

      confirmDialog.innerHTML = `
        <div slot="content" class="confirm-content">
          <md-icon class="confirm-icon">${icon}</md-icon>
          <h2 class="confirm-title"></h2>
          <p class="confirm-message"></p>
        </div>
        <div slot="actions">
          <md-text-button class="cancel-btn"></md-text-button>
          <md-text-button class="confirm-btn"></md-text-button>
        </div>
      `;

      document.body.appendChild(confirmDialog);

      confirmDialog.querySelector('.confirm-title').textContent = title;
      confirmDialog.querySelector('.confirm-message').textContent = message;
      confirmDialog.querySelector('.cancel-btn').textContent = cancelText;
      confirmDialog.querySelector('.confirm-btn').textContent = confirmText;

      const confirmBtn = confirmDialog.querySelector('.confirm-btn');
      const cancelBtn = confirmDialog.querySelector('.cancel-btn');

      confirmBtn.addEventListener('click', async () => {
        await confirmDialog.close('confirm');
      });

      cancelBtn.addEventListener('click', async () => {
        await confirmDialog.close('cancel');
      });

      confirmDialog.addEventListener('closed', () => {
        this.removeDialogBlurEffect();

        if (confirmDialog.parentNode) {
          confirmDialog.parentNode.removeChild(confirmDialog);
        }

        const result = confirmDialog.returnValue === 'confirm';
        resolve(result);
      });

      this.applyDialogBlurEffect();
      confirmDialog.show();
      logger.debug('Confirm shown', { title });
    });
  }

  showReport(page) {
    if (!page?.url) {
      logger.warn('Invalid page parameter');
      return;
    }

    if (!page.reports || (!page.reports.mobile && !page.reports.desktop)) {
      this.showAlert('報告無法使用', '此網址沒有報告');
      return;
    }

    this.applyDialogBlurEffect();
    this.reportDialog.showReport(page);
    logger.debug('Report shown', { url: page.url });
  }
}
