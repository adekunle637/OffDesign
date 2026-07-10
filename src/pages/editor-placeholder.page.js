import { createPageShell } from '../utils/dom.js';

export function editorPlaceholderPage() {
  return createPageShell({
    eyebrow: 'Future module',
    title: 'Editor placeholder',
    description:
      'The route, layout, storage, and PWA foundation are in place. The clothing editor is intentionally deferred.',
    body: `
      <div class="module-placeholder">
        <div>
          <h2>Reserved editor surface</h2>
          <p>
            Future work can mount canvas tooling, pattern pieces, measurements, layers, and export workflows here.
          </p>
        </div>
      </div>
    `,
  });
}
