import { useState, useMemo } from 'react';
import ResponsePicker from './ResponsePicker';
import './ComparablesTab.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DATA_SOURCES   = ['MLS', 'Offer to Purchase', 'Other'];
const PROPERTY_TYPES = [
  'Attached', 'Condominium', 'Detached', 'Hi Rise Apartment',
  'Mobile/Manufactured', 'Other (specify)', 'Row/Townhouse',
  'Semi-Detached', 'Stacked', 'Triplex/Duplex',
];
const BASEMENT_OPTS  = [
  'None', 'Full Finished', 'Full Unfinished', 'Full Partially Finished',
  'Partial Finished', 'Partial Unfinished', 'Crawl Space', 'Other',
];
const PARKING_OPTS   = [
  'None', 'Attached Garage', 'Detached Garage', 'Built-In Garage',
  'Carport', 'Driveway', 'Street', 'Underground', 'Laneway', 'Other',
];
const FLOOR_AREA_UNITS = ['SqFt', 'SqM'];
const GROUPS = [
  { label: 'Comps 1–3',   offset: 0 },
  { label: 'Comps 4–6',   offset: 3 },
  { label: 'Comps 7–9',   offset: 6 },
  { label: 'Comps 10–12', offset: 9 },
];

// Row definitions — drive both the table structure and subject cell logic
const ROWS = [
  { key: 'address',             label: 'Address',          type: 'textarea' },
  { key: 'data_source',         label: 'Data Source',      type: 'dropdown', opts: DATA_SOURCES },
  { key: 'date_of_sale',        label: 'Date of Sale',     type: 'text' },
  { key: 'sale_price',          label: 'Sale Price',       type: 'text' },
  { key: 'days_on_market',      label: 'Days on Market',   type: 'text',     noSubject: true },
  { key: 'list_price',          label: 'List Price',       type: 'text',     noSubject: true },
  { key: 'km_from_subject',     label: 'Km from Subject',  type: 'text',     noSubject: true },
  { key: 'div_details',         label: 'Property Details', type: 'divider' },
  { key: 'location',            label: 'Location',         type: 'text',     noSubject: true },
  { key: 'site_dimensions',     label: 'Site Dimensions',  type: 'text' },
  { key: 'lot_size',            label: 'Lot Size',         type: 'text' },
  { key: 'property_type',       label: 'Property Type',    type: 'dropdown', opts: PROPERTY_TYPES },
  { key: 'design_style',        label: 'Design/Style',     type: 'text' },
  { key: 'age',                 label: 'Age',              type: 'text' },
  { key: 'condition',           label: 'Condition',        type: 'text' },
  { key: 'floor_area',          label: 'Floor Area',       type: 'floor_area' },
  { key: 'room_count_total',    label: 'Rooms (Total)',    type: 'text' },
  { key: 'room_count_bedrooms', label: 'Bedrooms',         type: 'text' },
  { key: 'bathrooms_full',      label: 'Full Baths',       type: 'text' },
  { key: 'bathrooms_partial',   label: 'Partial Baths',    type: 'text' },
  { key: 'basement',            label: 'Basement',         type: 'dropdown', opts: BASEMENT_OPTS },
  { key: 'parking',             label: 'Parking',          type: 'dropdown', opts: PARKING_OPTS },
  { key: 'div_adj',             label: 'Adjustments',      type: 'divider' },
  { key: 'adj_0', label: 'Adj. 1', type: 'adj', adjIndex: 0 },
  { key: 'adj_1', label: 'Adj. 2', type: 'adj', adjIndex: 1 },
  { key: 'adj_2', label: 'Adj. 3', type: 'adj', adjIndex: 2 },
  { key: 'adj_3', label: 'Adj. 4', type: 'adj', adjIndex: 3 },
  { key: 'adj_4', label: 'Adj. 5', type: 'adj', adjIndex: 4 },
  { key: 'div_results',     label: 'Results',         type: 'divider' },
  { key: 'net_dollar',      label: 'Net $',           type: 'computed' },
  { key: 'gross_pct',       label: 'Gross %',         type: 'computed' },
  { key: 'adjusted_value',  label: 'Adjusted Value',  type: 'computed' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function createEmptyComp(number) {
  return {
    number, address: '', data_source: '', date_of_sale: '',
    sale_price: '', days_on_market: '', list_price: '', km_from_subject: '',
    location: '', site_dimensions: '', lot_size: '', property_type: '',
    design_style: '', age: '', condition: '', floor_area: '',
    floor_area_unit: 'SqFt', room_count_total: '', room_count_bedrooms: '',
    bathrooms_full: '', bathrooms_partial: '', basement: '', parking: '',
    adjustments: Array.from({ length: 5 }, () => ({ description: '', adjustment: '' })),
  };
}

function ensureComps(comparables) {
  const result = Array.isArray(comparables) ? [...comparables] : [];
  while (result.length < 12) result.push(createEmptyComp(result.length + 1));
  return result;
}

function calcNet(comp) {
  return (comp.adjustments || []).reduce((acc, adj) => {
    const v = parseFloat(adj.adjustment);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);
}

function calcGross(comp) {
  const price = parseFloat((comp.sale_price || '').replace(/[$,]/g, ''));
  if (!price) return '';
  const gross = (comp.adjustments || []).reduce((acc, adj) => {
    const v = parseFloat(adj.adjustment);
    return acc + (isNaN(v) ? 0 : Math.abs(v));
  }, 0);
  return (gross / price * 100).toFixed(1);
}

function calcAdjusted(comp) {
  const price = parseFloat((comp.sale_price || '').replace(/[$,]/g, ''));
  if (!price) return null;
  return Math.round(price + calcNet(comp));
}

function fmtCurrency(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

function buildSubjectCol(fullReport) {
  const s  = fullReport?.subject ?? {};
  const h  = fullReport?.history ?? {};
  const si = fullReport?.site ?? {};
  const im = fullReport?.improvements ?? {};
  const ra = fullReport?.room_allocation?.above_grade_totals ?? {};
  return {
    address:             s.address ?? '',
    date_of_sale:        h.sale_date ?? '',
    sale_price:          h.sale_price ?? '',
    site_dimensions:     si.dimensions ?? '',
    lot_size:            [si.lot_size, si.lot_size_unit].filter(Boolean).join(' '),
    property_type:       im.property_type ?? '',
    design_style:        im.design_style ?? '',
    age:                 im.effective_age ?? '',
    condition:           im.overall_condition ?? '',
    floor_area:          ra.area ?? '',
    room_count_total:    ra.room_total ?? '',
    room_count_bedrooms: ra.bedrooms ?? '',
    bathrooms_full:      ra.full_bath ?? '',
    bathrooms_partial:   ra.part_bath ?? '',
    basement:            im.basement_type ?? '',
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ComparablesTab({
  comparables, onComparablesChange,
  compAnalyses, onCompAnalysesChange,
  dcaEstimatedValue, onDcaChange,
  enabledGroups, onEnabledGroupsChange,
  fullReport,
}) {
  const [activePage, setActivePage] = useState(0);

  const comps   = useMemo(() => ensureComps(comparables), [comparables]);
  const enabled = useMemo(() => new Set(enabledGroups ?? [0]), [enabledGroups]);
  const subject = useMemo(() => buildSubjectCol(fullReport), [fullReport]);

  const avgAdjusted = useMemo(() => {
    const vals = comps
      .filter((_, i) => enabled.has(Math.floor(i / 3)))
      .map(c => calcAdjusted(c))
      .filter(v => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [comps, enabled]);

  function updateComp(globalIndex, updated) {
    const next = comps.map((c, i) => i === globalIndex ? updated : c);
    onComparablesChange(next);
  }

  function toggleGroup(gi) {
    if (gi === 0) return;
    const next = new Set(enabled);
    if (next.has(gi)) {
      next.delete(gi);
      const cleared = comps.map((c, i) =>
        Math.floor(i / 3) === gi ? createEmptyComp(c.number) : c
      );
      onComparablesChange(cleared);
      if (activePage === gi) setActivePage(0);
    } else {
      next.add(gi);
      setActivePage(gi);
    }
    onEnabledGroupsChange([...next].sort());
  }

  const offset    = GROUPS[activePage].offset;
  const pageComps = [comps[offset], comps[offset + 1], comps[offset + 2]];

  // ── Cell renderers ──────────────────────────────────────────────────────────

  function renderSubjectCell(row) {
    if (row.type === 'divider')  return <td className="ct-divider-cell" />;
    if (row.type === 'computed') return <td className="ct-subject-cell ct-muted">—</td>;
    if (row.type === 'adj')      return <td className="ct-subject-cell ct-muted">—</td>;
    if (row.noSubject)           return <td className="ct-subject-cell ct-muted">—</td>;
    const val = subject[row.key] ?? '';
    return <td className="ct-subject-cell">{val || <span className="ct-muted">—</span>}</td>;
  }

  function renderCompCell(row, comp, compIndex) {
    const gi = Math.floor((offset + compIndex) / 3);
    if (!enabled.has(gi)) return <td className="ct-disabled-cell" />;

    const globalIndex = offset + compIndex;

    function upd(patch) {
      updateComp(globalIndex, { ...comp, ...patch });
    }
    function updAdj(ai, patch) {
      const next = comp.adjustments.map((a, i) => i === ai ? { ...a, ...patch } : a);
      updateComp(globalIndex, { ...comp, adjustments: next });
    }

    if (row.type === 'divider') return <td className="ct-divider-cell" />;

    if (row.type === 'computed') {
      let display = '—';
      if (row.key === 'net_dollar') {
        const n = calcNet(comp);
        if (comp.sale_price) display = fmtCurrency(n);
      } else if (row.key === 'gross_pct') {
        const g = calcGross(comp);
        if (g) display = `${g}%`;
      } else if (row.key === 'adjusted_value') {
        const a = calcAdjusted(comp);
        if (a != null) display = fmtCurrency(a);
      }
      const isFinal = row.key === 'adjusted_value';
      return <td className={`ct-computed-cell${isFinal ? ' ct-computed-cell--final' : ''}`}>{display}</td>;
    }

    if (row.type === 'adj') {
      const ai  = row.adjIndex;
      const adj = comp.adjustments[ai] ?? { description: '', adjustment: '' };
      return (
        <td className="ct-adj-cell">
          <input
            type="text"
            className="ct-adj-desc"
            placeholder="Description"
            value={adj.description}
            onChange={e => updAdj(ai, { description: e.target.value })}
          />
          <input
            type="text"
            className="ct-adj-val"
            placeholder="$0"
            value={adj.adjustment}
            onChange={e => updAdj(ai, { adjustment: e.target.value })}
          />
        </td>
      );
    }

    if (row.type === 'textarea') {
      return (
        <td className="ct-input-cell">
          <textarea
            className="ct-input ct-textarea"
            rows={2}
            value={comp[row.key] ?? ''}
            onChange={e => upd({ [row.key]: e.target.value })}
          />
        </td>
      );
    }

    if (row.type === 'dropdown') {
      return (
        <td className="ct-input-cell">
          <select
            className="ct-input ct-select"
            value={comp[row.key] ?? ''}
            onChange={e => upd({ [row.key]: e.target.value })}
          >
            <option value="" />
            {row.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      );
    }

    if (row.type === 'floor_area') {
      return (
        <td className="ct-input-cell">
          <div className="ct-floor-area-wrap">
            <input
              type="text"
              className="ct-input"
              value={comp.floor_area ?? ''}
              onChange={e => upd({ floor_area: e.target.value })}
            />
            <select
              className="ct-unit-select"
              value={comp.floor_area_unit ?? 'SqFt'}
              onChange={e => upd({ floor_area_unit: e.target.value })}
            >
              {FLOOR_AREA_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </td>
      );
    }

    // Default: text
    return (
      <td className="ct-input-cell">
        <input
          type="text"
          className="ct-input"
          value={comp[row.key] ?? ''}
          onChange={e => upd({ [row.key]: e.target.value })}
        />
      </td>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="ct-wrap">

      {/* Group toggle bar */}
      <div className="ct-group-bar">
        {GROUPS.map((g, gi) => {
          const isEnabled = enabled.has(gi);
          const isActive  = activePage === gi;
          return (
            <div
              key={gi}
              className={[
                'ct-group-tab',
                isEnabled ? 'ct-group-tab--on' : 'ct-group-tab--off',
                isActive  ? 'ct-group-tab--active' : '',
              ].join(' ')}
            >
              <button
                className="ct-group-btn"
                onClick={() => {
                  if (!isEnabled) toggleGroup(gi);
                  else setActivePage(gi);
                }}
              >
                {gi > 0 && !isEnabled && <span className="ct-group-add">+</span>}
                {g.label}
              </button>
              {gi > 0 && isEnabled && (
                <button
                  className="ct-group-remove"
                  title="Remove this group"
                  onClick={() => toggleGroup(gi)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparables grid */}
      <div className="ct-grid-wrap">
        <table className="ct-grid">
          <thead>
            <tr>
              <th className="ct-label-th">Field</th>
              <th className="ct-subject-th">Subject</th>
              {pageComps.map(c => (
                <th key={c.number} className="ct-comp-th">Comp {c.number}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.key} className={row.type === 'divider' ? 'ct-divider-row' : ''}>
                <td className="ct-label-cell">
                  {row.type === 'divider'
                    ? <span className="ct-section-label">{row.label}</span>
                    : row.label}
                </td>
                {renderSubjectCell(row)}
                {pageComps.map((comp, ci) => renderCompCell(row, comp, ci))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analysis */}
      <div className="ct-analyses-section">
        <div className="ct-analyses-header">
          <h3 className="ct-analyses-title">Analysis</h3>
          <ResponsePicker
            category="comparables"
            onInsert={text =>
              onCompAnalysesChange(
                compAnalyses ? `${compAnalyses}\n\n${text}` : text
              )
            }
          />
        </div>
        <textarea
          className="ct-analyses-textarea"
          rows={6}
          value={compAnalyses ?? ''}
          onChange={e => onCompAnalysesChange(e.target.value)}
          placeholder="Enter comparable sales analysis…"
        />
      </div>

      {/* DCA Estimated Value */}
      <div className="ct-dca-section">
        <label className="ct-dca-label">
          Estimated Value by Direct Comparison Approach
        </label>
        {avgAdjusted && (
          <div className="ct-dca-hint">
            Avg of adjusted values: {fmtCurrency(avgAdjusted)}
          </div>
        )}
        <input
          type="text"
          className="ct-dca-input"
          value={dcaEstimatedValue ?? ''}
          onChange={e => onDcaChange(e.target.value)}
          placeholder="$"
        />
      </div>

    </div>
  );
}
