import { useState, useRef, useMemo } from 'react';
import ResponsePicker from './ResponsePicker';
import { uploadPhoto } from '../../services/api';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseNum(str) {
  const v = parseFloat((str || '').replace(/[$,]/g, ''));
  return isNaN(v) ? 0 : v;
}

function fmtCurrency(n) {
  if (!n && n !== 0) return '—';
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

function defaultCostItems() {
  return [
    { use_sqft: true,  description: 'Livable floor area (above grade)', sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: true,  description: 'Basement',                          sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: true,  description: 'Garages/Carports',                 sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: true,  description: '',                                  sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: true,  description: '',                                  sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: true,  description: '',                                  sqft: '', rate: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: false, description: 'Other Extras Including Site Improvements, Landscaping, etc', cost_new: '', depreciated_cost: '' },
    { use_sqft: false, description: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: false, description: '', cost_new: '', depreciated_cost: '' },
    { use_sqft: false, description: '', cost_new: '', depreciated_cost: '' },
  ];
}

function defaultRentComp() {
  return { data_source: '', date: '', rent_rate: '', location: '', design_style: '', floor_area: '', bedrooms: '', bathrooms: '', other: '' };
}

function ensureRentComps(comps) {
  const result = Array.isArray(comps) ? [...comps] : [];
  while (result.length < 3) result.push(defaultRentComp());
  return result;
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="add-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="add-toggle-slider" />
    </label>
  );
}

function StatusBadge({ required, autoIncluded, included }) {
  if (required)     return <span className="add-badge add-badge--required">Required</span>;
  if (autoIncluded) return <span className="add-badge add-badge--auto">Auto-included</span>;
  if (included)     return <span className="add-badge add-badge--included">Included</span>;
  return <span className="add-badge add-badge--off">Not included</span>;
}

function AddendaItem({ icon, title, required, autoIncluded, included, onToggle, children }) {
  const isOpen = required || included;
  return (
    <div className={`add-item${isOpen ? ' add-item--open' : ''}`}>
      <div className="add-item-header">
        <div className="add-item-left">
          {required
            ? <span className="add-item-lock">✅</span>
            : <ToggleSwitch checked={!!included} onChange={() => onToggle?.()} />
          }
          <span className="add-item-icon">{icon}</span>
          <span className="add-item-title">{title}</span>
        </div>
        <StatusBadge required={required} autoIncluded={autoIncluded && !included} included={included} />
      </div>
      {isOpen && <div className="add-item-body">{children}</div>}
    </div>
  );
}

