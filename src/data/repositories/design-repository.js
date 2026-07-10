import { withStore } from '../storage/database.js';
import { storeNames } from '../storage/stores.js';

export async function listDesigns() {
  return withStore(storeNames.designs, 'readonly', (store) => requestToPromise(store.getAll()));
}

export async function saveDesignMetadata(design) {
  const timestamp = new Date().toISOString();
  const record = {
    ...design,
    updatedAt: timestamp,
    createdAt: design.createdAt ?? timestamp,
  };

  await withStore(storeNames.designs, 'readwrite', (store) => store.put(record));
  return record;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
