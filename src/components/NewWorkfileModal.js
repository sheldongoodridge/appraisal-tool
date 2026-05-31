import { useState } from 'react';
import { createInspection, searchProperties } from '../services/api';

export default function NewWorkfileModal({ clients, lenders, onClose, onCreated }) {
  const [appraisalType, setAppraisalType] = useState('');
  const [address, setAddress] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [orderedByName, setOrderedByName] = useState('');
  const [lenderId, setLenderId] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [lenderNA, setLenderNA] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleAddressChange = async (e) => {
    const q = e.target.value;
    setAddress(q);
    if (q.length >= 3) {
      try { setAddressSuggestions(await searchProperties(q)); }
      catch { /* silent */ }
    } else {
      setAddressSuggestions([]);
    }
  };

  const handleClientSelect = (clientCode) => {
    const client = clients.find(c => c.client_code === clientCode);
    if (client) {
      setOrderedBy(client.client_code);
      setOrderedByName(client.company_name);
    } else {
      setOrderedBy(''); setOrderedByName('');
    }
  };

  const handleLenderSelect = (id) => {
    const lender = lenders.find(l => String(l.id) === id);
    if (lender) {
      setLenderId(id); setLenderName(lender.company_name); setLenderNA(false);
    } else {
      setLenderId(''); setLenderName('');
    }
  };

  const handleCreate = async () => {
    if (!address.trim()) { setError('Property address is required.'); return; }
    setCreating(true);
    setError('');
    try {
      const newWorkfile = await createInspection({
        property: {
          appraisalType, address, orderedBy, orderedByName,
          lenderId, lenderName, lenderNA,
          clientName: '', inspectionDate: '', authorizedUser: '', authorizedUse: '',
          authorizedUseOther: '', yearBuilt: '', propertyType: '', designStyle: '',
          construction: '', foundationWalls: 'Concrete', roofing: '', roofingCondition: 'Average',
          exteriorFinish: '', exteriorCondition: 'Average', windows: '', heatingSystem: '',
          heatingFuel: '', coolingSystem: '', electrical: 'Breakers', ampRating: '100',
          waterHeater: '', wallFinish: 'Drywall', ceilingFinish: 'Drywall',
          flooring1: '', flooring2: '', flooring3: '', flooring4: '', flooring5: '',
          builtInCooktop: false, builtInOven: false, builtInDishwasher: false,
          builtInMicrowave: false, builtInGarburator: false, builtInRangeHood: false,
          hasBasement: true, basementArea: '', basementFinishPercent: '',
          utilityNaturalGas: false, utilityStormSewer: false, utilitySanitarySewer: false,
          utilitySeptic: false, utilityHoldingTank: false, utilityOpenDitch: false,
          waterMunicipal: false, waterPrivateWell: false,
          electricalOverhead: false, electricalUnderground: false,
          featurePavedRoad: false, featureGravelRoad: false, featureLane: false,
          featureSidewalk: false, featureCurbs: false, featureStreetlights: false,
          landscaping: 'Average', inFloodplain: false, floodMapDate: '',
          garageType: '', garageSize: '', drivewayType: '', lotSize: '', zoning: '', zoningDescription: '',
        },
        roomAllocation: {
          main:     { entrance:0, living:0, dining:0, kitchen:0, family:0, bedrooms:0, den:0, fullBath:0, partBath:0, laundry:0, other:0, sqft:'' },
          second:   { entrance:0, living:0, dining:0, kitchen:0, family:0, bedrooms:0, den:0, fullBath:0, partBath:0, laundry:0, other:0, sqft:'' },
          third:    { entrance:0, living:0, dining:0, kitchen:0, family:0, bedrooms:0, den:0, fullBath:0, partBath:0, laundry:0, other:0, sqft:'' },
          basement: { entrance:0, living:0, dining:0, kitchen:0, family:0, bedrooms:0, den:0, fullBath:0, partBath:0, laundry:0, other:0, sqft:'' },
        },
        photos: [],
        order_reference: orderReference || null,
      });
      onCreated(newWorkfile);
    } catch (err) {
      console.error('Create workfile error:', err);
      setError('Failed to create workfile. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card new-workfile-modal" onClick={e => e.stopPropagation()}>
        <h3>New Workfile</h3>

        <div className="form-group">
          <label>Appraisal Type</label>
          <select value={appraisalType} onChange={e => setAppraisalType(e.target.value)} className="appraisal-type-select">
            <option value="">-- Select Appraisal Type --</option>
            <option value="Full Appraisal">Full Appraisal</option>
            <option value="Drive-By">Drive-By</option>
            <option value="Desktop">Desktop</option>
            <option value="Market Rent">Market Rent</option>
            <option value="Progress Inspection">Progress Inspection</option>
          </select>
        </div>

        <div className="form-group">
          <label>Property Address <span style={{ color: '#ef4444' }}>*</span></label>
          <div className="address-autocomplete">
            <input
              type="text" value={address} onChange={handleAddressChange}
              onBlur={() => setTimeout(() => setAddressSuggestions([]), 200)}
              placeholder="123 Main St, Toronto, ON" autoComplete="off"
            />
            {addressSuggestions.length > 0 && (
              <ul className="address-suggestions">
                {addressSuggestions.map(s => (
                  <li key={s.id} onMouseDown={() => { setAddress(s.address); setAddressSuggestions([]); }}>
                    <strong>{s.address}</strong>
                    <small>{[s.year_built && `Built ${s.year_built}`, s.bedrooms && `${s.bedrooms} bed`].filter(Boolean).join(' · ')}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Client (Ordered By)</label>
            <select value={orderedBy} onChange={e => handleClientSelect(e.target.value)}>
              <option value="">-- Select Client --</option>
              {clients.map(c => (
                <option key={c.client_code} value={c.client_code}>
                  {c.company_name}{c.client_code ? ` (${c.client_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Lender</label>
            <div className="lender-field-row">
              <select value={lenderId} onChange={e => handleLenderSelect(e.target.value)} disabled={lenderNA}>
                <option value="">-- Select Lender --</option>
                {lenders.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
              <label className="checkbox-label">
                <input type="checkbox" checked={lenderNA} onChange={e => { setLenderNA(e.target.checked); if (e.target.checked) { setLenderId(''); setLenderName(''); } }} />
                N/A
              </label>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Order Reference # <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
          <input type="text" value={orderReference} onChange={e => setOrderReference(e.target.value)} placeholder="e.g. ABC-12345" />
        </div>

        {error && <p style={{ color: '#ef4444', margin: '8px 0 0', fontSize: 14 }}>{error}</p>}

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !address.trim()}>
            {creating ? 'Creating…' : 'Create Workfile'}
          </button>
          <button className="btn btn-small" onClick={onClose} disabled={creating}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
