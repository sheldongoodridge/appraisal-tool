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
const BASEMENT_OPTS = [
  'None', 'Full Finished', 'Full Unfinished', 'Full Partially Finished',
  'Partial Finished', 'Partial Unfinished', 'Crawl Space', 'Other',
];
const PARKING_OPTS = [
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

// noAdj: true  — no Adj $ cell (address, age, computed rows)
// addrSpan: true — desc cell colSpan=2 (address only)
// noSubject: true — subject shows "—"
const ROWS = [
  { key: 'address',         label: 'Address',           type: 'textarea',   noAdj: true, addrSpan: true },
  { key: 'data_source',     label: 'Data Source',       type: 'dropdown',   opts: DATA_SOURCES },
  { key: 'date_of_sale',    label: 'Date of Sale',      type: 'text' },
  { key: 'sale_price',      label: 'Sale Price',        type: 'text' },
  { key: 'days_on_market',  label: 'Days on Market',    type: 'text',       noSubject: true },
  { key: 'list_price',      label: 'List Price',        type: 'text',       noSubject: true },
  { key: 'km_from_subject', label: 'Approx KMs',        type: 'text',       noSubject: true },
  { key: 'location',        label: 'Location',          type: 'text',       noSubject: true },
  { key: 'site_dimensions', label: 'Site Dims',         type: 'text' },
  { key: 'property_type',   label: 'Property Type',     type: 'dropdown',   opts: PROPERTY_TYPES },
  { key: 'design_style',    label: 'Design/Style',      type: 'text' },
  { key: 'age',             label: 'Age',               type: 'text',       noAdj: true },
  { key: 'condition',       label: 'Condition',         type: 'text' },
  { key: 'floor_area',      label: 'Floor Area',        type: 'floor_area' },
  { key: 'room_count',      label: 'Room Count',        type: 'room_count' },
  { key: 'bathrooms',       label: 'Bathrooms',         type: 'bathrooms' },
  { key: 'basement',        label: 'Basement',          type: 'dropdown',   opts: BASEMENT_OPTS },
  { key: 'parking',         label: 'Parking',           type: 'dropdown',   opts: PARKING_OPTS },
  { key: 'lot_orient',      label: 'Lot Orientation',   type: 'text',       noSubject: true },
  { key: 'hvac_fp',         label: 'HVAC / Fireplace',  type: 'text',       noSubject: true },
  { key: 'energy_eff',      label: 'Energy Efficiency', type: 'text',       noSubject: true },
  { key: 'landscaping',     label: 'Landscaping',       type: 'text',       noSubject: true },
  { key: 'adj_per_sqft',    label: 'Adj $/SqFt',        type: 'text',       noSubject: true },
  { key: 'custom_0',        label: '',                  type: 'custom',     customIndex: 0 },
  { key: 'custom_1',        label: '',                  type: 'custom',     customIndex: 1 },
  { key: 'custom_2',        label: '',                  type: 'custom',     customIndex: 2 },
  { key: 'custom_3',        label: '',                  type: 'custom',     customIndex: 3 },
  { key: 'custom_4',        label: '',                  type: 'custom',     customIndex: 4 },
  { key: 'gross_net',       label: 'Gross% / Net $',    type: 'gross_net',  noAdj: true },
  { key: 'adjusted_value',  label: 'Adjusted Value',    type: 'adj_value',  noAdj: true },
];

// Keys whose _adj fields contribute to net/gross calculations
const ADJ_KEYS = [
  'data_source', 'date_of_sale', 'sale_price', 'days_on_market',
  'list_price', 'km_from_subject', 'location', 'site_dimensions',
  'property_type', 'design_style', 'condition', 'floor_area',
  'room_count', 'bathrooms', 'basement', 'parking',
  'lot_orient', 'hvac_fp', 'energy_eff', 'landscaping', 'adj_per_sqft',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function createEmptyComp(number) {
  return {
    number,
    address: '',
    data_source: '',     data_source_adj: '',
    date_of_sale: '',    date_of_sale_adj: '',
    sale_price: '',      sale_price_adj: '',
    days_on_market: '',  days_on_market_adj: '',
    list_price: '',      list_price_adj: '',
    km_from_subject: '', km_from_subject_adj: '',
    location: '',        location_adj: '',
    site_dimensions: '', site_dimensions_adj: '',
    property_type: '',   property_type_adj: '',
    design_style: '',    design_style_adj: '',
    age: '',
    condition: '',       condition_adj: '',
    floor_area: '',      floor_area_unit: 'SqFt', floor_area_adj: '',
    room_count_total: '', room_count_bedrooms: '', room_count_adj: '',
    bathrooms_full: '',   bathrooms_partial: '',   bathrooms_adj: '',
    basement: '',        basement_adj: '',
    parking: '',         parking_adj: '',
    lot_orient: '',      lot_orient_adj: '',
    hvac_fp: '',         hvac_fp_adj: '',
    energy_eff: '',      energy_eff_adj: '',
    landscaping: '',     landscaping_adj: '',
    adj_per_sqft: '',    adj_per_sqft_adj: '',
    custom_rows: Array.from({ length: 5 }, () => ({ label: '', adj: '' })),
  };
}

function ensureComps(comparables) {
  const result = Array.isArray(comparables) ? [...comparables] : [];
  while (result.length < 12) result.push(createEmptyComp(result.length + 1));
  return result;
}

function parseAdj(str) {
  const v = parseFloat((str || '').replace(/[$,]/g, ''));
  return isNaN(v) ? 0 : v;
}

function calcNet(comp) {
  let total = ADJ_KEYS.reduce((acc, k) => acc + parseAdj(comp[`${k}_adj`]), 0);
  (comp.custom_rows || []).forEach(r => { total += parseAdj(r.adj); });
  return total;
}

function calcGross(comp) {
  const price = parseFloat((comp.sale_price || '').replace(/[$,]/g, ''));
  if (!price) return null;
  let gross = ADJ_KEYS.reduce((acc, k) => acc + Math.abs(parseAdj(comp[`${k}_adj`])), 0);
  (comp.custom_rows || []).forEach(r => { gross += Math.abs(parseAdj(r.adj)); });
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
  const s  = fullReport?.subject  ?? {};
  const h  = fullReport?.history  ?? {};
  const si = fullReport?.site     ?? {};
  const im = fullReport?.improvements ?? {};
  const ra = fullReport?.room_allocation?.above_grade_totals ?? {};
  return {
    address:             s.address          ?? '',
    date_of_sale:        h.sale_date        ?? '',
    sale_price:          h.sale_price       ?? '',
    site_dimensions:     si.dimensions      ?? '',
    property_type:       im.property_type   ?? '',
    design_style:        im.design_style    ?? '',
    age:                 im.effective_age   ?? '',
    condition:           im.overall_condition ?? '',
    floor_area:          ra.area            ?? '',
    room_count_total:    ra.room_total      ?? '',
    room_count_bedrooms: ra.bedrooms        ?? '',
    bathrooms_full:      ra.full_bath       ?? '',
    bathrooms_partial:   ra.part_bath       ?? '',
    basement:            im.basement_type   ?? '',
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

  // ── Subject cell ────────────────────────────────────────────────────────────

  function renderSubjectCell(row) {
    if (row.noSubject || row.type === 'gross_net' || row.type === 'adj_value' || row.type === 'custom') {
      return <td className="ct-subject-cell ct-muted">—</td>;
    }
    let content;
    if (row.key === 'room_count') {
      content = subject.room_count_total
        ? `${subject.room_count_total}T / ${subject.room_count_bedrooms || 0}B`
        : '';
    } else if (row.key === 'bathrooms') {
      content = subject.bathrooms_full
        ? `${subject.bathrooms_full}F ${subject.bathrooms_partial || 0}P`
        : '';
    } else if (row.key === 'floor_area') {
      content = subject.floor_area ? `${subject.floor_area} SqFt` : '';
    } else {
      content = subject[row.key] ?? '';
    }
    return (
      <td className="ct-subject-cell">
        {content || <span className="ct-muted">—</span>}
      </td>
    );
  }

  // ── Comp cells — returns array of <td> elements ──────────────────────────────

  function renderCompCells(row, comp, compIndex) {
    const globalIndex = offset + compIndex;
    const gi = Math.floor(globalIndex / 3);
    const n  = comp.number;

    if (!enabled.has(gi)) {
      return row.noAdj || row.addrSpan
        ? [<td key={`${n}-d`} className="ct-disabled-cell ct-desc-cell" colSpan={row.addrSpan ? 2 : 1} />,
           ...(!row.addrSpan && !row.noAdj ? [<td key={`${n}-a`} className="ct-disabled-cell ct-adj-cell-narrow" />] : [])]
        : [<td key={`${n}-d`} className="ct-disabled-cell ct-desc-cell" />,
           <td key={`${n}-a`} className="ct-disabled-cell ct-adj-cell-narrow" />];
    }

    function upd(patch) { updateComp(globalIndex, { ...comp, ...patch }); }
    function updCustom(ci, patch) {
      const next = (comp.custom_rows || []).map((r, i) => i === ci ? { ...r, ...patch } : r);
      upd({ custom_rows: next });
    }

    const adjKey = `${row.key}_adj`;

    // Address — textarea spanning both sub-columns
    if (row.type === 'textarea') {
      return [(
        <td key={`${n}-d`} className="ct-desc-cell" colSpan={2}>
          <textarea
            className="ct-input ct-textarea"
            rows={2}
            value={comp.address ?? ''}
            onChange={e => upd({ address: e.target.value })}
          />
        </td>
      )];
    }

    // Gross% / Net $ — computed, spans both sub-columns
    if (row.type === 'gross_net') {
      const net   = calcNet(comp);
      const gross = calcGross(comp);
      return [(
        <td key={`${n}-d`} className="ct-computed-cell ct-gross-net-cell" colSpan={2}>
          {comp.sale_price
            ? <div className="ct-gross-net-inner">
                <span className="ct-gross">{gross ?? '0'}%</span>
                <span className="ct-net">{fmtCurrency(net)}</span>
              </div>
            : <span className="ct-muted">—</span>}
        </td>
      )];
    }

    // Adjusted Value — computed, spans both sub-columns
    if (row.type === 'adj_value') {
      const a = calcAdjusted(comp);
      return [(
        <td key={`${n}-d`} className="ct-computed-cell ct-adj-value-cell" colSpan={2}>
          {a != null ? fmtCurrency(a) : <span className="ct-muted">—</span>}
        </td>
      )];
    }

    // Custom blank rows — free-text label in desc, adj $ in adj
    if (row.type === 'custom') {
      const ci = row.customIndex;
      const cr = (comp.custom_rows || [])[ci] ?? { label: '', adj: '' };
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
          <input
            type="text"
            className="ct-input"
            placeholder="Item label…"
            value={cr.label}
            onChange={e => updCustom(ci, { label: e.target.value })}
          />
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow">
          <input
            type="text"
            className="ct-input ct-adj-input"
            placeholder="$"
            value={cr.adj}
            onChange={e => updCustom(ci, { adj: e.target.value })}
          />
        </td>,
      ];
    }

    // Age — text input, empty adj cell (no adj for this field)
    if (row.key === 'age') {
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
          <input
            type="text"
            className="ct-input ct-age-input"
            value={comp.age ?? ''}
            onChange={e => upd({ age: e.target.value })}
          />
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow ct-no-adj" />,
      ];
    }

    // Floor area — value + unit in desc, adj $ in adj
    if (row.type === 'floor_area') {
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
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
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow">
          <input
            type="text"
            className="ct-input ct-adj-input"
            placeholder="$"
            value={comp.floor_area_adj ?? ''}
            onChange={e => upd({ floor_area_adj: e.target.value })}
          />
        </td>,
      ];
    }

    // Room count — Tot + Bed inline inputs in desc, adj $ in adj
    if (row.type === 'room_count') {
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
          <div className="ct-inline-fields">
            <span className="ct-inline-label">Tot</span>
            <input
              type="text"
              className="ct-input ct-small-input"
              value={comp.room_count_total ?? ''}
              onChange={e => upd({ room_count_total: e.target.value })}
            />
            <span className="ct-inline-label">Bed</span>
            <input
              type="text"
              className="ct-input ct-small-input"
              value={comp.room_count_bedrooms ?? ''}
              onChange={e => upd({ room_count_bedrooms: e.target.value })}
            />
          </div>
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow">
          <input
            type="text"
            className="ct-input ct-adj-input"
            placeholder="$"
            value={comp.room_count_adj ?? ''}
            onChange={e => upd({ room_count_adj: e.target.value })}
          />
        </td>,
      ];
    }

    // Bathrooms — Full + Partial inline inputs in desc, adj $ in adj
    if (row.type === 'bathrooms') {
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
          <div className="ct-inline-fields">
            <span className="ct-inline-label">F</span>
            <input
              type="text"
              className="ct-input ct-small-input"
              value={comp.bathrooms_full ?? ''}
              onChange={e => upd({ bathrooms_full: e.target.value })}
            />
            <span className="ct-inline-label">P</span>
            <input
              type="text"
              className="ct-input ct-small-input"
              value={comp.bathrooms_partial ?? ''}
              onChange={e => upd({ bathrooms_partial: e.target.value })}
            />
          </div>
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow">
          <input
            type="text"
            className="ct-input ct-adj-input"
            placeholder="$"
            value={comp.bathrooms_adj ?? ''}
            onChange={e => upd({ bathrooms_adj: e.target.value })}
          />
        </td>,
      ];
    }

    // Dropdown
    if (row.type === 'dropdown') {
      return [
        <td key={`${n}-d`} className="ct-desc-cell">
          <select
            className="ct-input ct-select"
            value={comp[row.key] ?? ''}
            onChange={e => upd({ [row.key]: e.target.value })}
          >
            <option value="" />
            {row.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>,
        <td key={`${n}-a`} className="ct-adj-cell-narrow">
          <input
            type="text"
            className="ct-input ct-adj-input"
            placeholder="$"
            value={comp[adjKey] ?? ''}
            onChange={e => upd({ [adjKey]: e.target.value })}
          />
        </td>,
      ];
    }

    // Default: text input
    return [
      <td key={`${n}-d`} className="ct-desc-cell">
        <input
          type="text"
          className="ct-input"
          value={comp[row.key] ?? ''}
          onChange={e => upd({ [row.key]: e.target.value })}
        />
      </td>,
      <td key={`${n}-a`} className="ct-adj-cell-narrow">
        <input
          type="text"
          className="ct-input ct-adj-input"
          placeholder="$"
          value={comp[adjKey] ?? ''}
          onChange={e => upd({ [adjKey]: e.target.value })}
        />
      </td>,
    ];
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
                onClick={() => { if (!isEnabled) toggleGroup(gi); else setActivePage(gi); }}
              >
                {gi > 0 && !isEnabled && <span className="ct-group-add">+</span>}
                {g.label}
              </button>
              {gi > 0 && isEnabled && (
                <button
                  className="ct-group-remove"
                  title="Remove this group"
                  onClick={() => toggleGroup(gi)}
                >×</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparables grid */}
      <div className="ct-grid-wrap">
        <table className="ct-grid">
          <thead>
            <tr className="ct-thead-top">
              <th className="ct-label-th" rowSpan={2}>Field</th>
              <th className="ct-subject-th" rowSpan={2}>Subject</th>
              {pageComps.map(c => (
                <th key={c.number} className="ct-comp-th" colSpan={2}>Comp {c.number}</th>
              ))}
            </tr>
            <tr className="ct-thead-sub">
              {pageComps.flatMap(c => [
                <th key={`${c.number}-d`} className="ct-desc-th">Description</th>,
                <th key={`${c.number}-a`} className="ct-adj-th">Adj $</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr
                key={row.key}
                className={
                  row.type === 'adj_value' ? 'ct-adjval-row'
                  : row.type === 'gross_net' ? 'ct-grossnet-row'
                  : ''
                }
              >
                <td className="ct-label-cell">{row.label}</td>
                {renderSubjectCell(row)}
                {pageComps.flatMap((comp, ci) => renderCompCells(row, comp, ci))}
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
              onCompAnalysesChange(compAnalyses ? `${compAnalyses}\n\n${text}` : text)
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
