import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';
import { defineConfig } from 'vite';

function injectServiceWorkerPrecache() {
  return {
    name: 'offdesign-service-worker-precache',
    apply: 'build',
    async closeBundle() {
      const outputDirectory = join(cwd(), 'dist');
      const serviceWorkerPath = join(outputDirectory, 'sw.js');
      const paths = await listPublicFiles(outputDirectory);
      const precachePaths = paths
        .filter((path) => !path.endsWith('.map') && path !== 'sw.js')
        .map((path) => `/${path.replaceAll('\\', '/')}`);
      const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
      const replacement = JSON.stringify(JSON.stringify(precachePaths));

      await writeFile(
        serviceWorkerPath,
        serviceWorker.replace("'__OFFDESIGN_PRECACHE__'", replacement),
        'utf8',
      );
    },
  };
}

async function listPublicFiles(directory, rootDirectory = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const fileGroups = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listPublicFiles(fullPath, rootDirectory);
      }

      return [relative(rootDirectory, fullPath)];
    }),
  );

  return fileGroups.flat();
}

export default defineConfig({
  appType: 'spa',
  plugins: [injectServiceWorkerPrecache()],
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
