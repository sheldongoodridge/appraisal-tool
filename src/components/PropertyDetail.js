import { useState, useEffect } from 'react';
import { getProperty, updateProperty } from '../services/api';

const ENTRY_LABELS = {
  inspection: { label: 'Spoke Inspection', color: '#2563eb' },
  order:      { label: 'CRAL Order',       color: '#7c3aed' },
};

export default function PropertyDetail({ propertyId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({});
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    getProperty(propertyId)
      .then(d => {
        setData(d);
        setForm(flattenProperty(d.property));
      })
      .catch(() => setError('Could not load property.'))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const flattenProperty = (p) => ({
    year_built:        p.year_built        ?? '',
    property_type:     p.property_type     ?? '',
    design_style:      p.design_style      ?? '',
    construction:      p.construction      ?? '',
    foundation:        p.foundation        ?? '',
    sqft_main:         p.sqft_main         ?? '',
    sqft_second:       p.sqft_second       ?? '',
    sqft_third:        p.sqft_third        ?? '',
    sqft_basement:     p.sqft_basement     ?? '',
    bedrooms:          p.bedrooms          ?? '',
    full_bathrooms:    p.full_bathrooms    ?? '',
    partial_bathrooms: p.partial_bathrooms ?? '',
    lot_size:          p.lot_size          ?? '',
    zoning:            p.zoning            ?? '',
    city:              p.city              ?? '',
    province:          p.province          ?? '',
    postal_code:       p.postal_code       ?? '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProperty(propertyId, form);
      setData(d => ({ ...d, property: updated }));
      setEditing(false);
    } catch {
      alert('Failed to save property changes.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, opts = {}) => (
    <div className="pd-field" key={key}>
      <span className="pd-label">{label}</span>
      {editing ? (
        opts.select ? (
          <select
            value={form[key] ?? ''}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="pd-input"
          >
            <option value="">—</option>
            {opts.select.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={opts.type || 'text'}
            value={form[key] ?? ''}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="pd-input"
          />
        )
      ) : (
        <span className="pd-value">{data?.property[key] ?? '—'}</span>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card pd-modal" onClick={e => e.stopPropagation()}>

        {loading && <p className="pd-loading">Loading property…</p>}
        {error   && <p className="pd-error">{error}</p>}

        {!loading && !error && data && (<>

          <div className="pd-header">
            <div>
              <h2 className="pd-address">{data.property.address}</h2>
              <small className="pd-meta">
                {[data.property.city, data.property.province].filter(Boolean).join(', ')}
                {data.property.postal_code ? ' · ' + data.property.postal_code : ''}
              </small>
            </div>
            <div className="pd-header-actions">
              {editing ? (
                <>
                  <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-small" onClick={() => { setEditing(false); setForm(flattenProperty(data.property)); }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-small" onClick={() => setEditing(true)}>Edit</button>
              )}
              <button className="btn btn-small pd-close" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="pd-body">
            <div className="pd-characteristics">
              <h3 className="pd-section-title">Property Characteristics</h3>

              <div className="pd-grid-2">
                {field('Year Built',     'year_built',    { type: 'number' })}
                {field('Property Type',  'property_type')}
                {field('Design Style',   'design_style')}
                {field('Construction',   'construction')}
                {field('Foundation',     'foundation')}
                {field('Lot Size',       'lot_size')}
                {field('Zoning',         'zoning')}
              </div>

              <h4 className="pd-subsection-title">Floor Areas (sq ft)</h4>
              <div className="pd-grid-4">
                {field('Main',     'sqft_main',     { type: 'number' })}
                {field('Second',   'sqft_second',   { type: 'number' })}
                {field('Third',    'sqft_third',    { type: 'number' })}
                {field('Basement', 'sqft_basement', { type: 'number' })}
              </div>

              <h4 className="pd-subsection-title">Rooms</h4>
              <div className="pd-grid-3">
                {field('Bedrooms',         'bedrooms',          { type: 'number' })}
                {field('Full Bathrooms',   'full_bathrooms',    { type: 'number' })}
                {field('Partial Bathrooms','partial_bathrooms', { type: 'number' })}
              </div>
            </div>

            <div className="pd-timeline">
              <h3 className="pd-section-title">
                Property History
                <span className="pd-count">{data.timeline.length} entries</span>
              </h3>

              {data.timeline.length === 0 ? (
                <p className="pd-empty">No history yet.</p>
              ) : (
                <div className="pd-timeline-list">
                  {data.timeline.map((entry, i) => {
                    const meta = ENTRY_LABELS[entry.entry_type] || { label: entry.entry_type, color: '#555' };
                    const dateStr = entry.entry_date
                      ? new Date(entry.entry_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—';
                    return (
                      <div className="pd-entry" key={entry.id ?? i}>
                        <div className="pd-entry-dot" style={{ background: meta.color }} />
                        <div className="pd-entry-body">
                          <div className="pd-entry-top">
                            <span className="pd-entry-type" style={{ color: meta.color }}>{meta.label}</span>
                            <span className="pd-entry-date">{dateStr}</span>
                          </div>
                          <div className="pd-entry-detail">
                            {entry.form_type && <span>{entry.form_type}</span>}
                            {entry.client    && <span>· {entry.client}</span>}
                            {entry.appraiser && <span>· {entry.appraiser}</span>}
                            {entry.status    && <span className="pd-status">{entry.status}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
