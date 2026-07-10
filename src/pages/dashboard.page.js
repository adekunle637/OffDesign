import { createPageShell } from '../utils/dom.js';

export function dashboardPage() {
  return createPageShell({
    eyebrow: 'Offline workspace',
    title: 'Your local clothing design hub',
    description:
      'The app foundation is ready for offline design projects, local assets, settings, and future editor modules.',
    body: `
      <div class="dashboard-grid">
        <article class="surface-card">
          <h2>Design Projects</h2>
          <p>Local project metadata is stored in IndexedDB and prepared for future garment files.</p>
          <a class="text-link" href="/designs" data-route>View placeholder</a>
        </article>
        <article class="surface-card">
          <h2>Editor Foundation</h2>
          <p>The route exists, but the clothing editor itself has intentionally not been built.</p>
          <a class="text-link" href="/editor" data-route>Open placeholder</a>
        </article>
        <article class="surface-card">
          <h2>Asset Library</h2>
          <p>Fabric, trim, swatch, image, and template folders are organized for future imports.</p>
          <a class="text-link" href="/assets" data-route>Browse placeholder</a>
        </article>
      </div>
    `,
  });
}
