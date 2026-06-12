import { useState, useRef } from 'react';
import { uploadPhoto } from '../../services/api';
import { addToQueue } from '../../utils/photoQueue';
import { processPendingQueue } from '../../utils/syncManager';

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
  uploading,         // retained — used only in graceful-degradation fallback
  setUploading,      // retained — used only in graceful-degradation fallback
  showFlooring       = false,
  flooringLabels     = [],
  requiredNoteLabels = [],
}) {
  const [pending,       setPending]       = useState(null);
  const [inLabel,       setInLabel]       = useState(false);
  const [selected,      setSelected]      = useState('');
  const [otherText,     setOtherText]     = useState('');
  const [flooring,      setFlooring]      = useState('');
  const [flooringOther, setFlooringOther] = useState('');
  const [notes,         setNotes]         = useState('');
  const [saving,        setSaving]        = useState(false);

  const cameraRef = useRef(null);
  const fileRef   = useRef(null);

  const enterLabelMode = () => { setInLabel(true);  onLabelModeChange?.(true);  };
  const exitLabelMode  = () => { setInLabel(false); onLabelModeChange?.(false); };

  // File selected — save blob locally and enter label mode immediately (no upload wait)
  const handleFile = (file) => {
    if (!file) return;
    setPending({ file, preview: URL.createObjectURL(file) });
    enterLabelMode();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const label         = selected === 'Other' ? (otherText.trim() || 'Other') : selected;
    const finalFlooring = flooring === 'Other' ? (flooringOther.trim() || 'Other') : flooring;

    try {
      const localId = await addToQueue({
        inspection_id: inspectionId,
        blob:     pending.file,
        blob_url: pending.preview,
        metadata: { label, flooring: finalFlooring, notes, timestamp: new Date().toISOString() },
      });

      onPhotoAdded({
        id:       localId,
        url:      pending.preview,
        synced:   false,
        label,
        flooring: finalFlooring,
        notes,
        timestamp: new Date().toISOString(),
      });

      if (navigator.onLine) processPendingQueue();
      reset();
    } catch {
      // IndexedDB unavailable — fall back to direct upload
      await fallbackDirectUpload(label, finalFlooring);
    } finally {
      setSaving(false);
    }
  };

  // Only runs if IndexedDB is genuinely unavailable (very rare)
  const fallbackDirectUpload = async (label, finalFlooring) => {
    const tempId = crypto.randomUUID();
    setUploading?.(prev => ({ ...prev, [tempId]: 0 }));
    try {
      const result = await uploadPhoto(inspectionId, pending.file, 'inspection', (pct) => {
        setUploading?.(prev => ({ ...prev, [tempId]: pct }));
      });
      onPhotoAdded({
        id:       tempId,
        db_id:    result.id,
        url:      result.file_path,
        filename: result.filename,
        synced:   true,
        label,
        flooring: finalFlooring,
        notes,
        timestamp: new Date().toISOString(),
      });
    } catch {
      alert('Photo upload failed. Please check your connection and try again.');
    } finally {
      setUploading?.(prev => { const n = { ...prev }; delete n[tempId]; return n; });
    }
    reset();
  };

  const handleSkip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const localId = await addToQueue({
        inspection_id: inspectionId,
        blob:     pending.file,
        blob_url: pending.preview,
        metadata: { label: '', flooring: '', notes: '', timestamp: new Date().toISOString() },
      });
      onPhotoAdded({
        id: localId, url: pending.preview, synced: false,
        label: '', flooring: '', notes: '', timestamp: new Date().toISOString(),
      });
      if (navigator.onLine) processPendingQueue();
    } catch {
      // IndexedDB unavailable on skip — discard the photo silently
    } finally {
      setSaving(false);
    }
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

  const needsFlooring = showFlooring && flooringLabels.includes(selected);
  const needsNotes    = requiredNoteLabels.includes(selected);
  const canSave       = selected &&
    !(selected === 'Other' && !otherText.trim()) &&
    !(needsNotes && !notes.trim());

  // ── Label panel (shown immediately after file selection) ──
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
          disabled={!canSave || saving}
        >
          {saving ? 'Saving…' : '✓ Save Photo & Label'}
        </button>

        <button className="it-skip-btn" onClick={handleSkip} disabled={saving}>
          Skip label
        </button>
      </div>
    );
  }

  // ── Capture buttons ──
  return (
    <div className="it-photo-capture">
      <button className="it-capture-btn" onClick={() => cameraRef.current?.click()}>
        📷 Take Photo
      </button>

      <button className="it-upload-btn" onClick={() => fileRef.current?.click()}>
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
