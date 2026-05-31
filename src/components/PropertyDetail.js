import { useState, useEffect } from 'react';
import { getProperty, updateProperty } from '../services/api';

export default function PropertyDetail({ propertyId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line no-unused-vars

  useEffect(() => {
    getProperty(propertyId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load property.'); setLoading(false); });
  }, [propertyId]);

  const handleSave = async () => {
    if (!Object.keys(editing).length) return;
    setSaving(true);
    try {
      const updated = await updateProperty(propertyId, editing);
      setData(d => ({ ...d, property: { ...d.property, ...updated } }));
      setEditing({});
    } catch { alert('Failed to save changes.'); }
    finally { setSaving(false); }
  };

  const field = (label, key, type = 'text') => {
    const val = editing[key] !== undefined ? editing[key] : (data?.property?.[key] ?? '');
    return (
      <div className="pd-field">
        <span className="pd-label">{label}</span>
        <input
          className="pd-input"
          type={type}
          value={val}
          onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))}
        />
      </div>
    );
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card pd-modal" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="pd-loading">Loading…</div>
        ) : error ? (
          <div className="pd-error">{error}</div>
        ) : (
          <>
            <div className="pd-header">
              <div>
                <h3 className="pd-address">{data.property?.address}</h3>
                <p className="pd-meta">{[data.property?.city, data.property?.province].filter(Boolean).join(', ')}</p>
              </div>
              <div className="pd-header-actions">
                {Object.keys(editing).length > 0 && (
                  <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
                <button className="btn btn-small pd-close" onClick={onClose}>✕</button>
              </div>
            </div>

            <div className="pd-body">
              <div className="pd-characteristics">
                <p className="pd-section-title">Property Details</p>
                <div className="pd-grid-2">
                  {field('Year Built', 'year_built', 'number')}
                  {field('Bedrooms', 'bedrooms', 'number')}
                  {field('Property Type', 'property_type')}
                  {field('Design Style', 'design_style')}
                  {field('Construction', 'construction')}
                  {field('Foundation', 'foundation')}
                </div>
                <p className="pd-subsection-title" style={{ marginTop: 16 }}>Area</p>
                <div className="pd-grid-4">
                  {field('Main (sqft)', 'sqft_main', 'number')}
                  {field('Second (sqft)', 'sqft_second', 'number')}
                  {field('Third (sqft)', 'sqft_third', 'number')}
                  {field('Basement (sqft)', 'sqft_basement', 'number')}
                </div>
                <p className="pd-subsection-title" style={{ marginTop: 16 }}>Site</p>
                <div className="pd-grid-2">
                  {field('Lot Size', 'lot_size')}
                  {field('Zoning', 'zoning')}
                </div>
              </div>

              <div className="pd-timeline">
                <p className="pd-section-title">
                  Appraisal History
                  <span className="pd-count">{data.timeline?.length || 0} order{data.timeline?.length !== 1 ? 's' : ''}</span>
                </p>
                {(!data.timeline || data.timeline.length === 0) ? (
                  <p className="pd-empty">No appraisal history for this property.</p>
                ) : (
                  <div className="pd-timeline-list">
                    {data.timeline.map((entry, i) => (
                      <div key={i} className="pd-entry">
                        <div className="pd-entry-dot" style={{ background: '#D6A319' }} />
                        <div className="pd-entry-body">
                          <div className="pd-entry-top">
                            <span className="pd-entry-type">{entry.form_type || 'Appraisal'}</span>
                            <span className="pd-entry-date">{entry.order_date ? new Date(entry.order_date).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="pd-entry-detail">
                            {entry.client_name && <span>{entry.client_name}</span>}
                            {entry.status && <span className="pd-status">{entry.status}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
