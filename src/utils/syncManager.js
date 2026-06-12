import { getPending, getAll, markUploading, markUploaded, markFailed, clearUploaded } from './photoQueue';
import { uploadPhoto } from '../services/api';

let syncInProgress = false;
let syncInterval   = null;
let onPhotoSynced  = null;
let onStatusChange = null;

export function setOnPhotoSynced(cb)  { onPhotoSynced  = cb; }
export function setOnStatusChange(cb) { onStatusChange = cb; }

export async function processPendingQueue() {
  if (syncInProgress || !navigator.onLine) return;
  syncInProgress = true;
  onStatusChange?.();

  try {
    const pending = await getPending();
    for (const photo of pending) {
      if (photo.attempts >= 3) continue;
      try {
        await markUploading(photo.id);
        onStatusChange?.();

        const result = await uploadPhoto(
          photo.inspection_id,
          photo.blob,
          'inspection',
          null,
        );

        await markUploaded(photo.id, result.file_path);
        onPhotoSynced?.({
          local_id:   photo.id,
          spaces_url: result.file_path,
          db_id:      result.id,
          filename:   result.filename,
        });
        onStatusChange?.();
      } catch (err) {
        console.error('Sync failed for photo', photo.id, err);
        await markFailed(photo.id);
        onStatusChange?.();
      }
    }
    await clearUploaded();
  } finally {
    syncInProgress = false;
    onStatusChange?.();
  }
}

export function startBackgroundSync() {
  window.addEventListener('online', processPendingQueue);
  if (!syncInterval) {
    syncInterval = setInterval(processPendingQueue, 30_000);
  }
}

export function stopBackgroundSync() {
  window.removeEventListener('online', processPendingQueue);
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function getSyncStatus() {
  try {
    const all = await getAll();
    return {
      pending:   all.filter(p => p.status === 'pending').length,
      uploading: all.filter(p => p.status === 'uploading').length,
      failed:    all.filter(p => p.status === 'failed').length,
    };
  } catch {
    return { pending: 0, uploading: 0, failed: 0 };
  }
}
