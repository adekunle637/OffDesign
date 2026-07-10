export function createOfflineStatus(mountPoint) {
  if (!mountPoint) {
    return;
  }

  const status = document.createElement('p');
  status.className = 'network-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const render = () => {
    const online = navigator.onLine;
    status.dataset.state = online ? 'online' : 'offline';
    status.textContent = online ? 'Online' : 'Offline mode';
  };

  window.addEventListener('online', render);
  window.addEventListener('offline', render);

  render();
  mountPoint.replaceChildren(status);
}
