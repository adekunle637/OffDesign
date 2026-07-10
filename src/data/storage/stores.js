export const storeNames = {
  designs: 'designs',
  assets: 'assets',
  settings: 'settings',
  drafts: 'drafts',
  migrations: 'migrations',
};

export const storeDefinitions = [
  {
    name: storeNames.designs,
    options: { keyPath: 'id' },
    indexes: [
      { name: 'updatedAt', keyPath: 'updatedAt' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: storeNames.assets,
    options: { keyPath: 'id' },
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'updatedAt', keyPath: 'updatedAt' },
    ],
  },
  {
    name: storeNames.settings,
    options: { keyPath: 'key' },
    indexes: [],
  },
  {
    name: storeNames.drafts,
    options: { keyPath: 'id' },
    indexes: [{ name: 'updatedAt', keyPath: 'updatedAt' }],
  },
  {
    name: storeNames.migrations,
    options: { keyPath: 'id' },
    indexes: [],
  },
];
