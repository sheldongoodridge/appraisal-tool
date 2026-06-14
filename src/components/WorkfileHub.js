import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getClients, createClient,
  getLenders, createLender,
  updateInspection,
} from '../services/api';

const API_BASE = 'https://spokeappraisal.com/api';

async function patchSection(id, section, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, data }),
  });
  if (!res.ok) throw new Error('Workfile save failed');
}

const DEFAULT_WF = {
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

const WORKFLOW_STATUSES = [
  'Active', 'Inspection Scheduled', 'Inspection Complete',
  'Report In Progress', 'Report Complete', 'Invoiced', 'Closed',
];
const BILLING_STATUSES  = ['Unbilled', 'Invoiced', 'Paid', 'Overdue'];
const INTENDED_USE_OPTIONS = [
  'First Mortgage Financing Purposes Only',
  'Refinancing Purposes',
  'Estate Planning Purposes',
  'Separation/Divorce Purposes',
  'Personal Guarantee',
  'Private Sale',
  'Other',
];
const RELATIONSHIP_OPTIONS = ['Realtor', 'Tenant', 'Owner', 'Property Manager', 'Other'];
const PAYMENT_OPTIONS      = ['Client', 'Lender', 'AMC', 'Applicant', 'Other'];
const PROPERTY_ID_TYPES    = ['PIN', 'Roll #', 'PID', 'Other'];
const LOT_SIZE_UNITS       = ['sqft', 'acres', 'hectares', 'm²'];
const ZONING_TYPES         = ['Residential', 'Industrial', 'Agricultural', 'Multi-Residential', 'Other'];
const BILLING_COLORS = {
  Unbilled: { bg: 'rgba(107,114,128,0.12)', color: '#4b5563' },
  Invoiced: { bg: 'rgba(59,130,246,0.12)',  color: '#1d4ed8' },
  Paid:     { bg: 'rgba(39,174,96,0.12)',   color: '#1a7a3f' },
  Overdue:  { bg: 'rgba(239,68,68,0.12)',   color: '#b91c1c' },
};

function mergeWithDefaults(wd) {
  if (!wd || Object.keys(wd).length === 0) return DEFAULT_WF;
  return {
    order:    { ...DEFAULT_WF.order,    ...(wd.order    || {}) },
    contacts: {
      applicant:        { ...DEFAULT_WF.contacts.applicant,        ...(wd.contacts?.applicant        || {}) },
      access_contact_1: { ...DEFAULT_WF.contacts.access_contact_1, ...(wd.contacts?.access_contact_1 || {}) },
      access_contact_2: { ...DEFAULT_WF.contacts.access_contact_2, ...(wd.contacts?.access_contact_2 || {}) },
    },
    property: { ...DEFAULT_WF.property, ...(wd.property || {}) },
    site:     { ...DEFAULT_WF.site,     ...(wd.site     || {}) },
  };
}

export default function WorkfileHub({ inspection, onInspectionUpdate, onNavigate }) {
  const [wf, setWf]              = useState(() => mergeWithDefaults(inspection?.workfile_data));
  const [fileNumber, setFileNum]  = useState(inspection?.property_data?.fileNumber     || '');
  const [workflow,   setWorkflow] = useState(inspection?.property_data?.workflowStatus || 'Active');
  const [billing,    setBilling]  = useState(inspection?.property_data?.billingStatus  || 'Unbilled');
  const [clients,    setClients]  = useState([]);
  const [lenders,    setLenders]  = useState([]);
  const [saveStatus, setSave]     = useState(''); // '' | 'saving' | 'saved'
  const [expanded,   setExpanded] = useState({
    order: true, contacts: true, property: true, site: true, inspection: true,
  });

  const sectionTimers = useRef({});
  const propTimer     = useRef(null);
  const fadeTimer     = useRef(null);
  const id            = inspection?.id;

  useEffect(() => {
    Promise.all([getClients(), getLenders()])
      .then(([c, l]) => { setClients(c); setLenders(l); })
      .catch(() => {});
  }, []);

  // Auto-initialize workfile_data on the server when a workfile has never been
  // opened in WorkfileHub (empty object coming from legacy or brand-new creation).
  useEffect(() => {
    const wd = inspection?.workfile_data;
    if (!wd || Object.keys(wd).length === 0) {
      Promise.all([
        patchSection(id, 'order',    DEFAULT_WF.order),
        patchSection(id, 'contacts', DEFAULT_WF.contacts),
        patchSection(id, 'property', DEFAULT_WF.property),
        patchSection(id, 'site',     DEFAULT_WF.site),
      ]).catch(() => {});
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    Object.values(sectionTimers.current).forEach(clearTimeout);
    clearTimeout(propTimer.current);
    clearTimeout(fadeTimer.current);
  }, []);

  const markSaved = useCallback(() => {
    setSave('saved');
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setSave(''), 2500);
  }, []);

  const queueSectionSave = useCallback((section, data) => {
    setSave('saving');
    clearTimeout(sectionTimers.current[section]);
    sectionTimers.current[section] = setTimeout(async () => {
      try   { await patchSection(id, section, data); markSaved(); }
      catch  { setSave(''); }
    }, 2000);
  }, [id, markSaved]);

  const queuePropSave = useCallback((updates) => {
    setSave('saving');
    clearTimeout(propTimer.current);
    propTimer.current = setTimeout(async () => {
      try {
        await updateInspection(id, {
          property:      { ...inspection.property_data, ...updates },
          roomAllocation: inspection.room_allocation || {},
        });
        if (onInspectionUpdate) onInspectionUpdate();
        markSaved();
      } catch { setSave(''); }
    }, 2000);
  }, [id, inspection, onInspectionUpdate, markSaved]);

  const changeOrder = (field, value) => {
    const updated = { ...wf.order, [field]: value };
    setWf(p => ({ ...p, order: updated }));
    queueSectionSave('order', updated);
  };

  const changeContact = (contact, field, value) => {
    const updated = { ...wf.contacts, [contact]: { ...wf.contacts[contact], [field]: value } };
    setWf(p => ({ ...p, contacts: updated }));
    queueSectionSave('contacts', updated);
  };

  const changeProperty = (field, value) => {
    const updated = { ...wf.property, [field]: value };
    setWf(p => ({ ...p, property: updated }));
    queueSectionSave('property', updated);
  };

  const changeSite = (field, value) => {
    const updated = { ...wf.site, [field]: value };
    setWf(p => ({ ...p, site: updated }));
    queueSectionSave('site', updated);
  };

  const saveAll = async () => {
    setSave('saving');
    Object.keys(sectionTimers.current).forEach(k => clearTimeout(sectionTimers.current[k]));
    clearTimeout(propTimer.current);
    try {
      await Promise.all([
        patchSection(id, 'order',    wf.order),
        patchSection(id, 'contacts', wf.contacts),
        patchSection(id, 'property', wf.property),
        patchSection(id, 'site',     wf.site),
        updateInspection(id, {
          property: { ...inspection.property_data, fileNumber, workflowStatus: workflow, billingStatus: billing },
          roomAllocation: inspection.room_allocation || {},
        }),
      ]);
      if (onInspectionUpdate) onInspectionUpdate();
      markSaved();
    } catch { setSave(''); }
  };

  const addClient = async () => {
    const name = window.prompt('New client company name:');
    if (!name?.trim()) return;
    try {
      const c = await createClient({ company_name: name.trim() });
      setClients(p => [...p, c]);
      changeOrder('orderer_id', c.id);
    } catch { alert('Failed to create client'); }
  };

  const addLender = async () => {
    const name = window.prompt('New lender company name:');
    if (!name?.trim()) return;
    try {
      const l = await createLender({ company_name: name.trim() });
      setLenders(p => [...p, l]);
      changeOrder('intended_user', String(l.id));
    } catch { alert('Failed to create lender'); }
  };

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const spokeNum      = `SF-${String(id).padStart(5, '0')}`;
  const address       = inspection?.property_data?.address || '—';
  const appraisalType = inspection?.property_data?.appraisalType || '';
  const canInspect    = ['Full Appraisal', 'Progress Inspection'].includes(appraisalType);
  const billingStyle  = BILLING_COLORS[billing] || BILLING_COLORS.Unbilled;

  return (
    <div className="wfh-container">

      {/* ── TOP BAR ── */}
      <div className="wfh-topbar">
        <div className="wfh-topbar-fields">
          <div className="wfh-topbar-field">
            <span className="wfh-topbar-label">Spoke File #</span>
            <span className="wfh-topbar-readonly">{spokeNum}</span>
          </div>
          <div className="wfh-topbar-field">
            <span className="wfh-topbar-label">Appraiser File #</span>
            <input
              className="wfh-topbar-input"
              value={fileNumber}
              onChange={e => { setFileNum(e.target.value); queuePropSave({ fileNumber: e.target.value }); }}
              placeholder="Your file #"
            />
          </div>
          <div className="wfh-topbar-field">
            <span className="wfh-topbar-label">Order Ref #</span>
            <input
              className="wfh-topbar-input"
              value={wf.order.order_ref}
              onChange={e => changeOrder('order_ref', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="wfh-topbar-field">
            <span className="wfh-topbar-label">Status</span>
            <select
              className="wfh-topbar-select"
              value={workflow}
              onChange={e => { setWorkflow(e.target.value); queuePropSave({ workflowStatus: e.target.value }); }}
            >
              {WORKFLOW_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="wfh-topbar-field">
            <span className="wfh-topbar-label">Billing</span>
            <select
              className="wfh-billing-select"
              value={billing}
              onChange={e => { setBilling(e.target.value); queuePropSave({ billingStatus: e.target.value }); }}
              style={{ background: billingStyle.bg, color: billingStyle.color }}
            >
              {BILLING_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="wfh-topbar-right">
          <span className={`wfh-save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
          <button className="btn btn-primary btn-small" onClick={saveAll}>Save</button>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div className="wfh-action-bar">
        {[
          { icon: '🔍', label: 'Inspection', view: 'inspection' },
          { icon: '📄', label: 'Report',     view: 'report'     },
          { icon: '📷', label: 'Photos',     view: 'photos'     },
          { icon: '📁', label: 'Documents',  view: 'documents'  },
        ].map(({ icon, label, view }) => (
          <button
            key={view}
            className="wfh-action-btn"
            onClick={() => onNavigate && onNavigate(view)}
          >
            <span className="wfh-action-icon">{icon}</span>
            <span className="wfh-action-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── ORDER DETAILS ── */}
      <div className="form-section">
        <div className="section-header" onClick={() => toggle('order')}>
          <h2>📋 Order Details</h2>
          <span className="toggle-icon">{expanded.order ? '▼' : '▶'}</span>
        </div>
        {expanded.order && (
          <div className="section-content">
            <div className="form-group">
              <label>Property Address</label>
              <div className="wfh-readonly-field">{address}</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Orderer (Client)</label>
                <select
                  value={wf.order.orderer_id ?? ''}
                  onChange={e => changeOrder('orderer_id', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Select Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <button className="wfh-add-link" onClick={addClient}>+ Add New Client</button>
              </div>
              <div className="form-group">
                <label>Mortgage Reference #</label>
                <input
                  type="text"
                  value={wf.order.mortgage_ref}
                  onChange={e => changeOrder('mortgage_ref', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Appraisal Type</label>
              <div className="wfh-readonly-field">
                {appraisalType
                  ? <span className="inspection-type-badge">{appraisalType}</span>
                  : '—'}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Intended Use</label>
                <select
                  value={wf.order.intended_use}
                  onChange={e => changeOrder('intended_use', e.target.value)}
                >
                  <option value="">— Select —</option>
                  {INTENDED_USE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                {wf.order.intended_use === 'Other' && (
                  <input
                    type="text"
                    className="other-input"
                    value={wf.order.intended_use_other}
                    onChange={e => changeOrder('intended_use_other', e.target.value)}
                    placeholder="Describe intended use…"
                  />
                )}
              </div>
              <div className="form-group">
                <label>Intended User (Lender)</label>
                <select
                  value={wf.order.intended_user}
                  onChange={e => changeOrder('intended_user', e.target.value)}
                >
                  <option value="">— Select Lender —</option>
                  {lenders.map(l => <option key={l.id} value={String(l.id)}>{l.company_name}</option>)}
                </select>
                <button className="wfh-add-link" onClick={addLender}>+ Add New Lender</button>
              </div>
            </div>

            <div className="form-group">
              <label>Responsible for Payment</label>
              <div className="radio-group">
                {PAYMENT_OPTIONS.map(opt => (
                  <label key={opt} className="radio-label">
                    <input
                      type="radio"
                      name={`resp_pay_${id}`}
                      value={opt}
                      checked={wf.order.responsible_for_payment === opt}
                      onChange={() => changeOrder('responsible_for_payment', opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {wf.order.responsible_for_payment === 'Other' && (
                <input
                  type="text"
                  className="other-input"
                  value={wf.order.responsible_other}
                  onChange={e => changeOrder('responsible_other', e.target.value)}
                  placeholder="Specify…"
                  style={{ marginTop: 10 }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Inspection Date & Time</label>
              <input
                type="datetime-local"
                value={wf.order.inspection_datetime || ''}
                onChange={e => changeOrder('inspection_datetime', e.target.value || null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── CONTACT DETAILS ── */}
      <div className="form-section">
        <div className="section-header" onClick={() => toggle('contacts')}>
          <h2>👤 Contact Details</h2>
          <span className="toggle-icon">{expanded.contacts ? '▼' : '▶'}</span>
        </div>
        {expanded.contacts && (
          <div className="section-content">
            <ContactBlock
              heading="Applicant"
              data={wf.contacts.applicant}
              onChange={(f, v) => changeContact('applicant', f, v)}
              showRelationship={false}
            />
            <ContactBlock
              heading="Access Contact 1"
              data={wf.contacts.access_contact_1}
              onChange={(f, v) => changeContact('access_contact_1', f, v)}
              showRelationship
            />
            <ContactBlock
              heading="Access Contact 2"
              data={wf.contacts.access_contact_2}
              onChange={(f, v) => changeContact('access_contact_2', f, v)}
              showRelationship
            />
          </div>
        )}
      </div>

      {/* ── PROPERTY DETAILS ── */}
      <div className="form-section">
        <div className="section-header" onClick={() => toggle('property')}>
          <h2>🏛️ Property Details</h2>
          <span className="toggle-icon">{expanded.property ? '▼' : '▶'}</span>
        </div>
        {expanded.property && (
          <div className="section-content">
            <div className="form-group">
              <label>Legal Description</label>
              <textarea
                rows={3}
                value={wf.property.legal_description}
                onChange={e => changeProperty('legal_description', e.target.value)}
                placeholder="Full legal description…"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Municipality</label>
                <input
                  type="text"
                  value={wf.property.municipality}
                  onChange={e => changeProperty('municipality', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Property ID Type</label>
                <select
                  value={wf.property.property_id_type}
                  onChange={e => changeProperty('property_id_type', e.target.value)}
                >
                  {PROPERTY_ID_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Property ID</label>
                <input
                  type="text"
                  value={wf.property.property_id}
                  onChange={e => changeProperty('property_id', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Assessed Value</label>
                <div className="wfh-prefix-wrap">
                  <span className="wfh-prefix">$</span>
                  <input type="number" value={wf.property.assessed_value} onChange={e => changeProperty('assessed_value', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label>Property Taxes <span className="wfh-unit-hint">/ yr</span></label>
                <div className="wfh-prefix-wrap">
                  <span className="wfh-prefix">$</span>
                  <input type="number" value={wf.property.taxes} onChange={e => changeProperty('taxes', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label>
                  Condo Fees <span className="wfh-unit-hint">/ mo</span>
                  <span className="wfh-inline-na">
                    <input
                      type="checkbox"
                      checked={wf.property.condo_fees_na}
                      onChange={e => changeProperty('condo_fees_na', e.target.checked)}
                    />
                    N/A
                  </span>
                </label>
                {wf.property.condo_fees_na ? (
                  <div className="wfh-na-pill">N/A</div>
                ) : (
                  <div className="wfh-prefix-wrap">
                    <span className="wfh-prefix">$</span>
                    <input type="number" value={wf.property.condo_fees} onChange={e => changeProperty('condo_fees', e.target.value)} placeholder="0" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SITE DETAILS ── */}
      <div className="form-section">
        <div className="section-header" onClick={() => toggle('site')}>
          <h2>🏠 Site Details</h2>
          <span className="toggle-icon">{expanded.site ? '▼' : '▶'}</span>
        </div>
        {expanded.site && (
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Lot Dimensions</label>
                <input
                  type="text"
                  value={wf.site.lot_dimensions}
                  onChange={e => changeSite('lot_dimensions', e.target.value)}
                  placeholder="50.00 ft x 100.00 ft"
                />
              </div>
              <div className="form-group">
                <label>Lot Size</label>
                <div className="wfh-unit-wrap">
                  <input
                    type="number"
                    value={wf.site.lot_size}
                    onChange={e => changeSite('lot_size', e.target.value)}
                    placeholder="0"
                  />
                  <select
                    className="wfh-unit-select"
                    value={wf.site.lot_size_unit}
                    onChange={e => changeSite('lot_size_unit', e.target.value)}
                  >
                    {LOT_SIZE_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Zoning</label>
                <select
                  value={wf.site.zoning}
                  onChange={e => changeSite('zoning', e.target.value)}
                >
                  <option value="">— Select —</option>
                  {ZONING_TYPES.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INSPECTION ── */}
      <div className="form-section">
        <div className="section-header" onClick={() => toggle('inspection')}>
          <h2>📊 Inspection</h2>
          <span className="toggle-icon">{expanded.inspection ? '▼' : '▶'}</span>
        </div>
        {expanded.inspection && (
          <div className="section-content">
            {wf.order.inspection_datetime ? (
              <div className="wfh-insp-summary">
                <div className="wfh-insp-row">
                  <span className="wfh-insp-label">Date</span>
                  <span>{new Date(wf.order.inspection_datetime).toLocaleString()}</span>
                </div>
                <div className="wfh-insp-row">
                  <span className="wfh-insp-label">Status</span>
                  <span className={`wf-status-badge ${workflow === 'Inspection Complete' ? 'wf-status-complete' : 'wf-status-active'}`}>
                    {workflow === 'Inspection Complete' ? 'Complete' : 'In Progress'}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  style={{ marginTop: 14 }}
                  onClick={() => onNavigate && onNavigate('inspection')}
                >
                  View Inspection →
                </button>
              </div>
            ) : canInspect ? (
              <>
                <p className="wfh-empty-hint">No inspection recorded yet.</p>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => onNavigate && onNavigate('inspection')}
                >
                  🔍 Start Inspection
                </button>
              </>
            ) : (
              <p className="wfh-empty-hint">
                Inspection not applicable for{' '}
                <strong>{appraisalType || 'this appraisal type'}</strong>.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function ContactBlock({ heading, data, onChange, showRelationship }) {
  return (
    <div className="wfh-contact-block">
      <h3 className="wfh-contact-heading">{heading}</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={data.name} onChange={e => onChange('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="text" value={data.phone} onChange={e => onChange('phone', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="text" value={data.email} onChange={e => onChange('email', e.target.value)} />
        </div>
        {showRelationship && (
          <div className="form-group">
            <label>Relationship</label>
            <select value={data.relationship} onChange={e => onChange('relationship', e.target.value)}>
              <option value="">— Select —</option>
              {RELATIONSHIP_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
