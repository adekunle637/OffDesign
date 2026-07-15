import {
  clothingTemplateCategories,
  templatesForCategory,
} from '../data/templates/clothing-templates.js';
import { createElementFromHtml } from '../utils/dom.js';

export function templateLibraryPage() {
  const page = createElementFromHtml(`
    <section class="page template-library-page">
      <header class="page-header">
        <p class="page-header__eyebrow">Local starting points</p>
        <h1>Clothing templates</h1>
        <p class="page-header__description">A modular, local-first wardrobe of editable placeholder templates. Choose a category, then send any starting point into the shared clothes workspace.</p>
      </header>
      <div class="template-library-page__categories">
        ${clothingTemplateCategories.map((category) => `
          <section class="template-library-section" aria-labelledby="template-category-${category.id}">
            <div class="template-library-section__header"><span><i data-lucide="${category.icon}"></i></span><div><p class="eyebrow">${templatesForCategory(category.id).length} templates</p><h2 id="template-category-${category.id}">${category.label}</h2></div></div>
            <div class="template-library-page__grid">
              ${templatesForCategory(category.id).map((template) => `
                <a class="template-library-page__card" href="/design-clothes" data-route data-pending-template="${template.id}" style="--template-accent:${template.accent}">
                  <span class="template-library-page__preview"><img src="${template.asset}" alt="" /></span><span><strong>${template.name}</strong><small>Open-source vector</small></span><i data-lucide="arrow-up-right"></i>
                </a>`).join('')}
            </div>
          </section>`).join('')}
      </div>
    </section>
  `);

  page.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('[data-pending-template]') : null;
    if (!link) {
      return;
    }
    try {
      sessionStorage.setItem('offdesign:pending-template', link.dataset.pendingTemplate ?? '');
    } catch {
      // The editor stays usable if session storage is unavailable.
    }
  });

  return page;
}
