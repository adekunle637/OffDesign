import { getSetting, setSetting } from '../data/repositories/settings-repository.js';

const themeKey = 'theme-preference';
const storageKey = 'offdesign:theme-preference';
const validThemes = new Set(['light', 'dark', 'system']);

export async function initializeTheme() {
  const cachedTheme = readCachedTheme();

  if (cachedTheme) {
    applyTheme(cachedTheme);
    return cachedTheme;
  }

  try {
    const storedTheme = await getSetting(themeKey);
    const theme = validThemes.has(storedTheme?.value) ? storedTheme.value : 'system';
    applyTheme(theme);
    cacheTheme(theme);
    return theme;
  } catch {
    applyTheme('system');
    return 'system';
  }
}

export async function setTheme(theme) {
  const normalizedTheme = validThemes.has(theme) ? theme : 'system';
  applyTheme(normalizedTheme);
  cacheTheme(normalizedTheme);

  try {
    await setSetting(themeKey, normalizedTheme);
  } catch (error) {
    console.warn('OffDesign could not persist the theme preference.', error);
  }

  return normalizedTheme;
}

export function getActiveTheme() {
  return document.documentElement.dataset.theme || 'system';
}

export function getResolvedTheme(theme = getActiveTheme()) {
  if (theme !== 'system') {
    return theme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'system' ? 'light dark' : theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getResolvedTheme(theme) === 'dark' ? '#12151c' : '#f4f6fa');
  window.dispatchEvent(new CustomEvent('offdesign:themechange', { detail: { theme } }));
}

function readCachedTheme() {
  try {
    const theme = localStorage.getItem(storageKey);
    return validThemes.has(theme) ? theme : null;
  } catch {
    return null;
  }
}

function cacheTheme(theme) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // The IndexedDB setting remains the durable fallback when local storage is unavailable.
  }
}
