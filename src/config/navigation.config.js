export const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', path: '/', icon: 'house' },
      { label: 'Design Clothes', path: '/design-clothes', icon: 'shirt', badge: 'New' },
      { label: 'Create Logo', path: '/create-logo', icon: 'sparkles' },
      { label: 'Sketch Diagram', path: '/sketch-diagram', icon: 'pen-line' },
      { label: 'My Projects', path: '/projects', icon: 'folder-kanban' },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Clothing Templates', path: '/templates', icon: 'layout-template' },
      { label: 'Fabric Library', path: '/fabric-library', icon: 'layers' },
      { label: 'Color Palette', path: '/color-palette', icon: 'palette' },
      { label: 'Assets', path: '/assets', icon: 'package' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Export', path: '/export', icon: 'download' },
      { label: 'Settings', path: '/settings', icon: 'settings-2' },
      { label: 'Help', path: '/help', icon: 'circle-help' },
    ],
  },
];

export const quickSearchItems = navigationGroups.flatMap((group) => group.items);
