import { assetLibraryPage } from '../pages/asset-library.page.js';
import { dashboardPage } from '../pages/dashboard.page.js';
import { designsPage } from '../pages/designs.page.js';
import { editorPlaceholderPage } from '../pages/editor-placeholder.page.js';
import { libraryPlaceholderPage } from '../pages/library-placeholder.page.js';
import { notFoundPage } from '../pages/not-found.page.js';
import { templateLibraryPage } from '../pages/template-library.page.js';
import { workspacePage } from '../pages/workspace.page.js';

export const routes = [
  {
    path: '/',
    label: 'Home',
    title: 'Home',
    render: dashboardPage,
    nav: true,
  },
  {
    path: '/design-clothes',
    title: 'Design Clothes',
    render: () => workspacePage('clothes'),
    nav: false,
  },
  {
    path: '/create-logo',
    title: 'Create Logo',
    render: () => workspacePage('logo'),
    nav: false,
  },
  {
    path: '/sketch-diagram',
    title: 'Sketch Diagram',
    render: () => workspacePage('sketch'),
    nav: false,
  },
  {
    path: '/projects',
    title: 'My Projects',
    render: designsPage,
    nav: false,
  },
  {
    path: '/templates',
    title: 'Clothing Templates',
    render: templateLibraryPage,
    nav: false,
  },
  {
    path: '/fabric-library',
    title: 'Fabric Library',
    render: () =>
      libraryPlaceholderPage({
        eyebrow: 'Material library',
        title: 'Fabric Library',
        icon: 'layers',
        details: 'A material library will make every concept feel tactile.',
        actionLabel: 'Local asset storage ready',
      }),
    nav: false,
  },
  {
    path: '/color-palette',
    title: 'Color Palette',
    render: () =>
      libraryPlaceholderPage({
        eyebrow: 'Color system',
        title: 'Color Palette',
        icon: 'palette',
        details: 'A place for palettes with purpose is being prepared.',
        actionLabel: 'Swatch storage prepared',
      }),
    nav: false,
  },
  {
    path: '/assets',
    title: 'Assets',
    render: assetLibraryPage,
    nav: false,
  },
  {
    path: '/export',
    title: 'Export',
    render: () =>
      libraryPlaceholderPage({
        eyebrow: 'Output',
        title: 'Export',
        icon: 'download',
        details: 'A considered handoff flow will live here.',
        actionLabel: 'Export workflow intentionally deferred',
      }),
    nav: false,
  },
  {
    path: '/settings',
    title: 'Settings',
    redirect: '/',
    onEnter: () => window.dispatchEvent(new CustomEvent('offdesign:open-settings')),
    nav: false,
  },
  {
    path: '/help',
    title: 'Help',
    render: () =>
      libraryPlaceholderPage({
        eyebrow: 'Guidance',
        title: 'Help & learning',
        icon: 'book-open',
        details: 'Guides and thoughtful tutorials will live here.',
        actionLabel: 'Quick start guide prepared',
      }),
    nav: false,
  },
  {
    path: '/designs',
    title: 'Saved Designs',
    render: designsPage,
    nav: false,
  },
  {
    path: '/editor',
    title: 'Editor Foundation',
    render: editorPlaceholderPage,
    nav: false,
  },
  {
    path: '*',
    title: 'Page Not Found',
    render: notFoundPage,
    nav: false,
  },
];
