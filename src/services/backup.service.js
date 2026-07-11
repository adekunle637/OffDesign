import { listDesigns, restoreDesignMetadata } from '../data/repositories/design-repository.js';
import { getAllSettings, restoreSettings } from '../data/repositories/settings-repository.js';
import { appConfig } from '../config/app.config.js';

const backupFormat = 'offdesign-backup';
const backupVersion = 1;

export async function createLocalBackup() {
  const [designs, settings] = await Promise.all([listDesigns(), getAllSettings()]);

  return {
    format: backupFormat,
    version: backupVersion,
    application: appConfig.name,
    createdAt: new Date().toISOString(),
    data: { designs, settings },
  };
}

export function downloadBackup(backup) {
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `offdesign-backup-${date}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function restoreLocalBackup(file) {
  const text = await file.text();
  const backup = JSON.parse(text);

  if (
    backup?.format !== backupFormat ||
    backup?.version !== backupVersion ||
    !backup.data ||
    !Array.isArray(backup.data.designs) ||
    !Array.isArray(backup.data.settings)
  ) {
    throw new Error('This file is not a valid OffDesign backup.');
  }

  const [designs, settings] = await Promise.all([
    restoreDesignMetadata(backup.data.designs),
    restoreSettings(backup.data.settings),
  ]);

  return { designs, settings, total: designs + settings };
}
