import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_REPORT } from '../utils/defaultReport';
import './ReportForm.css';

const API_BASE = 'https://spokeappraisal.com/api';

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cover',         icon: '📋', label: 'Cover',         autoFilled: false, fieldCount: 5  },
  { id: 'client',        icon: '👤', label: 'Client',        autoFilled: true,  fieldCount: 6  },
  { id: 'subject',       icon: '🏠', label: 'Subject',       autoFilled: true,  fieldCount: 8  },
  { id: 'neighbourhood', icon: '🏘️', label: 'Neighbourhood', autoFilled: false, fieldCount: 16 },
  { id: 'site',          icon: '📍', label: 'Site',          autoFilled: true,  fieldCount: 32 },
  { id: 'improvements',  icon: '🏗️', label: 'Improvements',  autoFilled: true,  fieldCount: 42 },
  { id: 'comparables',   icon: '📊', label: 'Comparables',   autoFilled: false, fieldCount: 0  },
  { id: 'history',       icon: '📅', label: 'History',       autoFilled: false, fieldCount: 10 },
  { id: 'certification', icon: '✅', label: 'Certification', autoFilled: true,  fieldCount: 15 },
  { id: 'addenda',       icon: '📎', label: 'Addenda',       autoFilled: false, fieldCount: 20 },
  { id: 'photos',        icon: '📷', label: 'Photos',        autoFilled: false, fieldCount: 12 },
  { id: 'generate',      icon: '📄', label: 'Generate',      autoFilled: false, fieldCount: 0  },
];

// ─── AUTO-POPULATE ────────────────────────────────────────────────────────────

function normalizeUnit(u) {
  const l = (u || '').toLowerCase();
  if (l === 'sqft' || l === 'sq ft') return 'Sq Ft';
  if (l === 'acres')                  return 'Acres';
  if (l === 'hectares')               return 'Hectares';
  if (l === 'm²' || l === 'm2')       return 'M²';
  return 'Sq Ft';
}

function buildAutoFill(inspection) {
  const wd       = inspection?.workfile_data ?? {};
  const order    = wd.order ?? {};
  const wfSite   = wd.site  ?? {};
  const insp     = (wd.inspections ?? [])[0] ?? {};
  const exterior = insp.exterior ?? {};
  const systems  = insp.floors?.basement?.systems ?? {};

  return {
    meta: {
      inspection_date: order.inspection_datetime
        ? order.inspection_datetime.slice(0, 10)
        : null,
      inspection_type: inspection?.property_data?.appraisalType ?? '',
    },
    site: {
      dimensions:    wfSite.lot_dimensions ?? '',
      lot_size:      wfSite.lot_size       ?? '',
      lot_size_unit: normalizeUnit(wfSite.lot_size_unit),
      zoning_code:   wfSite.zoning         ?? '',
    },
    improvements: {
      design_style:     insp.dwelling_style    ?? '',
      roofing_type:     exterior.roofing       ?? '',
      exterior_finish:  exterior.cladding      ?? '',
      windows_type:     exterior.windows       ?? '',
      heating_system:   systems.heating        ?? '',
      fuel_type:        systems.fuel           ?? '',
      water_heater:     systems.water_heater   ?? '',
      electrical_other: systems.electrical_type ?? '',
      panel_capacity:   systems.electrical_amps ?? '',
      cooling_system:   systems.cooling        ?? '',
    },
  };
}

function isReportEmpty(report) {
  return (
    !report.meta?.inspection_date &&
    !report.site?.dimensions &&
    !report.improvements?.design_style
  );
}

// ─── MERGE ────────────────────────────────────────────────────────────────────

function mergeReport(saved) {
  if (!saved || Object.keys(saved).length === 0) return { ...DEFAULT_REPORT };
  const merged = { ...DEFAULT_REPORT };
  for (const key of Object.keys(DEFAULT_REPORT)) {
    if (saved[key] === undefined) continue;
    merged[key] = Array.isArray(DEFAULT_REPORT[key])
      ? saved[key]
      : { ...DEFAULT_REPORT[key], ...saved[key] };
  }
  return merged;
}

// ─── SAVE ────────────────────────────────────────────────────────────────────

async function patchReport(id, data) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/inspections/${id}/workfile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section: 'report', data }),
  });
  if (!res.ok) throw new Error('Save failed');
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ReportForm({ inspection, currentUser, onBack, onSave }) {
  const [reportData, setReportData] = useState(() =>
    mergeReport(inspection?.workfile_data?.report)
  );
  const [activeTab,  setActiveTab]  = useState('cover');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showToast,  setShowToast]  = useState(false);
  const autoFillRan = useRef(false);
  const saveTimer   = useRef(null);
  const toastTimer  = useRef(null);

  // Auto-populate once on first open if report is empty
  useEffect(() => {
    if (autoFillRan.current) return;
    autoFillRan.current = true;
    if (!isReportEmpty(reportData)) return;

    const fills = buildAutoFill(inspection, currentUser);
    setReportData(prev => {
      const next = { ...prev };
      for (const [key, vals] of Object.entries(fills)) {
        next[key] = { ...prev[key], ...vals };
      }
      return next;
    });
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 4000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-initialize when a different workfile is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    autoFillRan.current = false;
    setReportData(mergeReport(inspection?.workfile_data?.report));
  }, [inspection?.id]);

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  const triggerSave = useCallback((data) => {
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (onSave) await onSave(data);
        else        await patchReport(inspection.id, data);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [inspection.id, onSave]);

  const updateSection = useCallback((sectionKey, sectionData) => {
    setReportData(prev => {
      const next = { ...prev, [sectionKey]: sectionData };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]); // eslint-disable-line no-unused-vars

  const activeDef = TABS.find(t => t.id === activeTab);
  const address   = inspection?.property_data?.address || 'Draft Report';

  return (
    <div className="rf-page">

      {/* ── HEADER ── */}
      <div className="rf-header">
        <button className="rf-back-btn" onClick={onBack}>← Back to Workfile</button>
        <div className="rf-header-center">
          <div className="rf-header-label">DRAFT REPORT</div>
          <div className="rf-header-address">{address}</div>
        </div>
        <div className="rf-header-right">
          <span className={`rf-save-status rf-save-${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'error' ? '⚠ Save failed'
              : '● Saved ✓'}
          </span>
          <button className="rf-generate-btn">Generate Report →</button>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="rf-tabbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`rf-tab ${activeTab === tab.id ? 'rf-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="rf-tab-icon">{tab.icon}</span>
            <span className="rf-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="rf-body">
        <div className="rf-section-header">
          <span className="rf-section-icon">{activeDef?.icon}</span>
          <h2 className="rf-section-title">{activeDef?.label}</h2>
          {activeDef?.fieldCount > 0 && (
            <span className="rf-field-count">{activeDef.fieldCount} fields</span>
          )}
          {activeDef?.autoFilled ? (
            <span className="rf-badge rf-badge-auto">Auto-filled from workfile ✓</span>
          ) : activeTab !== 'generate' && (
            <span className="rf-badge rf-badge-manual">Requires manual entry</span>
          )}
        </div>

        {activeTab === 'generate' ? (
          <div className="rf-center-placeholder">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Generate Report</div>
            <p style={{ color: '#6b7280' }}>PDF generation coming in a future session.</p>
          </div>
        ) : (
          <div className="rf-center-placeholder">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeDef?.label}</div>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              Form fields coming in a future session.
            </p>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {showToast && (
        <div className="rf-toast">
          ✓ Report pre-filled from workfile data. Review each section.
        </div>
      )}

    </div>
  );
}
