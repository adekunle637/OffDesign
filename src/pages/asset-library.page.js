import { createPageShell } from '../utils/dom.js';

const assetGroups = [
  ['Images', 'Reference photos, imported sketches, and product imagery.'],
  ['Patterns', 'Repeatable textile pattern files and pattern metadata.'],
  ['Swatches', 'Color palettes, fabric swatches, and material tokens.'],
  ['Templates', 'Reusable garment starting points and block templates.'],
];

export function assetLibraryPage() {
  const cards = assetGroups
    .map(
      ([title, description]) => `
        <article class="surface-card">
          <h2>${title}</h2>
          <p>${description}</p>
        </article>
      `,
    )
    .join('');

  return createPageShell({
    eyebrow: 'Local assets',
    title: 'Assets',
    description:
      'Keep references, patterns, colors, and templates in a tidy offline library prepared for future import tools.',
    body: `<div class="asset-grid">${cards}</div>`,
  });
}
