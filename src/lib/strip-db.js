const DB_NAME = 'flashback-booth-db';
const DB_VERSION = 1;
const STORE_NAME = 'strips';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStrip(dataUrl) {
  if (!dataUrl) return;

  const db = await openDb();

  const id = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({ dataUrl, createdAt: Date.now() });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return id;
}

export async function getRecentStrips(limit = 12) {
  const db = await openDb();

  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  db.close();

  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function clearAllStrips() {
  const db = await openDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function getStripById(id) {
  const db = await openDb();

  const row = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return row;
}
