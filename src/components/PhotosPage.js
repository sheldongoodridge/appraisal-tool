import { useState, useEffect } from 'react';
import { getPhotos } from '../services/api';
import './PhotosPage.css';

const FLOOR_DISPLAY = {
  basement: 'Basement',
  main:     'Main',
  second:   '2nd Floor',
  third:    '3rd Floor',
  fourth:   '4th Floor',
};

function collectPhotos(workfileData) {
  const run = workfileData?.inspections?.[0];
  if (!run) return [];

  const photos = [];

  (run.exterior?.photos || []).forEach(p => {
    photos.push({ ...p, floorDisplay: 'Exterior', roomLabel: p.label || 'Exterior' });
  });

  Object.entries(run.floors || {}).forEach(([floorKey, floor]) => {
    const floorDisplay = FLOOR_DISPLAY[floorKey] || floorKey;

    (floor.photos || []).forEach(p => {
      photos.push({ ...p, floorDisplay, roomLabel: p.label || 'System' });
    });

    (floor.rooms || []).forEach(room => {
      (room.photos || []).forEach(p => {
        photos.push({ ...p, floorDisplay, roomLabel: room.label || p.label || 'Room' });
      });
    });
  });

  return photos;
}

export default function PhotosPage({ inspection, onBack }) {
  const [legacyPhotos, setLegacyPhotos] = useState([]);
  const [filterLabel,  setFilterLabel]  = useState('All');

  useEffect(() => {
    getPhotos(inspection.id)
      .then(setLegacyPhotos)
      .catch(() => {});
  }, [inspection.id]);

  const newPhotos = collectPhotos(inspection.workfile_data);

  // Only fall back to legacy photos when the new inspection system has none.
  // When both sources exist, the same upload appears in both tables (room='inspection'
  // in the legacy table), so mixing them produces duplicates with wrong labels.
  const legacyMapped = newPhotos.length === 0
    ? legacyPhotos.map(p => ({
        id:           String(p.id),
        url:          p.file_path,
        roomLabel:    p.room || 'Untagged',
        floorDisplay: 'Legacy',
        notes:        p.notes || '',
        synced:       true,
      }))
    : [];

  const allPhotos = [...newPhotos, ...legacyMapped];
  const allLabels = ['All', ...new Set(allPhotos.map(p => p.roomLabel).filter(Boolean))];
  const filtered  = filterLabel === 'All' ? allPhotos : allPhotos.filter(p => p.roomLabel === filterLabel);
  const pendingCt = filtered.filter(p => p.url?.startsWith('blob:')).length;

  const handleDownloadAll = async () => {
    for (const photo of filtered) {
      if (!photo.url || photo.url.startsWith('blob:')) continue;
      try {
        const res  = await fetch(photo.url);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${photo.floorDisplay}-${photo.roomLabel}.jpg`
          .replace(/[^a-z0-9._-]/gi, '-');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        await new Promise(r => setTimeout(r, 250));
      } catch {
        window.open(photo.url, '_blank');
      }
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-header">
        <button className="pp-back-btn" onClick={onBack}>← Back to Workfile</button>
        <h1 className="pp-title">📷 Photos</h1>
        <p className="pp-address">{inspection.property_data?.address || '—'}</p>
      </div>

      <div className="pp-toolbar">
        <div className="pp-filter-group">
          <label className="pp-filter-label">Filter by:</label>
          <select
            className="pp-filter-select"
            value={filterLabel}
            onChange={e => setFilterLabel(e.target.value)}
          >
            {allLabels.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <span className="pp-count">
          {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
          {pendingCt > 0 && (
            <span className="pp-pending-hint"> · {pendingCt} pending sync</span>
          )}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="pp-empty">
          <p>No photos {filterLabel !== 'All' ? `labeled "${filterLabel}"` : 'yet'}.</p>
          {allPhotos.length === 0 && (
            <p className="pp-empty-hint">Photos are added during the inspection.</p>
          )}
        </div>
      ) : (
        <div className="pp-grid">
          {filtered.map(photo => (
            <div key={photo.id} className="pp-card">
              <div className="pp-thumb-wrap">
                {photo.url
                  ? <img src={photo.url} alt={photo.roomLabel} className="pp-thumb" />
                  : <div className="pp-thumb-placeholder">📷</div>
                }
                {photo.url?.startsWith('blob:') && (
                  <div className="pp-pending-badge">☁️</div>
                )}
              </div>
              <div className="pp-card-meta">
                <span className="pp-room-badge">{photo.roomLabel}</span>
                <span className="pp-floor-badge">{photo.floorDisplay}</span>
                {photo.flooring && (
                  <span className="pp-flooring-badge">{photo.flooring}</span>
                )}
              </div>
              {photo.notes && <p className="pp-notes">{photo.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {filtered.some(p => p.url && !p.url.startsWith('blob:')) && (
        <div className="pp-download-bar">
          <button className="pp-download-btn" onClick={handleDownloadAll}>
            ⬇️ Download All Photos
          </button>
          {pendingCt > 0 && (
            <span className="pp-download-hint">Pending-sync photos are excluded</span>
          )}
        </div>
      )}
    </div>
  );
}
