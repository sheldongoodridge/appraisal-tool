import { useState, useEffect, useCallback, useRef } from 'react';
import './ReportPage.css';
import { DEFAULT_REPORT } from '../utils/defaultReport';

const API_BASE = 'https://spokeappraisal.com/api';

async function patchSection(id, section, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, data }),
  });
  if (!res.ok) throw new Error('Report save failed');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function mergeReport(saved) {
  if (!saved || Object.keys(saved).length === 0) return DEFAULT_REPORT;
  const merged = { ...DEFAULT_REPORT };
  for (const key of Object.keys(DEFAULT_REPORT)) {
    if (saved[key] === undefined) continue;
    const def = DEFAULT_REPORT[key];
    merged[key] = Array.isArray(def) ? saved[key] : { ...def, ...saved[key] };
  }
  return merged;
}

// ─── SECTION DEFINITIONS ─────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'meta',             icon: '📋', label: 'Assignment'        },
  { id: 'cover',            icon: '✉️',  label: 'Cover Letter'      },
  { id: 'summary',          icon: '📊', label: 'Executive Summary' },
  { id: 'neighbourhood',    icon: '🏘️', label: 'Neighbourhood'     },
  { id: 'site',             icon: '🗺️', label: 'Site'              },
  { id: 'improvements',     icon: '🏠', label: 'Improvements'      },
  { id: 'room_allocation',  icon: '🛏️', label: 'Room Allocation'   },
  { id: 'comparables',      icon: '📈', label: 'Direct Comparison' },
  { id: 'cost_approach',    icon: '🔨', label: 'Cost Approach'     },
  { id: 'market_rent',      icon: '🏢', label: 'Market Rent'       },
  { id: 'income_approach',  icon: '💰', label: 'Income Approach'   },
  { id: 'certification',    icon: '✅', label: 'Certification'     },
];

// ─── PLACEHOLDER SECTION COMPONENTS ──────────────────────────────────────────

function SectionPlaceholder({ id, label }) {
  return (
    <div style={{ padding: '32px 0', color: '#9ca3af', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13 }}>Section coming in a future session.</div>
    </div>
  );
}

