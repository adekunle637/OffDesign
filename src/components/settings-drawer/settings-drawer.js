import { appConfig } from '../../config/app.config.js';
import { getSetting, setSetting } from '../../data/repositories/settings-repository.js';
import { downloadBackup, createLocalBackup, restoreLocalBackup } from '../../services/backup.service.js';
import { notifyBackupCompleted, notifyError, notifySuccess } from '../../services/notification.service.js';
import { clearCachedAppFiles, formatBytes, getStorageSummary } from '../../services/storage.service.js';
import { getActiveTheme, setTheme } from '../../services/theme.service.js';
import { hydrateIcons } from '../icon/icon.js';

export function settingsDrawerMarkup() {
  const version = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

  return `
    <button class="settings-drawer__backdrop" type="button" data-settings-close aria-label="Close settings"></button>
    <aside class="settings-drawer" id="settings-drawer" data-settings-drawer aria-labelledby="settings-drawer-title" aria-hidden="true" inert>
      <header class="settings-drawer__header">
        <div>
          <p class="eyebrow">OffDesign workspace</p>
          <h2 id="settings-drawer-title">Settings</h2>
        </div>
        <button class="icon-button" type="button" data-settings-close aria-label="Close settings"><i data-lucide="x"></i></button>
      </header>
      <nav class="settings-drawer__nav" aria-label="Settings sections">
        <button type="button" data-settings-nav="profile"><i data-lucide="user-round"></i> Profile</button>
        <button type="button" data-settings-nav="appearance"><i data-lucide="sun"></i> Appearance</button>
        <button type="button" data-settings-nav="workspace"><i data-lucide="hard-drive"></i> Workspace</button>
        <button type="button" data-settings-nav="accessibility"><i data-lucide="accessibility"></i> Accessibility</button>
        <button type="button" data-settings-nav="about"><i data-lucide="info"></i> About</button>
      </nav>
      <div class="settings-drawer__content">
        <section class="settings-drawer__section" id="profile" data-settings-section>
          <div class="settings-drawer__section-heading">
            <span class="settings-drawer__section-icon"><i data-lucide="user-round"></i></span>
            <div><p class="eyebrow">Profile</p><h3>Your creative space</h3></div>
          </div>
          <div class="profile-card">
            <span class="profile-card__avatar">AD</span>
            <div><strong>Ada Designer</strong><p>Personal workspace · Stored only on this device</p></div>
            <button class="button button--secondary button--compact" type="button" data-profile-edit>Edit</button>
          </div>
        </section>

        <section class="settings-drawer__section" id="appearance" data-settings-section>
          <div class="settings-drawer__section-heading">
            <span class="settings-drawer__section-icon"><i data-lucide="palette"></i></span>
            <div><p class="eyebrow">Appearance</p><h3>Comfortable by default</h3></div>
          </div>
          <fieldset class="theme-options" aria-label="Theme preference">
            <label class="theme-option"><input type="radio" name="drawer-theme" value="light" data-theme-input /><span class="theme-option__preview theme-option__preview--light"><i data-lucide="sun"></i></span><span><strong>Light</strong><small>Bright and focused</small></span></label>
            <label class="theme-option"><input type="radio" name="drawer-theme" value="dark" data-theme-input /><span class="theme-option__preview theme-option__preview--dark"><i data-lucide="moon"></i></span><span><strong>Dark</strong><small>Easy on the eyes</small></span></label>
            <label class="theme-option"><input type="radio" name="drawer-theme" value="system" data-theme-input /><span class="theme-option__preview theme-option__preview--system"><i data-lucide="monitor"></i></span><span><strong>System</strong><small>Follow device</small></span></label>
          </fieldset>
          <label class="settings-control">
            <span class="settings-control__icon"><i data-lucide="languages"></i></span>
            <span class="settings-control__copy"><strong>Language</strong><small>Choose the language used throughout OffDesign.</small></span>
            <select data-language-select aria-label="Language"><option value="en-NG">English (Nigeria)</option><option value="en-US">English (United States)</option><option value="fr">Français</option></select>
          </label>
        </section>

        <section class="settings-drawer__section" id="workspace" data-settings-section>
          <div class="settings-drawer__section-heading">
            <span class="settings-drawer__section-icon"><i data-lucide="hard-drive"></i></span>
            <div><p class="eyebrow">Offline workspace</p><h3>Local, secure, ready</h3></div>
          </div>
          <div class="storage-overview">
            <div class="storage-meter"><div class="storage-meter__track"><span data-storage-bar></span></div><p><strong data-storage-usage>Checking local storage…</strong><span data-storage-quota></span></p></div>
            <div class="storage-note"><i data-lucide="shield-check"></i><p>Projects and preferences remain on this device until you choose to export them.</p></div>
          </div>
          <div class="settings-control settings-control--action">
            <span class="settings-control__icon"><i data-lucide="trash-2"></i></span>
            <span class="settings-control__copy"><strong>Offline storage management</strong><small>Clear temporary app cache without deleting projects.</small></span>
            <button class="button button--secondary button--compact" type="button" data-clear-cache>Clear cache</button>
          </div>
          <label class="settings-control">
            <span class="settings-control__icon"><i data-lucide="save"></i></span>
            <span class="settings-control__copy"><strong>Auto save</strong><small>Keep project changes safe as you work.</small></span>
            <input class="switch-input" type="checkbox" data-auto-save aria-label="Auto save" /><span class="switch-ui" aria-hidden="true"></span>
          </label>
          <div class="backup-card">
            <div><strong>Backup & restore projects</strong><p>Move a portable copy of your projects and preferences when you need it.</p></div>
            <div class="backup-card__actions">
              <button class="button button--secondary button--compact" type="button" data-backup-download><i data-lucide="download"></i> Back up</button>
              <button class="button button--secondary button--compact" type="button" data-backup-restore><i data-lucide="upload"></i> Restore</button>
              <input type="file" accept="application/json,.json" data-backup-file hidden />
            </div>
          </div>
        </section>

        <section class="settings-drawer__section" id="accessibility" data-settings-section>
          <div class="settings-drawer__section-heading">
            <span class="settings-drawer__section-icon"><i data-lucide="accessibility"></i></span>
            <div><p class="eyebrow">Accessibility</p><h3>Designed around you</h3></div>
          </div>
          <label class="settings-control">
            <span class="settings-control__icon"><i data-lucide="mouse-pointer-2"></i></span>
            <span class="settings-control__copy"><strong>Reduce motion</strong><small>Minimise interface movement and transitions.</small></span>
            <input class="switch-input" type="checkbox" data-reduce-motion aria-label="Reduce motion" /><span class="switch-ui" aria-hidden="true"></span>
          </label>
          <div class="settings-control settings-control--action">
            <span class="settings-control__icon"><i data-lucide="keyboard"></i></span>
            <span class="settings-control__copy"><strong>Keyboard shortcuts</strong><small><kbd>⌘ K</kbd> Search · <kbd>Esc</kbd> Close overlays</small></span>
            <a class="text-link" href="/help" data-route>View all</a>
          </div>
          <label class="settings-control">
            <span class="settings-control__icon"><i data-lucide="bell-ring"></i></span>
            <span class="settings-control__copy"><strong>Notifications</strong><small>Show discreet workspace updates.</small></span>
            <input class="switch-input" type="checkbox" data-notifications-enabled aria-label="Enable notifications" /><span class="switch-ui" aria-hidden="true"></span>
          </label>
        </section>

        <section class="settings-drawer__section" id="about" data-settings-section>
          <div class="settings-drawer__section-heading">
            <span class="settings-drawer__section-icon"><i data-lucide="shield"></i></span>
            <div><p class="eyebrow">Privacy & support</p><h3>Private by design</h3></div>
          </div>
          <div class="privacy-card"><i data-lucide="shield-check"></i><p><strong>Privacy</strong> — OffDesign has no account, automatic upload, or background tracking in this offline-first workspace.</p></div>
          <div class="about-list">
            <div><span>About OffDesign</span><strong>Creative software that stays with you.</strong></div>
            <div><span>Version information</span><strong>${appConfig.name} ${version} · Offline-first PWA</strong></div>
          </div>
          <div class="support-grid">
            <a href="mailto:feedback@offdesign.app?subject=OffDesign%20feedback" class="support-link"><i data-lucide="message-square"></i><span><strong>Feedback</strong><small>Share an idea or report an issue</small></span><i data-lucide="arrow-up-right"></i></a>
            <a href="/help" data-route class="support-link"><i data-lucide="life-buoy"></i><span><strong>Help & documentation</strong><small>Guides, shortcuts, and support</small></span><i data-lucide="arrow-up-right"></i></a>
          </div>
        </section>
      </div>
    </aside>
  `;
}

