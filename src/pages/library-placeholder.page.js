import { createPageShell } from '../utils/dom.js';

export function libraryPlaceholderPage({ eyebrow, title, description, icon, details, actionLabel }) {
  return createPageShell({
    eyebrow,
    title,
    description,
    body: `
      <section class="library-placeholder" aria-label="${title} overview">
        <div class="library-placeholder__icon"><i data-lucide="${icon}"></i></div>
        <div class="library-placeholder__content">
          <span class="eyebrow">Module foundation</span>
          <h2>${details}</h2>
          <p>This dedicated workspace is ready for its future tools while the application shell, navigation, settings, and local storage stay fully available today.</p>
          <a class="button button--secondary" href="/" data-route>Back to home</a>
        </div>
        <div class="library-placeholder__status">
          <span><i data-lucide="check"></i> Route ready</span>
          <span><i data-lucide="check"></i> Offline-ready</span>
          <span><i data-lucide="check"></i> ${actionLabel}</span>
        </div>
      </section>
    `,
  });
}
