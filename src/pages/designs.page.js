import { createPageShell } from '../utils/dom.js';

export function designsPage() {
  return createPageShell({
    eyebrow: 'Local workspace',
    title: 'My projects',
    description:
      'Your ideas will collect here, safely stored on this device and ready to pick up wherever inspiration returns.',
    body: `
      <div class="projects-empty-state">
        <div class="projects-empty-state__art" aria-hidden="true"><span></span><span></span><span></span></div>
        <div>
          <p class="eyebrow">No projects yet</p>
          <h2>Start with the shape of an idea.</h2>
          <p>Your clothes, logos, and diagrams will appear here as soon as the future creative modules are introduced.</p>
          <a class="button" href="/design-clothes" data-route><i data-lucide="plus"></i> Create your first project</a>
        </div>
      </div>
    `,
  });
}