function MetaSection({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  const setApproach = (key, val) =>
    onChange({ ...data, approaches_used: { ...data.approaches_used, [key]: val } });

  return (
    <div className="report-section-body">
      <div className="form-row">
        <div className="form-group">
          <label>Report Date</label>
          <input type="date" value={data.report_date || ''} onChange={e => set('report_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Effective Date</label>
          <input type="date" value={data.effective_date || ''} onChange={e => set('effective_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Inspection Date</label>
          <input type="date" value={data.inspection_date || ''} onChange={e => set('inspection_date', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Inspection Type</label>
          <select value={data.inspection_type} onChange={e => set('inspection_type', e.target.value)}>
            <option value="">Select…</option>
            <option>Full Inspection Exterior and Interior</option>
            <option>Limited Inspection - Exterior only</option>
            <option>Limited Inspection - from street</option>
            <option>Other (specify)</option>
          </select>
        </div>
        <div className="form-group" style={{ flexShrink: 0 }}>
          <label>Report Type</label>
          <label className="report-checkbox-label">
            <input type="checkbox" checked={data.is_update} onChange={e => set('is_update', e.target.checked)} />
            Update of Original Report
          </label>
        </div>
      </div>

      {data.is_update && (
        <div className="form-row">
          <div className="form-group">
            <label>Original File Number</label>
            <input type="text" value={data.original_file_number} onChange={e => set('original_file_number', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Original Effective Date</label>
            <input type="date" value={data.original_effective_date || ''} onChange={e => set('original_effective_date', e.target.value)} />
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Approaches Used</label>
        <div className="report-checkbox-row">
          {[['dca', 'Direct Comparison'], ['cost', 'Cost Approach'], ['income', 'Income Approach']].map(([key, label]) => (
            <label key={key} className="report-checkbox-label">
              <input type="checkbox" checked={data.approaches_used[key]} onChange={e => setApproach(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummarySection({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="report-section-body">
      <div className="form-row">
        <div className="form-group">
          <label>Final Value Opinion</label>
          <input type="text" placeholder="$" value={data.final_value} onChange={e => set('final_value', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Land Value</label>
          <input type="text" placeholder="$" value={data.land_value} disabled={data.land_value_na} onChange={e => set('land_value', e.target.value)} />
        </div>
        <div className="form-group" style={{ flexShrink: 0 }}>
          <label>&nbsp;</label>
          <label className="report-checkbox-label">
            <input type="checkbox" checked={data.land_value_na} onChange={e => set('land_value_na', e.target.checked)} />
            N/A
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Current List Price</label>
          <input type="text" placeholder="$" value={data.current_list_price} onChange={e => set('current_list_price', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Prior List Price</label>
          <input type="text" placeholder="$" value={data.prior_list_price} onChange={e => set('prior_list_price', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Current Purchase Price</label>
          <input type="text" placeholder="$" value={data.current_purchase_price} onChange={e => set('current_purchase_price', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Last Sold Price</label>
          <input type="text" placeholder="$" value={data.last_sold_price} onChange={e => set('last_sold_price', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Last Sold Date</label>
          <input type="date" value={data.last_sold_date || ''} onChange={e => set('last_sold_date', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label>Exposure Analysis</label>
        <textarea rows={2} value={data.exposure_analysis} onChange={e => set('exposure_analysis', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Reconciliation</label>
        <textarea rows={4} value={data.reconciliation} onChange={e => set('reconciliation', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Trends</label>
        <textarea rows={3} value={data.trends} onChange={e => set('trends', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Report Warnings / Qualifications</label>
        <textarea rows={2} value={data.warnings} onChange={e => set('warnings', e.target.value)} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ReportPage({ inspection, onBack }) {
  const [report, setReport] = useState(() =>
    mergeReport(inspection?.workfile_data?.report)
  );
  const [activeSection, setActiveSection] = useState('meta');
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimer = useRef(null);

  // Re-merge if the inspection prop refreshes (keyed on id so it only
  // fires when a different workfile is loaded, not on every save tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setReport(mergeReport(inspection?.workfile_data?.report));
  }, [inspection?.id]);

  const save = useCallback(async (data) => {
    setSaveStatus('saving');
    try {
      await patchSection(inspection.id, 'report', data);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [inspection.id]);

  const updateSection = useCallback((sectionKey, sectionData) => {
    const updated = { ...report, [sectionKey]: sectionData };
    setReport(updated);
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(updated), 1200);
  }, [report, save]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const activeDef = SECTIONS.find(s => s.id === activeSection);

  function renderSection() {
    switch (activeSection) {
      case 'meta':    return <MetaSection    data={report.meta}    onChange={d => updateSection('meta', d)} />;
      case 'summary': return <SummarySection data={report.summary} onChange={d => updateSection('summary', d)} />;
      default:        return <SectionPlaceholder id={activeSection} label={activeDef?.label} />;
    }
  }

  return (
    <div className="report-page">

      {/* ── TOPBAR ── */}
      <div className="report-topbar">
        <button className="btn btn-small btn-ghost" onClick={onBack}>← Back</button>
        <div className="report-topbar-title">
          <span className="report-topbar-address">
            {inspection?.property_data?.address || 'Draft Report'}
          </span>
          <span className="report-topbar-filenumber">
            {inspection?.property_data?.fileNumber && `· File ${inspection.property_data.fileNumber}`}
          </span>
        </div>
        <span className={`report-save-status ${saveStatus}`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved ✓'}
        </span>
      </div>

      {/* ── SECTION NAV TABS ── */}
      <div className="report-nav">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            className={`report-nav-tab ${activeSection === sec.id ? 'active' : ''}`}
            onClick={() => setActiveSection(sec.id)}
          >
            <span className="report-nav-icon">{sec.icon}</span>
            <span className="report-nav-label">{sec.label}</span>
          </button>
        ))}
      </div>

      {/* ── SECTION BODY ── */}
      <div className="report-body">
        <div className="report-section-header">
          <span className="report-section-icon">{activeDef?.icon}</span>
          <h2 className="report-section-title">{activeDef?.label}</h2>
        </div>
        {renderSection()}
      </div>

    </div>
  );
}
