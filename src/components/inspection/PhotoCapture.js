import { useState, useRef } from 'react';
import { uploadPhoto } from '../../services/api';

export default function PhotoCapture({
  inspectionId,
  labels,
  onPhotoAdded,
  onLabelModeChange,
  uploading,
  setUploading,
}) {
  const [pending,    setPending]    = useState(null);
  const [inLabel,    setInLabel]    = useState(false);
  const [selected,   setSelected]   = useState('');
  const [otherText,  setOtherText]  = useState('');
  const [notes,      setNotes]      = useState('');

  const cameraRef = useRef(null);
  const fileRef   = useRef(null);

  const enterLabelMode = () => {
    setInLabel(true);
    onLabelModeChange?.(true);
  };

  const exitLabelMode = () => {
    setInLabel(false);
    onLabelModeChange?.(false);
  };

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
    const label = selected === 'Other' ? (otherText.trim() || 'Other') : selected;
    onPhotoAdded({
      id:        pending.tempId,
      db_id:     pending.dbId,
      url:       pending.url,
      filename:  pending.filename,
      label,
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
      notes:     '',
      timestamp: new Date().toISOString(),
    });
    reset();
  };

  const reset = () => {
    setPending(null);
    setSelected('');
    setOtherText('');
    setNotes('');
    exitLabelMode();
  };

  const isUploading = pending && pending.progress < 100;

  // ── Label panel ──
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
              onClick={() => setSelected(selected === l ? '' : l)}
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

        <textarea
          className="it-label-notes"
          placeholder="Notes (optional)"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <button
          className="it-save-photo-btn"
          onClick={handleSave}
          disabled={!selected || (selected === 'Other' && !otherText.trim())}
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