export function initializeSettingsDrawer(root) {
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (target?.closest('[data-settings-open]')) openSettingsDrawer(root);
    if (target?.closest('[data-settings-close]')) closeSettingsDrawer(root);

    const navItem = target?.closest('[data-settings-nav]');
    if (navItem) {
      root.querySelector(`#${navItem.dataset.settingsNav}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (target?.closest('[data-clear-cache]')) void clearCache(root, target.closest('[data-clear-cache]'));
    if (target?.closest('[data-backup-download]')) void backupProjects(target.closest('[data-backup-download]'));
    if (target?.closest('[data-backup-restore]')) root.querySelector('[data-backup-file]')?.click();
    if (target?.closest('[data-profile-edit]')) notifySuccess('Profile saved', 'Your local workspace profile is ready to personalise.');
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

    if (target.matches('[data-theme-input]')) void setTheme(target.value);
    if (target.matches('[data-language-select]')) void setSetting('language', target.value);
    if (target.matches('[data-auto-save]')) void setSetting('auto-save', target.checked);
    if (target.matches('[data-notifications-enabled]')) void setSetting('notifications-enabled', target.checked);
    if (target.matches('[data-reduce-motion]')) {
      document.documentElement.dataset.reduceMotion = String(target.checked);
      void setSetting('reduce-motion', target.checked);
    }
    if (target.matches('[data-backup-file]') && target.files?.[0]) void restoreProjects(target.files[0], target);
  });

  window.addEventListener('offdesign:open-settings', () => openSettingsDrawer(root));
  window.addEventListener('offdesign:themechange', () => syncThemeInputs(root));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSettingsDrawerOpen(root)) closeSettingsDrawer(root);
  });

  syncThemeInputs(root);
  void hydrateSettings(root);
  void updateStorageSummary(root);
}

export function openSettingsDrawer(root) {
  const drawer = root.querySelector('[data-settings-drawer]');
  if (!drawer) return;
  root.classList.add('app-shell--settings-open');
  drawer.inert = false;
  drawer.setAttribute('aria-hidden', 'false');
  root.querySelectorAll('[data-settings-open][aria-expanded]').forEach((button) =>
    button.setAttribute('aria-expanded', 'true'),
  );
  void updateStorageSummary(root);
  window.setTimeout(() => drawer.querySelector('[data-settings-close]')?.focus(), 150);
}

export function closeSettingsDrawer(root) {
  const drawer = root.querySelector('[data-settings-drawer]');
  if (!drawer) return;
  root.classList.remove('app-shell--settings-open');
  drawer.inert = true;
  drawer.setAttribute('aria-hidden', 'true');
  root.querySelectorAll('[data-settings-open][aria-expanded]').forEach((button) =>
    button.setAttribute('aria-expanded', 'false'),
  );
}

function isSettingsDrawerOpen(root) {
  return root.classList.contains('app-shell--settings-open');
}

async function hydrateSettings(root) {
  try {
    const [language, reduceMotion, autoSave, notificationsEnabled] = await Promise.all([
      getSetting('language'),
      getSetting('reduce-motion'),
      getSetting('auto-save'),
      getSetting('notifications-enabled'),
    ]);
    const languageInput = root.querySelector('[data-language-select]');
    if (language?.value && languageInput) languageInput.value = language.value;
    updateCheckbox(root, '[data-reduce-motion]', reduceMotion?.value, false);
    updateCheckbox(root, '[data-auto-save]', autoSave?.value, true);
    updateCheckbox(root, '[data-notifications-enabled]', notificationsEnabled?.value, true);
    if (typeof reduceMotion?.value === 'boolean') document.documentElement.dataset.reduceMotion = String(reduceMotion.value);
  } catch {
    // The drawer keeps useful defaults when local persistence is unavailable.
  }
}

function updateCheckbox(root, selector, value, fallback) {
  const input = root.querySelector(selector);
  if (input) input.checked = typeof value === 'boolean' ? value : fallback;
}

function syncThemeInputs(root) {
  const theme = getActiveTheme();
  const input = root.querySelector(`[data-theme-input][value="${theme}"]`);
  if (input) input.checked = true;
}

async function updateStorageSummary(root) {
  const usage = root.querySelector('[data-storage-usage]');
  const quota = root.querySelector('[data-storage-quota]');
  const bar = root.querySelector('[data-storage-bar]');
  if (!usage || !quota || !bar) return;

  try {
    const summary = await getStorageSummary();
    if (!summary) {
      usage.textContent = 'Storage details unavailable in this browser';
      quota.textContent = '';
      return;
    }
    usage.textContent = `${formatBytes(summary.usage)} used locally`;
    quota.textContent = `${formatBytes(summary.quota)} available`;
    bar.style.inlineSize = `${Math.max(summary.percentage, 2)}%`;
  } catch {
    usage.textContent = 'Unable to check storage right now';
  }
}

async function clearCache(root, button) {
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Clearing…';
  try {
    const count = await clearCachedAppFiles();
    notifySuccess(count ? 'Cache cleared' : 'Nothing to clear', 'Your projects and preferences were left untouched.');
    await updateStorageSummary(root);
  } catch {
    notifyError('OffDesign could not clear the temporary cache. Please try again.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function backupProjects(button) {
  button.disabled = true;
  const originalLabel = button.innerHTML;
  try {
    downloadBackup(await createLocalBackup());
    notifyBackupCompleted();
  } catch {
    notifyError('OffDesign could not create a backup right now.');
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
    hydrateIcons(button);
  }
}

async function restoreProjects(file, input) {
  try {
    const result = await restoreLocalBackup(file);
    notifySuccess('Backup restored', `${result.total} local records are ready in your workspace.`);
  } catch {
    notifyError('That file could not be restored. Choose a valid OffDesign backup.');
  } finally {
    input.value = '';
  }
}
