import { useState } from 'react';
import PhotoCapture from './PhotoCapture';

const EXTERIOR_LABELS = [
  'Front', 'Street', 'Rear', 'Side',
  'Yard/Landscaping', 'Site Improvement',
  'Outbuilding', 'Garage/Parking', 'Other',
];

const DRIVEBY_LABELS = ['Street View', 'Front of Property', 'Other'];

const CLADDING_OPTIONS = [
  'Brick', 'Vinyl Siding', 'Aluminum Siding', 'Wood Siding',
  'Stucco', 'Stone', 'EIFS', 'Combination', 'Other',
];

const ROOFING_OPTIONS = [
  'Asphalt Shingle', 'Metal', 'Tile', 'Flat/Built-up',
  'Cedar Shake', 'Rubber Membrane', 'Other',
];

const WINDOW_OPTIONS = [
  'Vinyl', 'Wood', 'Aluminum', 'Vinyl Clad Wood', 'Other',
];

const CONDITION_OPTIONS = ['Good', 'Average', 'Fair', 'Poor'];
const PARKING_TYPES     = ['Garage', 'Carport', 'Driveway', 'None', 'Other'];
const STALL_OPTIONS     = ['1', '2', '3', '3+', 'Other'];

function progressSteps(data) {
  const extDone = data.exterior.photos.length > 0;
  const steps = [
    { key: 'exterior', label: 'Outside', status: extDone ? 'done' : 'active' },
    { key: 'basement', label: 'B',       status: data.floors.basement.photos.length > 0 ? 'done' : 'pending' },
    { key: 'main',     label: 'Main',    status: data.floors.main.rooms.length > 0     ? 'done' : 'pending' },
  ];
  if (data.floors.second.active)
    steps.push({ key: 'second', label: '2nd', status: data.floors.second.rooms.length > 0 ? 'done' : 'pending' });
  if (data.floors.third.active)
    steps.push({ key: 'third',  label: '3rd', status: data.floors.third.rooms.length  > 0 ? 'done' : 'pending' });
  return steps;
}

