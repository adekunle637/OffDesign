import { navigationGroups, quickSearchItems } from '../../config/navigation.config.js';
import { getActiveTheme, setTheme } from '../../services/theme.service.js';

export function createAppShell() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.dataset.sidebar = window.matchMedia('(max-width: 760px)').matches
    ? 'collapsed'
    : readSidebarState();
  shell.classList.toggle(
    'app-shell--context-collapsed',
    window.matchMedia('(max-width: 1170px)').matches,
  );

  const navigation = navigationGroups
    .map(
      (group) => `
        <section class="sidebar-group" aria-label="${group.label}">
          <p class="sidebar-group__label">${group.label}</p>
          <div class="sidebar-group__links">
            ${group.items
              .map(
                (item) => `
                  <a class="sidebar-link" href="${item.path}" data-route title="${item.label}">
                    <i data-lucide="${item.icon}"></i>
                    <span class="sidebar-link__label">${item.label}</span>
                    ${item.badge ? `<span class="sidebar-link__badge">${item.badge}</span>` : ''}
                  </a>
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
        <a class="command-item" href="${item.path}" data-route data-search-item data-search-name="${item.label.toLowerCase()}">
          <i data-lucide="${item.icon}"></i>
          <span>${item.label}</span>
          <i class="command-item__arrow" data-lucide="arrow-up-right"></i>
        </a>
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
          <span class="notification-dot" aria-hidden="true"></span>
        </button>
        <button class="icon-button" type="button" data-theme-toggle aria-label="Change theme" title="Change theme">
          <i data-lucide="sun"></i>
        </button>
        <button class="icon-button" type="button" data-context-toggle aria-controls="workspace-context" aria-expanded="true" aria-label="Toggle quick settings">
          <i data-lucide="sliders-horizontal"></i>
        </button>
        <button class="profile-button" type="button" aria-label="Profile placeholder: Ada">
          <span>AD</span>
        </button>
      </div>
    </header>
    <div class="shell-body">
      <button class="mobile-nav-backdrop" type="button" data-sidebar-close aria-label="Close navigation"></button>
      <aside class="app-sidebar" id="primary-navigation" aria-label="Main navigation">
        <div class="app-sidebar__top">
          <p class="workspace-label"><span class="workspace-label__dot"></span> Personal workspace</p>
          <button class="sidebar-collapse-button" type="button" data-sidebar-toggle>
            <i data-lucide="panel-left-close"></i>
            <span>Collapse</span>
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
      <aside class="context-panel" id="workspace-context" aria-label="Quick settings">
        <div class="context-panel__header">
          <div>
            <p class="eyebrow">Workspace</p>
            <h2>Quick settings</h2>
          </div>
          <button class="icon-button context-panel__close" type="button" data-context-toggle aria-label="Close quick settings">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="context-panel__content">
          <section class="context-card context-card--theme">
            <div class="context-card__icon"><i data-lucide="sun"></i></div>
            <div>
              <h3>Appearance</h3>
              <p data-theme-label>System theme</p>
            </div>
            <button class="text-button" type="button" data-theme-toggle>Change</button>
          </section>
          <section class="context-card">
            <div class="context-card__icon"><i data-lucide="wifi"></i></div>
            <div>
              <h3>Local workspace</h3>
              <p>Changes stay on this device.</p>
            </div>
          </section>
          <section class="context-tip">
            <i data-lucide="sparkles"></i>
            <div>
              <strong>Make it yours</strong>
              <p>Set your visual preferences before starting a project.</p>
              <a href="/settings" data-route>Open preferences <i data-lucide="arrow-up-right"></i></a>
            </div>
          </section>
        </div>
      </aside>
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
    <dialog class="notification-dialog" data-notifications-dialog aria-labelledby="notification-title">
      <div class="notification-dialog__surface">
        <div class="dialog-heading">
          <div>
            <p class="eyebrow">Updates</p>
            <h2 id="notification-title">You're all caught up</h2>
          </div>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close notifications"><i data-lucide="x"></i></button>
        </div>
        <div class="notification-empty"><i data-lucide="check"></i><p>OffDesign is ready for your next idea.</p></div>
      </div>
    </dialog>
  `;

  bindShellEvents(shell);
  syncSidebarToggle(shell);
  syncContextPanel(shell);
  return shell;
}

function bindShellEvents(shell) {
  shell.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const action = target?.closest('[data-sidebar-toggle], [data-sidebar-close], [data-context-toggle], [data-search-open], [data-notifications-open], [data-dialog-close], [data-theme-toggle]');

    if (action?.hasAttribute('data-sidebar-toggle')) {
      toggleSidebar(shell);
    }

    if (action?.hasAttribute('data-sidebar-close')) {
      closeSidebar(shell);
    }

    if (action?.hasAttribute('data-context-toggle')) {
      shell.classList.toggle('app-shell--context-collapsed');
      syncContextPanel(shell);
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

    if (action?.hasAttribute('data-theme-toggle')) {
      void cycleTheme();
    }

    if (target?.closest('a[data-route]')) {
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

  window.addEventListener('offdesign:themechange', () => syncThemeLabel(shell));
  window.addEventListener('resize', () => {
    syncSidebarToggle(shell);
    syncContextPanel(shell);
  });
  syncThemeLabel(shell);
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

function syncContextPanel(shell) {
  const overlayMode = window.matchMedia('(max-width: 1170px)').matches;
  const isExpanded = !shell.classList.contains('app-shell--context-collapsed');
  const button = shell.querySelector('[data-context-toggle][aria-controls]');
  button?.setAttribute('aria-expanded', String(isExpanded));

  const panel = shell.querySelector('.context-panel');
  if (panel) {
    panel.inert = overlayMode && !isExpanded;
    panel.setAttribute('aria-hidden', String(overlayMode && !isExpanded));
  }
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

async function cycleTheme() {
  const themes = ['system', 'dark', 'light'];
  const nextTheme = themes[(themes.indexOf(getActiveTheme()) + 1) % themes.length];
  await setTheme(nextTheme);
}

function syncThemeLabel(shell) {
  const theme = getActiveTheme();
  const label = theme === 'system' ? 'System theme' : `${theme[0].toUpperCase()}${theme.slice(1)} theme`;
  shell.querySelectorAll('[data-theme-label]').forEach((node) => {
    node.textContent = label;
  });
  shell.querySelector('[data-theme-toggle][aria-label]')?.setAttribute('aria-label', `Theme: ${label}. Change theme`);
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