function FileUploadField({ label, hint, url, onUrl, inspectionId, room }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const isPdf = url && url.toLowerCase().includes('.pdf');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      e.target.value = '';
      return;
    }
    setError('');
    setUploading(true);
    try {
      const result = await uploadPhoto(inspectionId, file, room);
      onUrl(result.file_path);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (url) {
    return (
      <div className="add-file-preview">
        {isPdf
          ? <div className="add-file-pdf">📄 <span>{url.split('/').pop()}</span></div>
          : <img src={url} alt={label} className="add-file-img" />
        }
        <button type="button" className="add-remove-btn" onClick={() => onUrl('')}>Remove</button>
      </div>
    );
  }

  return (
    <div className="add-upload-area" onClick={() => !uploading && fileRef.current?.click()} style={{ cursor: uploading ? 'default' : 'pointer' }}>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleFile} />
      <div className="add-upload-icon">{uploading ? '⏳' : '📎'}</div>
      <div className="add-upload-label">{uploading ? 'Uploading…' : label}</div>
      {hint && !uploading && <div className="add-upload-hint">{hint}</div>}
      {error && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ─── SCOPE SECTION ────────────────────────────────────────────────────────────

function ScopeSection({ scope, onScopeChange }) {
  const s = scope ?? {};
  return (
    <div>
      <div className="add-section-toolbar">
        <ResponsePicker
          category="scope"
          onInsert={text => onScopeChange({ ...s, content: s.content ? `${s.content}\n\n${text}` : text })}
        />
      </div>
      <div className="rt-field">
        <textarea
          rows={8}
          value={s.content ?? ''}
          onChange={ev => onScopeChange({ ...s, content: ev.target.value })}
        />
      </div>
    </div>
  );
}

// ─── EXTRAORDINARY SECTION ────────────────────────────────────────────────────

function ExtraordinarySection({ extraordinaryItems, onExtraordinaryItemsChange }) {
  const ei = extraordinaryItems ?? {};
  const set = (k, v) => onExtraordinaryItemsChange({ ...ei, [k]: v });
  return (
    <div>
      <div className="rt-field" style={{ marginBottom: 16 }}>
        <label>Extraordinary Assumptions</label>
        <p className="rt-hint" style={{ margin: '2px 0 6px' }}>
          An extraordinary assumption is a hypothesis, either supposed or unconfirmed, which, if not true, could alter the appraiser's opinions.
        </p>
        <textarea rows={5} value={ei.assumptions_text ?? ''} onChange={ev => set('assumptions_text', ev.target.value)} />
      </div>
      <div className="rt-field">
        <label>Hypothetical Conditions</label>
        <p className="rt-hint" style={{ margin: '2px 0 6px' }}>
          Hypothetical conditions may be used when required for legal purpose, for purposes of reasonable analyses or for purposes of comparison.
        </p>
        <textarea rows={5} value={ei.hypothetical_text ?? ''} onChange={ev => set('hypothetical_text', ev.target.value)} />
      </div>
    </div>
  );
}

// ─── NARRATIVE SECTION ────────────────────────────────────────────────────────

function NarrativeSection({ narrative, onNarrativeChange }) {
  const n = narrative ?? {};
  const extraPages = n.extra_pages ?? [];
  const set = (k, v) => onNarrativeChange({ ...n, [k]: v });

  function addPage() {
    onNarrativeChange({ ...n, extra_pages: [...extraPages, ''] });
  }

  function removePage(i) {
    onNarrativeChange({ ...n, extra_pages: extraPages.filter((_, idx) => idx !== i) });
  }

  function updatePage(i, val) {
    onNarrativeChange({ ...n, extra_pages: extraPages.map((p, idx) => idx === i ? val : p) });
  }

  const pages = [
    { key: 'content',  label: 'Narrative Page 1', value: n.content  ?? '', onChange: v => set('content',  v) },
    { key: 'content2', label: 'Narrative Page 2', value: n.content2 ?? '', onChange: v => set('content2', v) },
    ...extraPages.map((p, i) => ({
      key: `extra_${i}`, label: `Narrative Page ${3 + i}`, value: p,
      onChange: v => updatePage(i, v),
      removable: true, onRemove: () => removePage(i),
    })),
  ];

  return (
    <div>
      {pages.map(pg => (
        <div key={pg.key} className="rt-field" style={{ marginBottom: 16 }}>
          <div className="add-page-label-row">
            <label>{pg.label}</label>
            {pg.removable && (
              <button type="button" className="add-remove-btn" onClick={pg.onRemove}>Remove Page</button>
            )}
          </div>
          <textarea rows={10} value={pg.value} onChange={ev => pg.onChange(ev.target.value)} />
        </div>
      ))}
      <button type="button" className="add-page-btn" onClick={addPage}>+ Add Narrative Page</button>
    </div>
  );
}

// ─── COST APPROACH SECTION ────────────────────────────────────────────────────

function CostApproachSection({ costApproach, onCostApproachChange, fullReport }) {
  const ca     = costApproach ?? {};
  const client = fullReport?.parties?.client    ?? {};
  const app    = fullReport?.parties?.appraiser ?? {};
  const subj   = fullReport?.subject            ?? {};

  const set = (k, v) => onCostApproachChange({ ...ca, [k]: v });

  function setItem(globalIdx, patch) {
    const base = (ca.items && ca.items.length > 0) ? ca.items : defaultCostItems();
    const updated = base.map((item, i) => i === globalIdx ? { ...item, ...patch } : item);
    onCostApproachChange({ ...ca, items: updated });
  }

  const indexedItems = useMemo(() => {
    const base = (ca.items && ca.items.length > 0) ? ca.items : defaultCostItems();
    return base.map((item, globalIdx) => ({
      ...item,
      globalIdx,
      computed_cost_new: item.use_sqft
        ? parseNum(item.sqft) * parseNum(item.rate)
        : parseNum(item.cost_new),
    }));
  }, [ca.items]);

  const sqftItems = indexedItems.filter(r => r.use_sqft);
  const flatItems = indexedItems.filter(r => !r.use_sqft);

  const totalReplacement = indexedItems.reduce((acc, r) => acc + r.computed_cost_new, 0);

  const totalDeprPct = parseNum(ca.physical_deterioration)
    + parseNum(ca.functional_obsolescence)
    + parseNum(ca.external_obsolescence);

  const totalDeprDollar  = totalReplacement * (totalDeprPct / 100);
  const depreciatedValue = totalReplacement - totalDeprDollar;

  return (
    <div>
      {/* Auto-filled header */}
      <div className="rt-two-col" style={{ marginBottom: 20 }}>
        <div>
          <div className="rt-field" style={{ marginBottom: 10 }}>
            <label>Client <span className="rt-source-badge">from Tab 2</span></label>
            <div className="rt-display">{client.name || '—'}</div>
          </div>
          <div className="rt-field">
            <label>Appraiser <span className="rt-source-badge">from Tab 2</span></label>
            <div className="rt-display">{app.name || '—'}</div>
          </div>
        </div>
        <div>
          <div className="rt-field">
            <label>Property Address <span className="rt-source-badge">auto-filled</span></label>
            <div className="rt-display">{subj.address || '—'}</div>
          </div>
        </div>
      </div>

      {/* Land value + source */}
      <div className="rt-row">
        <div className="rt-field">
          <label>Land Value</label>
          <div className="rt-prefix-input">
            <span className="rt-prefix">$</span>
            <input type="text" value={ca.land_value ?? ''} onChange={ev => set('land_value', ev.target.value)} />
          </div>
        </div>
        <div className="rt-field">
          <label>Source of Land Data</label>
          <input type="text" value={ca.source_of_land_data ?? ''} onChange={ev => set('source_of_land_data', ev.target.value)} />
        </div>
      </div>

      {/* Source of cost data */}
      <div className="rt-row">
        <div className="rt-field">
          <label>Source of Cost Data</label>
          <div className="rt-check-group" style={{ marginBottom: 0 }}>
            {['Manual', 'Contractor', 'Other'].map(opt => (
              <label key={opt} className="rt-check">
                <input type="radio" checked={ca.source_of_cost_data === opt} onChange={() => set('source_of_cost_data', opt)} />
                {opt}
              </label>
            ))}
          </div>
          {ca.source_of_cost_data === 'Other' && (
            <input type="text" style={{ marginTop: 8 }} placeholder="Describe…"
              value={ca.source_of_cost_data_other ?? ''} onChange={ev => set('source_of_cost_data_other', ev.target.value)} />
          )}
        </div>
      </div>

      {/* SqFt rows */}
      <p className="rt-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Building Cost — with SqFt Calculator</p>
      <div className="add-cost-table">
        <div className="add-cost-thead">
          <span className="add-col-desc">Description</span>
          <span className="add-col-sqft">SqFt</span>
          <span className="add-col-rate">@ $/SqFt</span>
          <span className="add-col-new">Est Cost New</span>
          <span className="add-col-depr">Depr. Cost</span>
        </div>
        {sqftItems.map(item => (
          <div key={item.globalIdx} className="add-cost-row">
            <input className="add-col-desc add-cost-input" type="text" placeholder="Description"
              value={item.description} onChange={ev => setItem(item.globalIdx, { description: ev.target.value })} />
            <input className="add-col-sqft add-cost-input" type="text" placeholder="0"
              value={item.sqft} onChange={ev => setItem(item.globalIdx, { sqft: ev.target.value })} />
            <div className="add-col-rate rt-prefix-input add-cost-prefix">
              <span className="rt-prefix">$</span>
              <input type="text" placeholder="0.00"
                value={item.rate} onChange={ev => setItem(item.globalIdx, { rate: ev.target.value })} />
            </div>
            <div className="add-col-new add-cost-computed">
              {item.computed_cost_new > 0 ? fmtCurrency(item.computed_cost_new) : '—'}
            </div>
            <input className="add-col-depr add-cost-input" type="text" placeholder="$"
              value={item.depreciated_cost} onChange={ev => setItem(item.globalIdx, { depreciated_cost: ev.target.value })} />
          </div>
        ))}
      </div>

      {/* Flat rows */}
      <p className="rt-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Building Cost — Fixed Amount</p>
      <div className="add-cost-table add-cost-table--flat">
        <div className="add-cost-thead add-cost-thead--flat">
          <span className="add-col-desc-flat">Description</span>
          <span className="add-col-new-flat">Est Cost New</span>
          <span className="add-col-depr-flat">Depr. Cost</span>
        </div>
        {flatItems.map(item => (
          <div key={item.globalIdx} className="add-cost-row add-cost-row--flat">
            <input className="add-col-desc-flat add-cost-input" type="text" placeholder="Description"
              value={item.description} onChange={ev => setItem(item.globalIdx, { description: ev.target.value })} />
            <div className="add-col-new-flat rt-prefix-input add-cost-prefix">
              <span className="rt-prefix">$</span>
              <input type="text" placeholder="0"
                value={item.cost_new} onChange={ev => setItem(item.globalIdx, { cost_new: ev.target.value })} />
            </div>
            <input className="add-col-depr-flat add-cost-input" type="text" placeholder="$"
              value={item.depreciated_cost} onChange={ev => setItem(item.globalIdx, { depreciated_cost: ev.target.value })} />
          </div>
        ))}
      </div>

      {/* Total Replacement Cost */}
      <div className="add-cost-total">
        <span>Total Replacement Cost</span>
        <span className="add-cost-total-val">{fmtCurrency(totalReplacement)}</span>
      </div>

      {/* Depreciation */}
      <p className="rt-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Accrued Depreciation</p>
      <div className="rt-row">
        {[
          ['Physical Deterioration',  'physical_deterioration'],
          ['Functional Obsolescence', 'functional_obsolescence'],
          ['External Obsolescence',   'external_obsolescence'],
        ].map(([lbl, key]) => (
          <div key={key} className="rt-field rt-field-narrow">
            <label>{lbl}</label>
            <div className="rt-suffix-input">
              <input type="text" value={ca[key] ?? ''} onChange={ev => set(key, ev.target.value)} />
              <span className="rt-suffix">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rt-row">
        <div className="rt-field rt-field-wide">
          <label>Comments on Depreciation Method</label>
          <input type="text" value={ca.depreciation_comments ?? ''} onChange={ev => set('depreciation_comments', ev.target.value)} />
        </div>
      </div>

      <div className="add-cost-depr-summary">
        <div>
          Total: <strong>{totalDeprPct.toFixed(1)}%</strong> ×{' '}
          {fmtCurrency(totalReplacement)} ={' '}
          <strong className="add-depr-dollar">{fmtCurrency(totalDeprDollar)}</strong>
        </div>
        <div style={{ marginTop: 6 }}>
          Depreciated Value of Improvements:{' '}
          <strong className="add-depr-value">{fmtCurrency(depreciatedValue)}</strong>
        </div>
      </div>

      {/* Final estimated value */}
      <div className="rt-row" style={{ marginTop: 20 }}>
        <div className="rt-field">
          <label>Estimated Value by Cost Approach (rounded)</label>
          <div className="rt-prefix-input ht-value-input">
            <span className="rt-prefix">$</span>
            <input type="text" className="ht-value-number" placeholder="0"
              value={ca.estimated_value ?? ''} onChange={ev => set('estimated_value', ev.target.value)} />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="rt-row">
        <div className="rt-field rt-field-wide">
          <div className="add-section-toolbar" style={{ marginBottom: 6 }}>
            <label style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>Analyses / Comments</label>
            <ResponsePicker
              category="cost_approach"
              onInsert={text => set('comments', ca.comments ? `${ca.comments}\n\n${text}` : text)}
            />
          </div>
          <textarea rows={5} value={ca.comments ?? ''} onChange={ev => set('comments', ev.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ─── MARKET RENT SECTION ──────────────────────────────────────────────────────

const RENT_ROWS = [
  { key: 'data_source',  label: 'Data Source' },
  { key: 'date',         label: 'Date' },
  { key: 'rent_rate',    label: 'Rent ($/month)' },
  { key: 'location',     label: 'Location' },
  { key: 'design_style', label: 'Design/Style' },
  { key: 'floor_area',   label: 'Livable Floor Area' },
  { key: 'bedrooms',     label: 'Bedrooms' },
  { key: 'bathrooms',    label: 'Bathrooms' },
  { key: 'other',        label: 'Other (specify)' },
];

const RENT_INCLUSIONS = [
  ['electricity',      'Electricity'],
  ['hot_water',        'Hot Water'],
  ['garbage',          'Garbage Collection'],
  ['cable',            'Cable/High Speed'],
  ['parking',          'Parking'],
  ['maintenance_fees', 'Maintenance Fees'],
  ['water_levies',     'Water Levies'],
  ['heating',          'Heating'],
  ['fridge',           'Fridge'],
  ['stove',            'Stove'],
];

function MarketRentSection({ marketRent, onMarketRentChange, fullReport }) {
  const mr   = marketRent ?? {};
  const incl = mr.included_in_rent ?? {};
  const subj = fullReport?.subject ?? {};

  const comps = useMemo(() => ensureRentComps(mr.comparables), [mr.comparables]);

  const set     = (k, v) => onMarketRentChange({ ...mr, [k]: v });
  const setIncl = (k, v) => onMarketRentChange({ ...mr, included_in_rent: { ...incl, [k]: v } });
  const updComp = (i, patch) =>
    set('comparables', comps.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  return (
    <div>
      <div className="rt-field" style={{ marginBottom: 12 }}>
        <label>Property Address <span className="rt-source-badge">auto-filled</span></label>
        <div className="rt-display">{subj.address || '—'}</div>
      </div>

      <div className="rt-row">
        <div className="rt-field">
          <label>Use Conforms to Legal Use</label>
          <div className="rt-check-group" style={{ marginBottom: 0 }}>
            {[['true','Yes'],['false','No (see comments)']].map(([v, lbl]) => (
              <label key={v} className="rt-check">
                <input type="radio" checked={String(mr.use_conforms) === v} onChange={() => set('use_conforms', v === 'true')} />
                {lbl}
              </label>
            ))}
          </div>
        </div>
        <div className="rt-field">
          <label>Currently Rented</label>
          <div className="rt-check-group" style={{ marginBottom: 0 }}>
            {[['true','Yes'],['false','No']].map(([v, lbl]) => (
              <label key={v} className="rt-check">
                <input type="radio" checked={String(mr.currently_rented) === v} onChange={() => set('currently_rented', v === 'true')} />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      </div>

      {mr.currently_rented && (
        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <label>Rental History</label>
            <textarea rows={3} value={mr.rental_history ?? ''} onChange={ev => set('rental_history', ev.target.value)} />
          </div>
        </div>
      )}

      <p className="rt-section-title" style={{ marginTop: 16, marginBottom: 8 }}>Included in Market Rent</p>
      <div className="rt-check-group">
        {RENT_INCLUSIONS.map(([key, label]) => (
          <label key={key} className="rt-check">
            <input type="checkbox" checked={incl[key] ?? false} onChange={ev => setIncl(key, ev.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      <div className="rt-row" style={{ marginTop: 12 }}>
        <div className="rt-field rt-field-wide">
          <label>Rental Market Comments</label>
          <textarea rows={4} value={mr.market_comments ?? ''} onChange={ev => set('market_comments', ev.target.value)}
            placeholder="Describe supply, demand, and vacancy rates…" />
        </div>
      </div>

      {/* Comp table */}
      <p className="rt-section-title" style={{ marginTop: 20, marginBottom: 10 }}>Comparable Rental Data</p>
      <div className="add-rent-wrap">
        <table className="add-rent-table">
          <thead>
            <tr>
              <th className="add-rent-th add-rent-th--label">Field</th>
              <th className="add-rent-th add-rent-th--subj">Subject</th>
              {comps.map((_, i) => <th key={i} className="add-rent-th">Comp {i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {RENT_ROWS.map(row => (
              <tr key={row.key}>
                <td className="add-rent-label-cell">{row.label}</td>
                <td className="add-rent-subj-cell">—</td>
                {comps.map((comp, ci) => (
                  <td key={ci} className="add-rent-comp-cell">
                    <input type="text" className="add-rent-input"
                      value={comp[row.key] ?? ''} onChange={ev => updComp(ci, { [row.key]: ev.target.value })} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rt-row" style={{ marginTop: 16 }}>
        <div className="rt-field rt-field-wide">
          <label>Final Estimate of Rent — Analysis</label>
          <textarea rows={5} value={mr.final_estimate ?? ''} onChange={ev => set('final_estimate', ev.target.value)} />
        </div>
      </div>
      <div className="rt-row">
        <div className="rt-field">
          <label>Estimated Rent — From</label>
          <div className="rt-prefix-input">
            <span className="rt-prefix">$</span>
            <input type="text" placeholder="0/month"
              value={mr.estimated_rent_from ?? ''} onChange={ev => set('estimated_rent_from', ev.target.value)} />
          </div>
        </div>
        <div className="rt-field">
          <label>Estimated Rent — To</label>
          <div className="rt-prefix-input">
            <span className="rt-prefix">$</span>
            <input type="text" placeholder="0/month"
              value={mr.estimated_rent_to ?? ''} onChange={ev => set('estimated_rent_to', ev.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AddendaTab({
  scope, onScopeChange,
  extraordinaryItems, onExtraordinaryItemsChange,
  narrative, onNarrativeChange,
  costApproach, onCostApproachChange,
  marketRent, onMarketRentChange,
  incomeApproach, onIncomeApproachChange,
  addenda, onAddendaChange,
  fullReport,
  inspectionId,
  onNavigate,
}) {
  const add  = addenda ?? {};
  const impr = fullReport?.improvements ?? {};
  const meta = fullReport?.meta         ?? {};

  // Auto-include detection
  const autoExtraordinary = meta.has_extraordinary             ?? false;
  const autoCost          = meta.approaches_used?.cost         ?? false;
  const autoMarketRent    = meta.purpose_mr                    ?? false;
  const autoAdditional    = (new Set(fullReport?.comparables_groups_enabled ?? [0])).has(2);
  const showAsIfComplete  = impr.under_construction            ?? false;

  function toggle(key) {
    onAddendaChange({ ...add, [key]: !add[key] });
  }

  function toggleWithSection(addKey, sectionData, sectionOnChange) {
    const next = !add[addKey];
    onAddendaChange({ ...add, [addKey]: next });
    sectionOnChange({ ...sectionData, included: next });
  }

  return (
    <div className="rt-body add-body">

      {/* 1. Scope of Work */}
      <AddendaItem icon="📋" title="Scope of Work" required>
        <ScopeSection scope={scope} onScopeChange={onScopeChange} />
      </AddendaItem>

      {/* 2. Photographs */}
      <AddendaItem icon="📷" title="Photographs" required>
        <p className="rt-hint" style={{ marginBottom: 10 }}>Photographs are managed in the Photos tab (Tab 11).</p>
        <button type="button" className="add-goto-btn" onClick={() => onNavigate?.('photos')}>
          Go to Photos →
        </button>
      </AddendaItem>

      {/* 3. Extraordinary Items */}
      <AddendaItem
        icon="⚠️" title="Extraordinary Items"
        autoIncluded={autoExtraordinary}
        included={add.extraordinary_items ?? false}
        onToggle={() => toggleWithSection('extraordinary_items', extraordinaryItems ?? {}, onExtraordinaryItemsChange)}
      >
        <ExtraordinarySection
          extraordinaryItems={extraordinaryItems}
          onExtraordinaryItemsChange={onExtraordinaryItemsChange}
        />
      </AddendaItem>

      {/* 4. Narrative */}
      <AddendaItem
        icon="📝" title="Narrative Addendum"
        included={add.narrative ?? false}
        onToggle={() => toggleWithSection('narrative', narrative ?? {}, onNarrativeChange)}
      >
        <NarrativeSection narrative={narrative} onNarrativeChange={onNarrativeChange} />
      </AddendaItem>

      {/* 5. Cost Approach */}
      <AddendaItem
        icon="🏗️" title="Cost Approach"
        autoIncluded={autoCost}
        included={add.cost_approach ?? false}
        onToggle={() => toggle('cost_approach')}
      >
        <CostApproachSection
          costApproach={costApproach}
          onCostApproachChange={onCostApproachChange}
          fullReport={fullReport}
        />
      </AddendaItem>

      {/* 6. Market Rent */}
      <AddendaItem
        icon="🏠" title="Market Rent Addendum"
        autoIncluded={autoMarketRent}
        included={add.market_rent ?? false}
        onToggle={() => toggleWithSection('market_rent', marketRent ?? {}, onMarketRentChange)}
      >
        <MarketRentSection
          marketRent={marketRent}
          onMarketRentChange={onMarketRentChange}
          fullReport={fullReport}
        />
      </AddendaItem>

      {/* 7. Income Approach */}
      <AddendaItem
        icon="💰" title="Income Approach"
        included={add.income_approach ?? false}
        onToggle={() => toggleWithSection('income_approach', incomeApproach ?? {}, onIncomeApproachChange)}
      >
        <div className="add-placeholder">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
          <p>Income Approach addendum — planned for a future update.</p>
        </div>
      </AddendaItem>

      {/* 8. As Is / As If Complete — shown only if under construction */}
      {showAsIfComplete && (
        <AddendaItem icon="🏚️" title="As Is / As If Complete" required>
          <div className="rt-row">
            <div className="rt-field">
              <label>Appraisal Basis <span className="rt-source-badge">set in Tab 6</span></label>
              <div className="rt-check-group" style={{ marginBottom: 0 }}>
                <label className="rt-check">
                  <input type="radio" readOnly checked={impr.appraised_as_is ?? true} onChange={() => {}} /> Appraised As Is
                </label>
                <label className="rt-check">
                  <input type="radio" readOnly checked={impr.as_if_complete   ?? false} onChange={() => {}} /> As If Complete
                </label>
              </div>
            </div>
            <div className="rt-field">
              <label>Construction Complete</label>
              <div className="rt-display">{impr.construction_complete_pct ? `${impr.construction_complete_pct}%` : '—'}</div>
            </div>
            <div className="rt-field">
              <label>Additions Complete</label>
              <div className="rt-display">{impr.additions_complete_pct ? `${impr.additions_complete_pct}%` : '—'}</div>
            </div>
          </div>
          {impr.construction_comments && (
            <div className="rt-field" style={{ marginTop: 12 }}>
              <label>Construction Comments</label>
              <div className="rt-display">{impr.construction_comments}</div>
            </div>
          )}
          <div className="add-placeholder" style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>As-if-complete comparable grid coming in next update.</p>
          </div>
        </AddendaItem>
      )}

      {/* 9. Additional Sales */}
      <AddendaItem
        icon="📊" title="Additional Sales"
        autoIncluded={autoAdditional}
        included={add.additional_sales ?? false}
        onToggle={() => toggle('additional_sales')}
      >
        <div className="rt-field">
          <label>Notes</label>
          <textarea rows={5}
            value={add.additional_sales_notes ?? ''}
            onChange={ev => onAddendaChange({ ...add, additional_sales_notes: ev.target.value })}
            placeholder="Full additional comp grid (comps 7–12) coming in next update. Use this field for interim notes."
          />
        </div>
      </AddendaItem>

      {/* 10. Building Sketch */}
      <AddendaItem
        icon="📐" title="Building Sketch"
        included={add.building_sketch ?? false}
        onToggle={() => toggle('building_sketch')}
      >
        <FileUploadField
          label="Upload Sketch / Floor Plan"
          hint="Accepts JPG, PNG, PDF · Max 10MB"
          url={add.sketch_url ?? ''}
          onUrl={url => onAddendaChange({ ...add, sketch_url: url })}
          inspectionId={inspectionId}
          room="report-sketch"
        />
      </AddendaItem>

      {/* 11. Maps */}
      <AddendaItem
        icon="🗺️" title="Maps"
        included={add.maps ?? false}
        onToggle={() => toggle('maps')}
      >
        {[
          { label: 'Zoning Map',  urlKey: 'zoning_map_url', hint: 'JPG, PNG, PDF · Max 10MB', room: 'report-zoning-map'  },
          { label: 'Aerial Map',  urlKey: 'aerial_map_url', hint: 'JPG, PNG, PDF · Max 10MB', room: 'report-aerial-map'  },
          { label: 'Site Map',    urlKey: 'site_map_url',   hint: 'JPG, PNG, PDF · Max 10MB', room: 'report-site-map'    },
        ].map(({ label, urlKey, hint, room }) => (
          <div key={urlKey} style={{ marginBottom: 20 }}>
            <p className="rt-section-title" style={{ marginBottom: 8 }}>{label}</p>
            <FileUploadField
              label={`Upload ${label}`}
              hint={hint}
              url={add[urlKey] ?? ''}
              onUrl={url => onAddendaChange({ ...add, [urlKey]: url })}
              inspectionId={inspectionId}
              room={room}
            />
          </div>
        ))}
        <div className="rt-field" style={{ marginTop: 4 }}>
          <label>Additional Map Type</label>
          <select value={add.addendum_dropdown5 ?? ''} onChange={ev => onAddendaChange({ ...add, addendum_dropdown5: ev.target.value })}>
            {['','Agricultural Land Reserve','Elevation Profile Addendum','Flood Map Addendum','Google Earth Addendum','Official Community Plan Map','Plot Map Addendum','Site Map Addendum','Other (specify)']
              .map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
          </select>
        </div>
        <div className="add-future-note">
          ⭐ Google Maps auto-generation coming in a future update
        </div>
      </AddendaItem>

    </div>
  );
}
