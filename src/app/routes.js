import { assetLibraryPage } from '../pages/asset-library.page.js';
import { dashboardPage } from '../pages/dashboard.page.js';
import { designsPage } from '../pages/designs.page.js';
import { editorPlaceholderPage } from '../pages/editor-placeholder.page.js';
import { notFoundPage } from '../pages/not-found.page.js';
import { settingsPage } from '../pages/settings.page.js';

export const routes = [
  {
    path: '/',
    label: 'Workspace',
    title: 'Workspace',
    render: dashboardPage,
    nav: true,
  },
  {
    path: '/designs',
    label: 'Designs',
    title: 'Designs',
    render: designsPage,
    nav: true,
  },
  {
    path: '/editor',
    label: 'Editor',
    title: 'Editor Foundation',
    render: editorPlaceholderPage,
    nav: true,
  },
  {
    path: '/assets',
    label: 'Assets',
    title: 'Asset Library',
    render: assetLibraryPage,
    nav: true,
  },
  {
    path: '/settings',
    label: 'Settings',
    title: 'Settings',
    render: settingsPage,
    nav: true,
  },
  {
    path: '*',
    title: 'Page Not Found',
    render: notFoundPage,
    nav: false,
  },
];
