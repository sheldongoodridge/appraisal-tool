import { useState, useEffect, useRef } from 'react';
import { getClients, getLenders, searchProperties, createInspection } from '../services/api';

const API_BASE = 'https://spokeappraisal.com/api';

const DEFAULT_SECTIONS = {
  order: {
    order_ref: '', orderer_id: null, mortgage_ref: '',
    intended_use: '', intended_use_other: '',
    intended_user: '', responsible_for_payment: '',
    responsible_other: '', inspection_datetime: null,
  },
  contacts: {
    applicant:        { name: '', phone: '', email: '' },
    access_contact_1: { name: '', phone: '', email: '', relationship: '' },
    access_contact_2: { name: '', phone: '', email: '', relationship: '' },
  },
  property: {
    legal_description: '', municipality: '',
    property_id_type: 'PIN', property_id: '',
    assessed_value: '', taxes: '', condo_fees: '', condo_fees_na: false,
  },
  site: { lot_dimensions: '', lot_size: '', lot_size_unit: 'sqft', zoning: '' },
};

const APPRAISAL_TYPES = [
  'Full Appraisal', 'Drive-By', 'Desktop', 'Market Rent', 'Progress Inspection',
];

async function patchSection(id, section, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, data }),
  });
  if (!res.ok) throw new Error(`Failed to initialize ${section}`);
}

export default function NewWorkfileModal({ onCreated, onCancel }) {
  const [address,       setAddress]       = useState('');
  const [suggestions,   setSuggestions]   = useState([]);
  const [showSuggest,   setShowSuggest]   = useState(false);
  const [appraisalType, setAppraisalType] = useState('');
  const [clientId,      setClientId]      = useState('');
  const [lenderId,      setLenderId]      = useState('');
  const [clients,       setClients]       = useState([]);
  const [lenders,       setLenders]       = useState([]);
  const [creating,      setCreating]      = useState(false);
  const [error,         setError]         = useState('');

  const searchTimer = useRef(null);

  useEffect(() => {
    Promise.all([getClients(), getLenders()])
      .then(([c, l]) => { setClients(c); setLenders(l); })
      .catch(() => {});
  }, []);

  const handleAddressChange = (value) => {
    setAddress(value);
    setShowSuggest(false);
    clearTimeout(searchTimer.current);
    if (value.length >= 3) {
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await searchProperties(value);
          setSuggestions(results);
          setShowSuggest(results.length > 0);
        } catch { /* silent */ }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (prop) => {
    setAddress(prop.address);
    setShowSuggest(false);
    setSuggestions([]);
  };

  // Small delay so onClick on suggestion fires before blur hides it
  const handleAddressBlur = () => setTimeout(() => setShowSuggest(false), 150);

  const handleCreate = async () => {
    if (!address.trim()) { setError('Property address is required.'); return; }
    setError('');
    setCreating(true);

    const selectedClient = clients.find(c => c.id === Number(clientId));

    try {
      // Create the inspection record
      const inspection = await createInspection({
        property: {
          address:      address.trim(),
          appraisalType,
          clientName:   selectedClient?.company_name || '',
        },
        roomAllocation: {},
      });

      // Initialise all 4 workfile_data sections in parallel
      // Wire client/lender selections into the order section
      await Promise.all([
        patchSection(inspection.id, 'order', {
          ...DEFAULT_SECTIONS.order,
          version:       2,
          orderer_id:    clientId ? Number(clientId) : null,
          intended_user: lenderId ? String(lenderId) : '',
        }),
        patchSection(inspection.id, 'contacts', DEFAULT_SECTIONS.contacts),
        patchSection(inspection.id, 'property', DEFAULT_SECTIONS.property),
        patchSection(inspection.id, 'site',     DEFAULT_SECTIONS.site),
      ]);

      onCreated(inspection);
    } catch (err) {
      console.error('Create workfile error:', err);
      setError('Failed to create workfile. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-box">

        <div className="modal-header">
          <h2>New Workfile</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          {/* Address with autofill */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Property Address <span className="required-star">*</span></label>
            <input
              type="text"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              onBlur={handleAddressBlur}
              placeholder="Start typing an address…"
              autoFocus
            />
            {showSuggest && (
              <div className="address-suggestions">
                {suggestions.map(p => (
                  <div
                    key={p.id}
                    className="address-suggestion-item"
                    onClick={() => selectSuggestion(p)}
                  >
                    <div className="suggestion-address">{p.address}</div>
                    {p.city && <div className="suggestion-meta">{p.city}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appraisal Type */}
          <div className="form-group">
            <label>Appraisal Type</label>
            <select value={appraisalType} onChange={e => setAppraisalType(e.target.value)}>
              <option value="">— Select —</option>
              {APPRAISAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Client */}
          <div className="form-group">
            <label>Client (Orderer)</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— Select Client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          {/* Lender */}
          <div className="form-group">
            <label>Lender (Intended User)</label>
            <select value={lenderId} onChange={e => setLenderId(e.target.value)}>
              <option value="">— Select Lender —</option>
              {lenders.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-small" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button
            className="btn btn-gold btn-small"
            onClick={handleCreate}
            disabled={creating || !address.trim()}
          >
            {creating ? 'Creating…' : 'Create Workfile'}
          </button>
        </div>

      </div>
    </div>
  );
}
