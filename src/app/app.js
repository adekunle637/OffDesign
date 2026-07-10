import { createAppShell } from '../components/app-shell/app-shell.js';
import { hydrateIcons } from '../components/icon/icon.js';
import { createInstallPrompt } from '../components/install-prompt/install-prompt.js';
import { createOfflineStatus } from '../components/offline-status/offline-status.js';
import { initializeLocalDatabase } from '../data/storage/database.js';
import { registerServiceWorker } from '../pwa/register-service-worker.js';
import { initializeTheme } from '../services/theme.service.js';
import { Router } from './router.js';
import { routes } from './routes.js';

export async function bootstrapOffDesign(root) {
  if (!root) {
    throw new Error('OffDesign could not find the application root.');
  }

  await initializeLocalDatabase();
  await initializeTheme();

  root.replaceChildren(createAppShell());

  const outlet = root.querySelector('[data-router-outlet]');
  const router = new Router({
    outlet,
    routes,
    afterRender: () => hydrateIcons(root),
  });

  router.start();

  root.querySelectorAll('[data-offline-status]').forEach((mountPoint) => createOfflineStatus(mountPoint));
  createInstallPrompt(root.querySelector('[data-install-prompt]'));
  hydrateIcons(root);
  registerServiceWorker();
}
