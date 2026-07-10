import { createAppShell } from '../components/app-shell/app-shell.js';
import { createInstallPrompt } from '../components/install-prompt/install-prompt.js';
import { createOfflineStatus } from '../components/offline-status/offline-status.js';
import { initializeLocalDatabase } from '../data/storage/database.js';
import { registerServiceWorker } from '../pwa/register-service-worker.js';
import { Router } from './router.js';
import { routes } from './routes.js';

export async function bootstrapOffDesign(root) {
  if (!root) {
    throw new Error('OffDesign could not find the application root.');
  }

  root.replaceChildren(createAppShell(routes));

  const outlet = root.querySelector('[data-router-outlet]');
  const router = new Router({ outlet, routes });

  await initializeLocalDatabase();
  router.start();

  createOfflineStatus(root.querySelector('[data-offline-status]'));
  createInstallPrompt(root.querySelector('[data-install-prompt]'));
  registerServiceWorker();
}
