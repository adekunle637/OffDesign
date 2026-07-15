import { withStore } from '../storage/database.js';
import { storeNames } from '../storage/stores.js';

export async function listDesigns() {
  return withStore(storeNames.designs, 'readonly', (store) => requestToPromise(store.getAll()));
}

export async function getDesign(id) {
  return withStore(storeNames.designs, 'readonly', (store) => requestToPromise(store.get(id)));
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

export async function restoreDesignMetadata(designs) {
  const validDesigns = Array.isArray(designs)
    ? designs.filter((design) => design && typeof design.id === 'string')
    : [];

  if (!validDesigns.length) {
    return 0;
  }

  await withStore(storeNames.designs, 'readwrite', (store) => {
    validDesigns.forEach((design) => store.put(design));
  });

  return validDesigns.length;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
