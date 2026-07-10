export const appConfig = {
  name: import.meta.env.VITE_APP_NAME ?? 'OffDesign',
  environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
  databaseName: 'offdesign-local',
  databaseVersion: 1,
  serviceWorkerUrl: '/sw.js',
};
