const storageKey = 'offdesign:notifications';
const maxNotifications = 24;

export function createNotification({ title, message, tone = 'info', icon, actionLabel, action }) {
  const notification = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    message,
    tone,
    icon: icon ?? iconForTone(tone),
    actionLabel,
    action,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const notifications = [notification, ...readNotifications()].slice(0, maxNotifications);
  writeNotifications(notifications);
  window.dispatchEvent(new CustomEvent('offdesign:notification', { detail: notification }));
  return notification;
}

export function getNotifications() {
  return readNotifications();
}

export function markNotificationsRead() {
  const notifications = readNotifications().map((notification) => ({ ...notification, read: true }));
  writeNotifications(notifications);
  window.dispatchEvent(new CustomEvent('offdesign:notifications-read'));
}

export function clearNotifications() {
  writeNotifications([]);
  window.dispatchEvent(new CustomEvent('offdesign:notifications-cleared'));
}

export const notifyProjectSaved = () =>
  createNotification({
    title: 'Project saved',
    message: 'Your latest changes are safely stored on this device.',
    tone: 'success',
    icon: 'save',
  });

export const notifyOfflineMode = () =>
  createNotification({
    title: 'Offline mode active',
    message: 'Keep creating — your workspace remains available locally.',
    tone: 'info',
    icon: 'cloud-off',
  });

export const notifyUpdateAvailable = () =>
  createNotification({
    title: 'Update available',
    message: 'A newer version of OffDesign is ready when you are.',
    tone: 'info',
    icon: 'refresh-cw',
    actionLabel: 'Refresh',
    action: 'reload',
  });

export const notifyExportCompleted = () =>
  createNotification({
    title: 'Export completed',
    message: 'Your design export is ready.',
    tone: 'success',
    icon: 'download',
  });

export const notifyBackupCompleted = () =>
  createNotification({
    title: 'Backup completed',
    message: 'Your local project backup has been prepared.',
    tone: 'success',
    icon: 'archive-restore',
  });

export const notifyError = (message = 'Something went wrong. Please try again.') =>
  createNotification({ title: 'Action needed', message, tone: 'error', icon: 'circle-alert' });

export const notifySuccess = (title, message) =>
  createNotification({ title, message, tone: 'success', icon: 'check-circle-2' });

function iconForTone(tone) {
  return tone === 'success' ? 'check-circle-2' : tone === 'error' ? 'circle-alert' : 'bell-ring';
}

function readNotifications() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeNotifications(notifications) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  } catch {
    // Notification history is non-essential; the live notification still appears.
  }
}
