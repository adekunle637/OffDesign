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

export async function getAllSettings() {
  return withStore(storeNames.settings, 'readonly', (store) => requestToPromise(store.getAll()));
}

export async function restoreSettings(records) {
  const validRecords = Array.isArray(records)
    ? records.filter(
        (record) =>
          record && typeof record.key === 'string' && Object.hasOwn(record, 'value'),
      )
    : [];

  if (!validRecords.length) {
    return 0;
  }

  await withStore(storeNames.settings, 'readwrite', (store) => {
    validRecords.forEach((record) => {
      store.put({
        key: record.key,
        value: record.value,
        updatedAt: record.updatedAt ?? new Date().toISOString(),
      });
    });
  });

  return validRecords.length;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
