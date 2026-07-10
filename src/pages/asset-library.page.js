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
    title: 'Asset library',
    description:
      'Asset folders are separated by purpose so future import, sync, compression, and indexing features stay clean.',
    body: `<div class="asset-grid">${cards}</div>`,
  });
}
