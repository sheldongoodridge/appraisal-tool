import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
  const [filterLabel, setFilterLabel] = useState('All');

  const allPhotos = collectPhotos(inspection.workfile_data);
  const allLabels = ['All', ...new Set(allPhotos.map(p => p.roomLabel).filter(Boolean))];
  const filtered  = filterLabel === 'All' ? allPhotos : allPhotos.filter(p => p.roomLabel === filterLabel);
  const pendingCt = filtered.filter(p => p.url?.startsWith('blob:')).length;

  const handleDownloadAll = async () => {
    const toDownload = filtered.filter(p => p.url && !p.url.startsWith('blob:'));
    if (!toDownload.length) return;

    const zip    = new JSZip();
    const counts = {};

    for (const photo of toDownload) {
      try {
        const res  = await fetch(photo.url);
        const blob = await res.blob();
        const base = `${photo.floorDisplay}-${photo.roomLabel}`
          .replace(/[^a-z0-9._-]/gi, '-');
        counts[base] = (counts[base] || 0) + 1;
        zip.file(`${base}_${counts[base]}.jpg`, blob);
      } catch {
        // skip photos that fail to fetch (CORS or broken URL)
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const addr    = inspection.property_data?.address?.replace(/[^a-z0-9]/gi, '-') || 'photos';
    saveAs(content, `${addr}.zip`);
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
                {photo.url && !photo.url.startsWith('blob:')
                  ? <img
                      src={photo.url}
                      alt={photo.roomLabel}
                      className="pp-thumb"
                      onError={e => {
                        e.target.replaceWith(
                          Object.assign(document.createElement('div'), {
                            className: 'pp-thumb-placeholder',
                            textContent: '⚠️',
                          })
                        );
                      }}
                    />
                  : <div className="pp-thumb-placeholder">
                      {photo.url?.startsWith('blob:') ? '📷' : '⏳'}
                    </div>
                }
                {(!photo.url || photo.url.startsWith('blob:')) && (
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
