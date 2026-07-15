# Asset Organization

OffDesign separates user-facing creative assets by usage so future import,
indexing, thumbnailing, and offline storage code can evolve independently.

- `fonts/` stores bundled type assets.
- `images/` stores product imagery, references, and static illustrations.
- `patterns/` stores repeatable textile pattern assets.
- `swatches/` stores palettes, fabric samples, and material previews.
- `templates/` stores reusable garment blocks and starter files.

## Bundled open-source garment artwork

The editable garment starter artwork is stored in `public/templates/fluent/` so it
is packaged with the PWA and remains available offline. It consists of selected
Microsoft Fluent Emoji SVG assets, used under the MIT license. The original
license text is retained alongside the files as `LICENSE.txt`.

Source: https://github.com/microsoft/fluentui-emoji
