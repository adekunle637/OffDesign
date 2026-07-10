import { getSetting, setSetting } from '../data/repositories/settings-repository.js';
import { appConfig } from '../config/app.config.js';
import { clearCachedAppFiles, formatBytes, getStorageSummary } from '../services/storage.service.js';
import { getActiveTheme, setTheme } from '../services/theme.service.js';
import { createPageShell } from '../utils/dom.js';

export function settingsPage() {
  const page = createPageShell({
    eyebrow: 'Application',
    title: 'Settings',
    description:
      'Set up a calm, comfortable workspace. Your preferences are stored locally and work without a connection.',
    body: `
      <div class="settings-layout">
        <section class="settings-section" aria-labelledby="appearance-title">
          <div class="settings-section__heading"><span class="settings-section__icon"><i data-lucide="sun"></i></span><div><p class="eyebrow">Appearance</p><h2 id="appearance-title">Make it feel like yours</h2></div></div>
          <fieldset class="theme-options" aria-label="Theme preference">
            <label class="theme-option"><input type="radio" name="theme" value="light" data-theme-input /><span class="theme-option__preview theme-option__preview--light"><i data-lucide="sun"></i></span><span><strong>Light</strong><small>Bright and focused</small></span></label>
            <label class="theme-option"><input type="radio" name="theme" value="dark" data-theme-input /><span class="theme-option__preview theme-option__preview--dark"><i data-lucide="moon"></i></span><span><strong>Dark</strong><small>Easy on the eyes</small></span></label>
            <label class="theme-option"><input type="radio" name="theme" value="system" data-theme-input /><span class="theme-option__preview theme-option__preview--system"><i data-lucide="monitor"></i></span><span><strong>System</strong><small>Follow your device</small></span></label>
          </fieldset>
        </section>
        <section class="settings-section" aria-labelledby="preferences-title">
          <div class="settings-section__heading"><span class="settings-section__icon"><i data-lucide="accessibility"></i></span><div><p class="eyebrow">Preferences</p><h2 id="preferences-title">Comfort & control</h2></div></div>
          <div class="settings-list">
            <label class="settings-row"><span class="settings-row__icon"><i data-lucide="languages"></i></span><span class="settings-row__copy"><strong>Language</strong><small>Choose the language used throughout OffDesign.</small></span><select data-language-select aria-label="Language"><option value="en-NG">English (Nigeria)</option><option value="en-US">English (United States)</option><option value="fr">Français</option></select></label>
            <label class="settings-row"><span class="settings-row__icon"><i data-lucide="accessibility"></i></span><span class="settings-row__copy"><strong>Reduce motion</strong><small>Minimise interface movement and transitions.</small></span><input class="switch-input" type="checkbox" data-reduce-motion aria-label="Reduce motion" /><span class="switch-ui" aria-hidden="true"></span></label>
            <div class="settings-row"><span class="settings-row__icon"><i data-lucide="keyboard"></i></span><span class="settings-row__copy"><strong>Keyboard shortcuts</strong><small><kbd>⌘ K</kbd> search · <kbd>Esc</kbd> close overlays</small></span><a class="text-link" href="/help" data-route>View guide</a></div>
          </div>
        </section>
        <section class="settings-section" aria-labelledby="storage-title">
          <div class="settings-section__heading"><span class="settings-section__icon"><i data-lucide="hard-drive"></i></span><div><p class="eyebrow">Offline storage</p><h2 id="storage-title">Always available</h2></div></div>
          <div class="storage-overview">
            <div class="storage-meter"><div class="storage-meter__track"><span data-storage-bar></span></div><p><strong data-storage-usage>Checking local storage…</strong><span data-storage-quota></span></p></div>
            <div class="storage-note"><i data-lucide="shield-check"></i><p>Projects and preferences are stored on this device. Nothing is uploaded automatically.</p></div>
          </div>
          <div class="settings-row settings-row--cache"><span class="settings-row__icon"><i data-lucide="trash-2"></i></span><span class="settings-row__copy"><strong>Temporary cache</strong><small>Remove cached resources without deleting projects or the offline app shell.</small></span><button class="button button--secondary button--compact" type="button" data-clear-cache>Clear cache</button></div>
        </section>
        <section class="settings-section settings-section--about" aria-labelledby="about-title">
          <div class="settings-section__heading"><span class="settings-section__icon"><i data-lucide="info"></i></span><div><p class="eyebrow">Privacy & about</p><h2 id="about-title">Made for independent ideas</h2></div></div>
          <div class="about-grid"><div><strong>Private by default</strong><p>OffDesign has no sign-in, cloud sync, or background tracking in this foundation.</p></div><div><strong>Version information</strong><p>${appConfig.name} ${import.meta.env.VITE_APP_VERSION ?? '0.1.0'} · Offline-first PWA</p></div></div>
        </section>
      </div>
    `,
  });

  bindSettingsPage(page);
  return page;
}

function bindSettingsPage(page) {
  page.addEventListener('change', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.matches('[data-theme-input]')) {
      void setTheme(target.value);
    }

    if (target.matches('[data-language-select]')) {
      void setSetting('language', target.value);
    }

    if (target.matches('[data-reduce-motion]')) {
      document.documentElement.dataset.reduceMotion = String(target.checked);
      void setSetting('reduce-motion', target.checked);
    }
  });

  page.querySelector('[data-clear-cache]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Clearing…';

    try {
      const count = await clearCachedAppFiles();
      button.textContent = count ? 'Cache cleared' : 'Nothing to clear';
      await updateStorageSummary(page);
    } catch {
      button.textContent = 'Try again';
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Clear cache';
      }, 1800);
    }
  });

  void hydratePreferences(page);
  void updateStorageSummary(page);
}

async function hydratePreferences(page) {
  const theme = getActiveTheme();
  page.querySelector(`[data-theme-input][value="${theme}"]`).checked = true;

  try {
    const [language, reduceMotion] = await Promise.all([getSetting('language'), getSetting('reduce-motion')]);
    const languageInput = page.querySelector('[data-language-select]');
    if (language?.value && languageInput) {
      languageInput.value = language.value;
    }
    const reduceMotionInput = page.querySelector('[data-reduce-motion]');
    if (typeof reduceMotion?.value === 'boolean' && reduceMotionInput) {
      reduceMotionInput.checked = reduceMotion.value;
      document.documentElement.dataset.reduceMotion = String(reduceMotion.value);
    }
  } catch {
    // Settings controls keep usable defaults when local storage cannot be reached.
  }
}

async function updateStorageSummary(page) {
  try {
    const summary = await getStorageSummary();
    const usage = page.querySelector('[data-storage-usage]');
    const quota = page.querySelector('[data-storage-quota]');
    const bar = page.querySelector('[data-storage-bar]');

    if (!summary) {
      usage.textContent = 'Storage details unavailable in this browser';
      quota.textContent = '';
      return;
    }

    usage.textContent = `${formatBytes(summary.usage)} used locally`;
    quota.textContent = `${formatBytes(summary.quota)} available`;
    bar.style.inlineSize = `${Math.max(summary.percentage, 2)}%`;
  } catch {
    page.querySelector('[data-storage-usage]').textContent = 'Unable to check storage right now';
  }
}
