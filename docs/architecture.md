# OffDesign Architecture

OffDesign is set up as an offline-first Vite application with a modular vanilla
JavaScript core. The current foundation intentionally avoids editor
implementation details while establishing the boundaries the editor will plug
into later.

## Root Files

- `.editorconfig` keeps editor whitespace consistent across contributors.
- `.env.example` documents public Vite environment variables.
- `.gitattributes` normalizes text files.
- `.gitignore` excludes dependencies, builds, coverage, and local noise.
- `.prettierrc.json` defines automated formatting rules.
- `eslint.config.js` defines JavaScript linting for app, service worker, scripts,
  and tests.
- `index.html` is the browser entry document and declares PWA metadata links.
- `package.json` declares npm scripts and development dependencies.
- `vite.config.js` configures dev server, production builds, and tests.
- `README.md` gives quick-start instructions for developers.

## Public PWA Assets

- `public/manifest.webmanifest` makes OffDesign installable and defines icons,
  theme colors, display mode, scope, start URL, and shortcuts.
- `public/sw.js` is the service worker. It precaches the app shell, handles
  offline navigation fallback, and runtime-caches static and same-origin
  resources.
- `public/offline.html` is a minimal fallback if a navigation request cannot be
  served from the normal app shell.
- `public/favicon.svg` and `public/icons/*` provide browser and install icons.
- `public/robots.txt` is a basic crawler directive for deployed environments.

## Source Tree

- `src/main.js` imports global styles and starts the application.
- `src/app/` owns application startup, route declarations, and the small client
  router.
- `src/components/` contains reusable UI components such as the app shell,
  install prompt, and network status.
- `src/config/` centralizes app-level configuration such as database and service
  worker names.
- `src/data/storage/` owns IndexedDB schema and database access helpers.
- `src/data/repositories/` exposes persistence APIs to product modules without
  leaking IndexedDB details.
- `src/pages/` contains route-level placeholder pages for future features.
- `src/pwa/` owns browser-side service worker registration.
- `src/services/` contains domain-neutral application services.
- `src/styles/` is split into tokens, base rules, layout, components, pages, and
  utilities so CSS can scale without becoming one large file.
- `src/utils/` contains small shared helpers.
- `src/assets/` organizes source-controlled creative assets by type.

## Tooling And Support

- `scripts/generate-icons.mjs` regenerates PNG PWA icons from a deterministic
  local icon drawing routine.
- `tests/unit/` contains fast unit tests for foundation behavior.
- `docs/` stores architecture and implementation notes.
