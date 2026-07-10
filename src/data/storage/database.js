import { appConfig } from '../../config/app.config.js';
import { storeDefinitions } from './stores.js';

let databasePromise;

export function initializeLocalDatabase() {
  if (!('indexedDB' in window)) {
    throw new Error('This browser does not support IndexedDB, which OffDesign requires offline.');
  }

  databasePromise ??= openDatabase();
  return databasePromise;
}

export async function withStore(storeName, mode, callback) {
  const database = await initializeLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = callback(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(appConfig.databaseName, appConfig.databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      applySchema(database);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function applySchema(database) {
  storeDefinitions.forEach((definition) => {
    const store = database.objectStoreNames.contains(definition.name)
      ? null
      : database.createObjectStore(definition.name, definition.options);

    if (!store) {
      return;
    }

    definition.indexes.forEach((index) => {
      store.createIndex(index.name, index.keyPath, index.options);
    });
  });
}
