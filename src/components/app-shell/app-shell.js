import { navigationGroups, quickSearchItems } from '../../config/navigation.config.js';
import { initializeNotificationCenter, notificationCenterMarkup } from '../notification-center/notification-center.js';
import { initializeSettingsDrawer, settingsDrawerMarkup } from '../settings-drawer/settings-drawer.js';
import { notifyOfflineMode, notifyUpdateAvailable } from '../../services/notification.service.js';

export function createAppShell() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.dataset.sidebar = window.matchMedia('(max-width: 760px)').matches
    ? 'collapsed'
    : readSidebarState();

  const navigation = navigationGroups
    .map(
      (group) => `
        <section class="sidebar-group" aria-label="${group.label}">
          <p class="sidebar-group__label">${group.label}</p>
          <div class="sidebar-group__links">
            ${group.items
              .map(
                (item) => `
                ${
                  item.action === 'settings'
                    ? `<button class="sidebar-link" type="button" data-settings-open title="${item.label}">`
                    : `<a class="sidebar-link" href="${item.path}" data-route title="${item.label}">`
                }
                    <i data-lucide="${item.icon}"></i>
                    <span class="sidebar-link__label">${item.label}</span>
                    ${item.badge ? `<span class="sidebar-link__badge">${item.badge}</span>` : ''}
                ${item.action === 'settings' ? '</button>' : '</a>'}
                `,
              )
              .join('')}
          </div>
        </section>
      `,
    )
    .join('');

  const searchItems = quickSearchItems
    .map(
      (item) => `
        ${
          item.action === 'settings'
            ? `<button class="command-item" type="button" data-settings-open data-search-item data-search-name="${item.label.toLowerCase()}">`
            : `<a class="command-item" href="${item.path}" data-route data-search-item data-search-name="${item.label.toLowerCase()}">`
        }
          <i data-lucide="${item.icon}"></i>
          <span>${item.label}</span>
          <i class="command-item__arrow" data-lucide="arrow-up-right"></i>
        ${item.action === 'settings' ? '</button>' : '</a>'}
      `,
    )
    .join('');

  shell.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to workspace</a>
    <header class="app-header">
      <div class="app-header__start">
        <button class="icon-button app-header__menu" type="button" data-sidebar-toggle aria-controls="primary-navigation" aria-label="Open navigation" aria-expanded="true">
          <i data-lucide="menu"></i>
        </button>
        <a class="brand" href="/" data-route aria-label="OffDesign home">
          <span class="brand__mark" aria-hidden="true"><span></span><span></span></span>
          <span class="brand__name">OffDesign</span>
        </a>
      </div>
      <button class="global-search" type="button" data-search-open aria-haspopup="dialog" aria-label="Search OffDesign">
        <i data-lucide="search"></i>
        <span>Search projects, tools, and libraries</span>
        <kbd>⌘ K</kbd>
      </button>
      <div class="app-header__actions">
        <div class="desktop-only" data-offline-status></div>
        <div data-install-prompt></div>
        <button class="icon-button" type="button" data-notifications-open aria-haspopup="dialog" aria-label="View notifications">
          <i data-lucide="bell"></i>
          <span class="notification-dot" data-notification-dot aria-hidden="true"></span>
        </button>
        <button class="icon-button" type="button" data-settings-open aria-controls="settings-drawer" aria-expanded="false" aria-label="Open settings" title="Settings">
          <i data-lucide="settings"></i>
        </button>
        <button class="profile-button" type="button" data-settings-open aria-label="Open profile settings for Ada">
          <span>AD</span>
        </button>
      </div>
    </header>
    <div class="shell-body">
      <button class="mobile-nav-backdrop" type="button" data-sidebar-close aria-label="Close navigation"></button>
      <aside class="app-sidebar" id="primary-navigation" aria-label="Main navigation">
        <div class="app-sidebar__top">
          <p class="workspace-label"><span class="workspace-label__dot"></span> Personal workspace</p>
          <button class="sidebar-collapse-button" type="button" data-sidebar-toggle aria-label="Collapse navigation" title="Collapse navigation">
            <i data-lucide="panel-left-close"></i>
          </button>
        </div>
        <nav class="sidebar-nav">
          ${navigation}
        </nav>
        <div class="sidebar-footnote">
          <i data-lucide="cloud-off"></i>
          <span>Designed to work offline</span>
        </div>
      </aside>
      <main id="main-content" class="app-main" data-router-outlet tabindex="-1"></main>
    </div>
    <footer class="status-bar" aria-label="Application status">
      <div class="status-bar__item"><span class="status-indicator" aria-hidden="true"></span><span data-save-status>Ready — changes save locally</span></div>
      <div class="status-bar__item desktop-only"><i data-lucide="command"></i><span>Press <kbd>⌘ K</kbd> to search</span></div>
      <div class="status-bar__item" data-offline-status></div>
    </footer>
    <dialog class="command-dialog" data-search-dialog aria-labelledby="search-dialog-title">
      <div class="command-dialog__surface">
        <div class="command-dialog__search">
          <i data-lucide="search"></i>
          <label class="visually-hidden" for="global-search-input">Search workspace</label>
          <input id="global-search-input" type="search" placeholder="Search the workspace" autocomplete="off" data-global-search />
          <kbd>Esc</kbd>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close search"><i data-lucide="x"></i></button>
        </div>
        <div class="command-dialog__content">
          <p id="search-dialog-title" class="command-dialog__label">Quick navigation</p>
          <div class="command-list" data-search-results>
            ${searchItems}
          </div>
          <p class="command-empty" data-search-empty hidden>No workspace destinations match that search.</p>
        </div>
      </div>
    </dialog>
    ${notificationCenterMarkup()}
    ${settingsDrawerMarkup()}
  `;

  bindShellEvents(shell);
  syncSidebarToggle(shell);
  initializeNotificationCenter(shell);
  initializeSettingsDrawer(shell);
  return shell;
}

function bindShellEvents(shell) {
  shell.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const action = target?.closest('[data-sidebar-toggle], [data-sidebar-close], [data-search-open], [data-notifications-open], [data-dialog-close]');

    if (action?.hasAttribute('data-sidebar-toggle')) {
      toggleSidebar(shell);
    }

    if (action?.hasAttribute('data-sidebar-close')) {
      closeSidebar(shell);
    }

    if (action?.hasAttribute('data-search-open')) {
      openDialog(shell.querySelector('[data-search-dialog]'), '[data-global-search]');
    }

    if (action?.hasAttribute('data-notifications-open')) {
      openDialog(shell.querySelector('[data-notifications-dialog]'));
    }

    if (action?.hasAttribute('data-dialog-close')) {
      action.closest('dialog')?.close();
    }

    if (target?.closest('a[data-route], [data-settings-open]')) {
      closeSidebar(shell);
      shell.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    }
  });

  const searchInput = shell.querySelector('[data-global-search]');
  searchInput?.addEventListener('input', () => filterSearchItems(shell, searchInput.value));

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openDialog(shell.querySelector('[data-search-dialog]'), '[data-global-search]');
    }
  });

  window.addEventListener('resize', () => {
    syncSidebarToggle(shell);
  });
  window.addEventListener('offline', notifyOfflineMode);
  window.addEventListener('offdesign:update-ready', notifyUpdateAvailable);
}

function toggleSidebar(shell) {
  const nextState = shell.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
  shell.dataset.sidebar = nextState;
  persistSidebarState(nextState);
  syncSidebarToggle(shell);
}

function closeSidebar(shell) {
  shell.dataset.sidebar = 'collapsed';
  persistSidebarState('collapsed');
  syncSidebarToggle(shell);
}

function syncSidebarToggle(shell) {
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const isExpanded = shell.dataset.sidebar === 'expanded';
  const button = shell.querySelector('[data-sidebar-toggle][aria-expanded]');
  button?.setAttribute('aria-expanded', String(isExpanded));
  button?.setAttribute('aria-label', isExpanded ? 'Close navigation' : 'Open navigation');

  const sidebar = shell.querySelector('.app-sidebar');
  if (sidebar) {
    sidebar.inert = mobile && !isExpanded;
    sidebar.setAttribute('aria-hidden', String(mobile && !isExpanded));
  }

  document.body.classList.toggle('has-navigation-drawer', mobile && isExpanded);
}

function filterSearchItems(shell, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const items = [...shell.querySelectorAll('[data-search-item]')];
  let matchCount = 0;

  items.forEach((item) => {
    const matches = item.dataset.searchName?.includes(normalizedQuery) ?? false;
    item.hidden = !matches;
    matchCount += Number(matches);
  });

  shell.querySelector('[data-search-empty]')?.toggleAttribute('hidden', matchCount !== 0);
}

function openDialog(dialog, focusSelector) {
  if (!dialog?.open) {
    dialog?.showModal();
  }

  const field = focusSelector ? dialog?.querySelector(focusSelector) : null;
  window.setTimeout(() => field?.focus(), 0);
}

function readSidebarState() {
  try {
    return localStorage.getItem('offdesign:sidebar-state') === 'collapsed' ? 'collapsed' : 'expanded';
  } catch {
    return 'expanded';
  }
}

function persistSidebarState(state) {
  try {
    localStorage.setItem('offdesign:sidebar-state', state);
  } catch {
    // Navigation remains usable when browser storage is unavailable.
  }
}
