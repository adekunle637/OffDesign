import { createPageShell } from '../utils/dom.js';

export function notFoundPage() {
  return createPageShell({
    eyebrow: '404',
    title: 'Page not found',
    description: 'That workspace area does not exist yet.',
    body: '<a class="button" href="/" data-route>Return to workspace</a>',
  });
}
