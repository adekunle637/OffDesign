import {
  clearNotifications,
  getNotifications,
  markNotificationsRead,
} from '../../services/notification.service.js';
import { hydrateIcons } from '../icon/icon.js';

export function notificationCenterMarkup() {
  return `
    <dialog class="notification-dialog" data-notifications-dialog aria-labelledby="notification-title">
      <div class="notification-dialog__surface">
        <div class="dialog-heading notification-dialog__heading">
          <div>
            <p class="eyebrow">Notification center</p>
            <h2 id="notification-title">Stay in the flow</h2>
          </div>
          <div class="notification-dialog__actions">
            <button class="text-button" type="button" data-notifications-clear>Clear</button>
            <button class="icon-button" type="button" data-dialog-close aria-label="Close notifications"><i data-lucide="x"></i></button>
          </div>
        </div>
        <div class="notification-list" data-notification-list></div>
      </div>
    </dialog>
    <div class="toast-region" data-toast-region aria-live="polite" aria-label="Workspace notifications"></div>
  `;
}

export function initializeNotificationCenter(root) {
  const list = root.querySelector('[data-notification-list]');
  const toastRegion = root.querySelector('[data-toast-region]');
  const dialog = root.querySelector('[data-notifications-dialog]');

  const render = () => {
    const notifications = getNotifications();
    if (!list) return;

    list.innerHTML = notifications.length
      ? notifications.map(notificationMarkup).join('')
      : `
        <div class="notification-empty">
          <i data-lucide="check-circle-2"></i>
          <div><strong>You're all caught up</strong><p>Helpful updates will appear here without interrupting your work.</p></div>
        </div>
      `;
    hydrateIcons(list);
  };

  const updateUnreadIndicator = () => {
    const unread = getNotifications().some((notification) => !notification.read);
    root.querySelectorAll('[data-notification-dot]').forEach((dot) => dot.toggleAttribute('hidden', !unread));
  };

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-notifications-clear]')) {
      clearNotifications();
      render();
      updateUnreadIndicator();
    }

    if (target?.closest('[data-notification-action="reload"]')) {
      window.location.reload();
    }
  });

  const handleNotification = (event) => {
    render();
    updateUnreadIndicator();
    if (event.detail && toastRegion) showToast(toastRegion, event.detail);
  };

  window.addEventListener('offdesign:notification', handleNotification);
  window.addEventListener('offdesign:notifications-cleared', render);
  window.addEventListener('offdesign:notifications-read', updateUnreadIndicator);
  dialog?.addEventListener('close', () => {
    markNotificationsRead();
    updateUnreadIndicator();
  });

  render();
  updateUnreadIndicator();
}

function notificationMarkup(notification) {
  return `
    <article class="notification-item notification-item--${notification.tone}">
      <span class="notification-item__icon"><i data-lucide="${notification.icon}"></i></span>
      <div class="notification-item__copy">
        <strong>${escapeHtml(notification.title)}</strong>
        <p>${escapeHtml(notification.message)}</p>
        <time datetime="${notification.createdAt}">${relativeTime(notification.createdAt)}</time>
      </div>
      ${
        notification.actionLabel
          ? `<button class="text-button" type="button" data-notification-action="${notification.action}">${escapeHtml(notification.actionLabel)}</button>`
          : ''
      }
    </article>
  `;
}

function showToast(region, notification) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${notification.tone}`;
  toast.innerHTML = `<i data-lucide="${notification.icon}"></i><div><strong>${escapeHtml(notification.title)}</strong><p>${escapeHtml(notification.message)}</p></div><button type="button" class="icon-button" aria-label="Dismiss notification"><i data-lucide="x"></i></button>`;
  region.prepend(toast);
  hydrateIcons(toast);

  const dismiss = () => {
    toast.classList.add('toast--leaving');
    window.setTimeout(() => toast.remove(), 180);
  };
  toast.querySelector('button')?.addEventListener('click', dismiss);
  window.setTimeout(dismiss, 5400);
}

function relativeTime(date) {
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : new Date(date).toLocaleDateString();
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}
