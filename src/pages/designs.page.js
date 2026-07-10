import { createPageShell } from '../utils/dom.js';

export function designsPage() {
  return createPageShell({
    eyebrow: 'Projects',
    title: 'Saved designs',
    description:
      'This page will list locally stored garments, drafts, and design collections when the editor is introduced.',
    body: `
      <div class="empty-state">
        <h2>No designs yet</h2>
        <p>The storage layer is ready, but design creation is reserved for the next product phase.</p>
      </div>
    `,
  });
}
