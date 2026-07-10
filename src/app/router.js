export class Router {
  constructor({ outlet, routes }) {
    this.outlet = outlet;
    this.routes = routes;
    this.routeMap = new Map(routes.map((route) => [route.path, route]));
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  start() {
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('popstate', this.handlePopState);
    this.render(window.location.pathname);
  }

  navigate(path) {
    const normalizedPath = this.normalizePath(path);

    if (window.location.pathname !== normalizedPath) {
      window.history.pushState({}, '', normalizedPath);
    }

    this.render(normalizedPath);
  }

  handleDocumentClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest('a[data-route]');

    if (!link || link.origin !== window.location.origin) {
      return;
    }

    event.preventDefault();
    this.navigate(link.pathname);
  }

  handlePopState() {
    this.render(window.location.pathname);
  }

  render(path) {
    const normalizedPath = this.normalizePath(path);
    const route = this.routeMap.get(normalizedPath) ?? this.routeMap.get('*');

    document.title = route.title ? `${route.title} | OffDesign` : 'OffDesign';
    this.outlet.replaceChildren(route.render());
    this.syncNavigation(normalizedPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  syncNavigation(path) {
    document.querySelectorAll('[data-route]').forEach((link) => {
      const isActive = link.pathname === path;
      link.toggleAttribute('aria-current', isActive);
    });
  }

  normalizePath(path) {
    if (!path || path === '/') {
      return '/';
    }

    return path.endsWith('/') ? path.slice(0, -1) : path;
  }
}
