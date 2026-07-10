import { appConfig } from '../config/app.config.js';

export function registerServiceWorker() {
  const shouldRegister =
    'serviceWorker' in navigator &&
    (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true');

  if (!shouldRegister) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(appConfig.serviceWorkerUrl, {
        scope: '/',
      });

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;

        installingWorker?.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('offdesign:update-ready'));
          }
        });
      });
    } catch (error) {
      console.warn('Service worker registration failed.', error);
    }
  });
}
