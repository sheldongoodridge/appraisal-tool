const DB_NAME    = 'spoke-photo-queue';
const DB_VERSION = 1;
const STORE      = 'pending-photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('by_status', 'status');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function getAndUpdate(db, id, updater) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req   = store.get(id);
    req.onsuccess = (e) => {
      const entry = e.target.result;
      if (!entry) return resolve(null);
      const updated = updater(entry);
      const put = store.put(updated);
      put.onsuccess = () => resolve(updated);
      put.onerror   = (ev) => reject(ev.target.error);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function addToQueue({ workfile_id, inspection_id, floor, room_label, blob, blob_url, metadata }) {
  const db    = await openDB();
  const entry = {
    id: crypto.randomUUID(),
    workfile_id:  workfile_id  ?? null,
    inspection_id,
    floor:      floor      ?? '',
    room_label: room_label ?? '',
    blob,
    blob_url,
    metadata: {
      label:     metadata?.label     ?? '',
      flooring:  metadata?.flooring  ?? '',
      notes:     metadata?.notes     ?? '',
      timestamp: metadata?.timestamp ?? new Date().toISOString(),
    },
    status:     'pending',
    attempts:   0,
    created_at: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(entry);
    req.onsuccess = () => resolve(entry.id);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Returns pending + uploading (uploading = interrupted mid-upload, safe to retry)
export async function getPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) =>
      resolve(e.target.result.filter(p => p.status === 'pending' || p.status === 'uploading'));
    req.onerror = (e) => reject(e.target.error);
  });
}

// Used by syncManager.getSyncStatus to count failed entries
export async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// syncManager calls this to claim an entry before uploading (prevents double-upload)
export async function markUploading(id) {
  const db = await openDB();
  return getAndUpdate(db, id, entry => ({ ...entry, status: 'uploading' }));
}

export async function markUploaded(id, spaces_url) {
  const db = await openDB();
  return getAndUpdate(db, id, entry => ({ ...entry, status: 'uploaded', spaces_url }));
}

// After 3 attempts status becomes 'failed' and is no longer retried
export async function markFailed(id) {
  const db = await openDB();
  return getAndUpdate(db, id, entry => {
    const attempts = (entry.attempts ?? 0) + 1;
    return { ...entry, attempts, status: attempts >= 3 ? 'failed' : 'pending' };
  });
}

export async function clearUploaded() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req   = store.index('by_status').openCursor(IDBKeyRange.only('uploaded'));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
      else resolve();
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// Returns count of 'pending' only (not uploading/failed — for the UI badge)
export async function getQueueCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('by_status').count(IDBKeyRange.only('pending'));
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}
