import { withStore } from '../storage/database.js';
import { storeNames } from '../storage/stores.js';

export async function getSetting(key) {
  return withStore(storeNames.settings, 'readonly', (store) => requestToPromise(store.get(key)));
}

export async function setSetting(key, value) {
  const record = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  await withStore(storeNames.settings, 'readwrite', (store) => store.put(record));
  return record;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
