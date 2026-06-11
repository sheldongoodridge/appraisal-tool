import { useState, useRef } from 'react';
import { uploadPhoto } from '../../services/api';

const FLOORING_TYPES = [
  'Hardwood', 'Laminate', 'Engineered Hardwood',
  'Vinyl Plank', 'Tile', 'Carpet',
  'Concrete', 'Cork', 'Mixed', 'Other',
];

export default function PhotoCapture({
  inspectionId,
  labels,
  onPhotoAdded,
  onLabelModeChange,
  uploading,
  setUploading,
  // Optional floor-screen props:
  showFlooring      = false, // show flooring dropdown after room label
  flooringLabels    = [],    // which labels trigger the flooring step
  requiredNoteLabels = [],   // which labels require notes before saving
}) {
  const [pending,       setPending]      = useState(null);
  const [inLabel,       setInLabel]      = useState(false);
  const [selected,      setSelected]     = useState('');
  const [otherText,     setOtherText]    = useState('');
  const [flooring,      setFlooring]     = useState('');
  const [flooringOther, setFlooringOther] = useState('');
  const [notes,         setNotes]        = useState('');

  const cameraRef = useRef(null);
  const fileRef   = useRef(null);

  const enterLabelMode = () => { setInLabel(true);  onLabelModeChange?.(true);  };
  const exitLabelMode  = () => { setInLabel(false); onLabelModeChange?.(false); };

  const handleFile = async (file) => {
    if (!file) return;
    const tempId  = crypto.randomUUID();
    const preview = URL.createObjectURL(file);

    setUploading(prev => ({ ...prev, [tempId]: 0 }));
    setPending({ tempId, preview, progress: 0, url: null, dbId: null, filename: file.name });

    try {
      const result = await uploadPhoto(inspectionId, file, 'inspection', (pct) => {
        setUploading(prev => ({ ...prev, [tempId]: pct }));
        setPending(prev => prev?.tempId === tempId ? { ...prev, progress: pct } : prev);
      });

      setUploading(prev => { const n = { ...prev }; delete n[tempId]; return n; });
      setPending({ tempId, preview, progress: 100, url: result.file_path, dbId: result.id, filename: result.filename });
      enterLabelMode();
    } catch (err) {
      console.error('Photo upload failed:', err);
      setUploading(prev => { const n = { ...prev }; delete n[tempId]; return n; });
      setPending(null);
      alert('Photo upload failed. Please try again.');
    }
  };

  const handleSave = () => {
    const label        = selected === 'Other' ? (otherText.trim() || 'Other') : selected;
    const finalFlooring = flooring === 'Other' ? (flooringOther.trim() || 'Other') : flooring;
    onPhotoAdded({
      id:        pending.tempId,
      db_id:     pending.dbId,
      url:       pending.url,
      filename:  pending.filename,
      label,
      flooring:  finalFlooring,
      notes,
      timestamp: new Date().toISOString(),
    });
    reset();
  };

  const handleSkip = () => {
    onPhotoAdded({
      id:        pending.tempId,
      db_id:     pending.dbId,
      url:       pending.url,
      filename:  pending.filename,
      label:     '',
      flooring:  '',
      notes:     '',
      timestamp: new Date().toISOString(),
    });
    reset();
  };

  const reset = () => {
    setPending(null);
    setSelected('');
    setOtherText('');
    setFlooring('');
    setFlooringOther('');
    setNotes('');
    exitLabelMode();
  };

  const isUploading   = pending && pending.progress < 100;
  const needsFlooring = showFlooring && flooringLabels.includes(selected);
  const needsNotes    = requiredNoteLabels.includes(selected);
  const canSave       = selected &&
    !(selected === 'Other' && !otherText.trim()) &&
    !(needsNotes && !notes.trim());

  // ── Label panel (post-upload) ──
  if (inLabel && pending) {
    return (
      <div className="it-label-panel">
        <div className="it-label-preview-wrap">
          <img src={pending.preview} alt="captured" className="it-label-preview-img" />
        </div>

        <p className="it-label-prompt">Label this photo:</p>

        <div className="it-label-chips">
          {labels.map(l => (
            <button
              key={l}
              className={`it-label-chip ${selected === l ? 'selected' : ''}`}
              onClick={() => { setSelected(selected === l ? '' : l); setFlooring(''); setFlooringOther(''); }}
            >{l}</button>
          ))}
        </div>

        {/* Custom label for 'Other' */}
        {selected === 'Other' && (
          <input
            type="text"
            className="it-label-other-input"
            placeholder="Describe this photo…"
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            autoFocus
          />
        )}

        {/* Flooring dropdown for room labels */}
        {needsFlooring && (
          <div className="it-label-field">
            <span className="it-label-sublabel">Flooring</span>
            <select
              className="it-select"
              value={flooring}
              onChange={e => { setFlooring(e.target.value); setFlooringOther(''); }}
            >
              <option value="">— Select flooring —</option>
              {FLOORING_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>
            {flooring === 'Other' && (
              <input
                type="text"
                className="it-other-input"
                placeholder="Describe flooring…"
                value={flooringOther}
                onChange={e => setFlooringOther(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Notes — required hint for Deficiency */}
        {needsNotes && (
          <p className="it-required-note-hint">↓ Notes are required for deficiencies</p>
        )}
        <textarea
          className="it-label-notes"
          placeholder={needsNotes ? 'Describe the deficiency…' : 'Notes (optional)'}
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <button
          className="it-save-photo-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          ✓ Save Photo & Label
        </button>

        <button className="it-skip-btn" onClick={handleSkip}>
          Skip label
        </button>
      </div>
    );
  }

  // ── Capture buttons ──
  return (
    <div className="it-photo-capture">
      {isUploading && (
        <div className="it-upload-progress-wrap">
          <div className="it-upload-bar">
            <div className="it-upload-fill" style={{ width: `${pending.progress}%` }} />
          </div>
          <span className="it-upload-pct">Uploading… {pending.progress}%</span>
        </div>
      )}

      <button
        className="it-capture-btn"
        onClick={() => cameraRef.current?.click()}
        disabled={isUploading}
      >
        📷 Take Photo
      </button>

      <button
        className="it-upload-btn"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
      >
        📁 Upload Photo
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
