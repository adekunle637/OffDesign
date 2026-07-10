const cachePrefix = 'offdesign-';

export async function getStorageSummary() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    usage,
    quota,
    percentage: quota ? Math.min(Math.round((usage / quota) * 100), 100) : 0,
  };
}

export async function clearCachedAppFiles() {
  if (!('caches' in window)) {
    return 0;
  }

  const keys = await caches.keys();
  const targets = keys.filter((key) => key.startsWith(cachePrefix) && key.endsWith('-runtime'));
  await Promise.all(targets.map((key) => caches.delete(key)));
  return targets.length;
}

export function formatBytes(bytes) {
  if (!bytes) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}
