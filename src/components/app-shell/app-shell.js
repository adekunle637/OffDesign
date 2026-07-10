export function createAppShell(routes) {
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const navItems = routes
    .filter((route) => route.nav)
    .map(
      (route) => `
        <a class="app-nav__link" href="${route.path}" data-route>
          ${route.label}
        </a>
      `,
    )
    .join('');

  shell.innerHTML = `
    <header class="app-header">
      <a class="brand" href="/" data-route aria-label="OffDesign workspace">
        <span class="brand__mark" aria-hidden="true">O</span>
        <span class="brand__name">OffDesign</span>
      </a>
      <nav class="app-nav" aria-label="Primary navigation">
        ${navItems}
      </nav>
      <div class="app-header__actions">
        <div data-offline-status></div>
        <div data-install-prompt></div>
      </div>
    </header>
    <main id="main-content" class="app-main" data-router-outlet tabindex="-1"></main>
  `;

  return shell;
}
