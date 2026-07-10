export async function getWorkspaceStorageSummary() {
  if (!navigator.storage?.estimate) {
    return {
      supported: false,
      quota: null,
      usage: null,
      usagePercent: null,
    };
  }

  const { quota = 0, usage = 0 } = await navigator.storage.estimate();

  return {
    supported: true,
    quota,
    usage,
    usagePercent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
  };
}
