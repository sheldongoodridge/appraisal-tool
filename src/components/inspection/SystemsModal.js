import { useState, useEffect } from 'react';

const SYSTEMS_CONFIG = {
  'Breaker Panel': {
    fields: [
      { key: 'electrical_amps', label: 'Amps', options: ['100', '150', '200', 'Other'] },
      { key: 'electrical_type', label: 'Type', options: ['Fuses', 'Breakers', 'Mixed', 'Other'] },
    ],
  },
  'Hot Water Heater': {
    fields: [
      { key: 'water_heater', label: 'Type', options: ['Gas Tank', 'Electric Tank', 'Gas Tankless', 'Electric Tankless', 'Heat Pump', 'Other'] },
    ],
  },
  'Furnace': {
    fields: [
      { key: 'heating', label: 'System', options: ['Forced Air', 'Hot Water', 'Baseboard', 'In-Floor Radiant', 'Other'] },
      { key: 'fuel',    label: 'Fuel',   options: ['Natural Gas', 'Propane', 'Oil', 'Electric', 'Other'] },
    ],
  },
  'Air Conditioning': {
    fields: [
      { key: 'cooling', label: 'Type', options: ['Central Air', 'Heat Pump', 'Mini-Split', 'Window Units', 'Other'] },
    ],
  },
};

export default function SystemsModal({ label, onSave, onClose }) {
  const config = SYSTEMS_CONFIG[label];
  const [selections,  setSelections]  = useState({});
  const [otherValues, setOtherValues] = useState({});

  // HRV/ERV and Other System have no secondary prompt — auto-dismiss
  useEffect(() => {
    if (!config) onSave({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config) return null;

  const setField = (key, val) => setSelections(prev => ({ ...prev, [key]: val }));
  const setOther = (key, val) => setOtherValues(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const result = {};
    config.fields.forEach(f => {
      result[f.key] = selections[f.key] === 'Other'
        ? (otherValues[f.key]?.trim() || 'Other')
        : (selections[f.key] || '');
    });
    onSave(result);
  };

  return (
    <div className="it-sys-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="it-sys-modal">

        <div className="it-sys-header">
          <span className="it-sys-title">{label}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="it-sys-body">
          {config.fields.map(field => (
            <div key={field.key} className="it-field-group">
              <label className="it-field-label">{field.label}</label>
              <div className="it-chip-row">
                {field.options.map(opt => (
                  <button
                    key={opt}
                    className={`it-chip ${selections[field.key] === opt ? 'selected' : ''}`}
                    onClick={() => setField(field.key, opt)}
                  >{opt}</button>
                ))}
              </div>
              {selections[field.key] === 'Other' && (
                <input
                  type="text"
                  className="it-other-input"
                  placeholder="Specify…"
                  value={otherValues[field.key] || ''}
                  onChange={e => setOther(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="it-sys-footer">
          <button className="it-save-photo-btn" onClick={handleSave}>Save</button>
          <button className="it-skip-btn" onClick={() => onSave({})}>Skip</button>
        </div>

      </div>
    </div>
  );
}