export default function ExteriorScreen({
  inspection, data, updateData, saveNow,
  isDriveby, uploading, setUploading, setScreen,
}) {
  const [isLabeling, setIsLabeling] = useState(false);
  const ext = data.exterior;

  const handlePhotoAdded = (photo) => {
    updateData(prev => ({
      ...prev,
      exterior: { ...prev.exterior, photos: [...prev.exterior.photos, photo] },
      photos_total: prev.photos_total + 1,
    }));
  };

  const updateExt = (field, value) => {
    updateData(prev => ({ ...prev, exterior: { ...prev.exterior, [field]: value } }));
  };

  const updateParking = (field, value) => {
    updateData(prev => ({
      ...prev,
      exterior: { ...prev.exterior, parking: { ...prev.exterior.parking, [field]: value } },
    }));
  };

  // ── Drive-By layout ──
  if (isDriveby) {
    return (
      <div className="it-screen">
        <header className="it-header">
          <button className="it-back-btn" onClick={() => setScreen('start')}>← Back</button>
          <span className="it-header-title">DRIVE-BY</span>
          <button className="it-next-btn" onClick={() => setScreen('review')}>Complete ✓</button>
        </header>

        <div className="it-content">
          <p className="it-start-address" style={{ marginBottom: 24 }}>
            {inspection.property_data?.address}
          </p>

          <PhotoCapture
            inspectionId={inspection.id}
            labels={DRIVEBY_LABELS}
            onPhotoAdded={handlePhotoAdded}
            onLabelModeChange={setIsLabeling}
            uploading={uploading}
            setUploading={setUploading}
          />

          {!isLabeling && ext.photos.length > 0 && (
            <>
              <div className="it-photo-count">{ext.photos.length} photo{ext.photos.length !== 1 ? 's' : ''} captured</div>
              <div className="it-photo-grid">
                {ext.photos.map(p => (
                  <div key={p.id} className="it-photo-thumb">
                    <img src={p.url} alt={p.label || 'exterior'} />
                    {p.label && <div className="it-photo-label-chip">{p.label}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLabeling && (
            <button className="it-primary-action-btn" onClick={() => setScreen('review')}>
              ✓ Complete Drive-By
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Full appraisal exterior layout ──
  const steps = progressSteps(data);

  return (
    <div className="it-screen">
      <header className="it-header">
        <button className="it-back-btn" onClick={() => setScreen('start')}>← Back</button>
        <span className="it-header-title">EXTERIOR</span>
        <button className="it-next-btn" onClick={() => setScreen('questionnaire')}>Go Inside →</button>
      </header>

      {!isLabeling && (
        <div className="it-progress-bar">
          {steps.map(s => (
            <span key={s.key} className={`it-progress-step ${s.status}`}>
              {s.label} {s.status === 'done' ? '✅' : s.status === 'active' ? '🔄' : '⬜'}
            </span>
          ))}
        </div>
      )}

      <div className="it-content">
        <PhotoCapture
          inspectionId={inspection.id}
          labels={EXTERIOR_LABELS}
          onPhotoAdded={handlePhotoAdded}
          onLabelModeChange={setIsLabeling}
          uploading={uploading}
          setUploading={setUploading}
        />

        {!isLabeling && (
          <>
            {ext.photos.length > 0 && (
              <>
                <div className="it-photo-count">
                  {ext.photos.length} photo{ext.photos.length !== 1 ? 's' : ''} captured
                </div>
                <div className="it-photo-grid">
                  {ext.photos.map(p => (
                    <div key={p.id} className="it-photo-thumb">
                      <img src={p.url} alt={p.label || 'exterior'} />
                      {p.label && <div className="it-photo-label-chip">{p.label}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Exterior Observations ── */}
            <div className="it-section-heading">Exterior Observations</div>

            <div className="it-field-group">
              <label className="it-field-label">Cladding / Exterior Finish</label>
              <select className="it-select" value={ext.cladding} onChange={e => updateExt('cladding', e.target.value)}>
                <option value="">— Select —</option>
                {CLADDING_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {ext.cladding === 'Other' && (
                <input className="it-other-input" type="text" placeholder="Describe…" value={ext.cladding_other || ''} onChange={e => updateExt('cladding_other', e.target.value)} />
              )}
            </div>

            <div className="it-field-group">
              <label className="it-field-label">Roofing</label>
              <select className="it-select" value={ext.roofing} onChange={e => updateExt('roofing', e.target.value)}>
                <option value="">— Select —</option>
                {ROOFING_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {ext.roofing === 'Other' && (
                <input className="it-other-input" type="text" placeholder="Describe…" value={ext.roofing_other || ''} onChange={e => updateExt('roofing_other', e.target.value)} />
              )}
            </div>

            <div className="it-field-group">
              <label className="it-field-label">Window Casements</label>
              <select className="it-select" value={ext.windows} onChange={e => updateExt('windows', e.target.value)}>
                <option value="">— Select —</option>
                {WINDOW_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {ext.windows === 'Other' && (
                <input className="it-other-input" type="text" placeholder="Describe…" value={ext.windows_other || ''} onChange={e => updateExt('windows_other', e.target.value)} />
              )}
            </div>

            <div className="it-field-group">
              <label className="it-field-label">Condition</label>
              <div className="it-radio-row">
                {CONDITION_OPTIONS.map(c => (
                  <label key={c} className={`it-radio-chip ${ext.condition === c ? 'selected' : ''}`}>
                    <input type="radio" name="ext-condition" value={c} checked={ext.condition === c} onChange={() => updateExt('condition', c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="it-field-group">
              <label className="it-field-label">Notes</label>
              <textarea
                className="it-textarea"
                rows={3}
                value={ext.notes}
                onChange={e => updateExt('notes', e.target.value)}
                placeholder="Additional observations…"
              />
            </div>

            {/* ── Parking ── */}
            <div className="it-section-heading">Parking</div>

            <div className="it-field-group">
              <label className="it-field-label">Type</label>
              <div className="it-chip-row">
                {PARKING_TYPES.map(t => (
                  <button
                    key={t}
                    className={`it-chip ${ext.parking.type === t ? 'selected' : ''}`}
                    onClick={() => updateParking('type', ext.parking.type === t ? '' : t)}
                  >{t}</button>
                ))}
              </div>
              {ext.parking.type === 'Other' && (
                <input className="it-other-input" type="text" placeholder="Describe…" value={ext.parking.type_other || ''} onChange={e => updateParking('type_other', e.target.value)} />
              )}
            </div>

            <div className="it-field-group">
              <label className="it-field-label">Stalls</label>
              <div className="it-chip-row">
                {STALL_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`it-chip ${ext.parking.stalls === s ? 'selected' : ''}`}
                    onClick={() => updateParking('stalls', ext.parking.stalls === s ? '' : s)}
                  >{s}</button>
                ))}
              </div>
              {ext.parking.stalls === 'Other' && (
                <input className="it-other-input" type="text" placeholder="Number of stalls…" value={ext.parking.stalls_other || ''} onChange={e => updateParking('stalls_other', e.target.value)} />
              )}
            </div>

            <button className="it-primary-action-btn" onClick={() => setScreen('questionnaire')}>
              Go Inside →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
