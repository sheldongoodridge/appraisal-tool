import { useMemo } from 'react';

// ─── AUTO-WARNING DETECTOR ────────────────────────────────────────────────────

function computeWarnings(report) {
  const site  = report.site          ?? {};
  const impr  = report.improvements  ?? {};
  const nbhd  = report.neighbourhood ?? {};
  const recon = report.reconciliation ?? {};
  const summ  = report.summary        ?? {};
  const warns = [];

  if (summ.trends?.toLowerCase().includes('declin'))
    warns.push({ key: 'trend',   label: 'Declining Price Trend',
                 source: 'Trends field contains "declin"' });
  if (site.detrimental_observed || impr.detrimental_observed || nbhd.detrimental_observed)
    warns.push({ key: 'detrim',  label: 'Detrimental Conditions Observed',
                 source: 'Detrimental flag set in Site / Improvements / Neighbourhood' });
  if (site.in_floodplain)
    warns.push({ key: 'flood',   label: 'Subject Located in Flood Zone',
                 source: 'Site: in floodplain' });
  if (site.existing_use_conforms === false)
    warns.push({ key: 'conform', label: 'Existing Use Does Not Conform to Zoning',
                 source: 'Site: existing use non-conforming' });
  if (recon.remaining_economic_life && Number(recon.remaining_economic_life) < 20)
    warns.push({ key: 'rel',     label: `Remaining Economic Life < 20 Years (${recon.remaining_economic_life} yrs)`,
                 source: 'Reconciliation: REL field' });
  if (String(impr.solar_panels).toLowerCase().includes('leas'))
    warns.push({ key: 'solar',   label: 'Solar Panels Are Leased',
                 source: 'Improvements: solar panels' });

  return warns;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CoverTab({ cover, summary, fullReport, onCoverChange, onSummaryChange }) {
  const setC = (k, v) => onCoverChange({ ...cover,   [k]: v });
  const setS = (k, v) => onSummaryChange({ ...summary, [k]: v });

  const autoWarnings = useMemo(() => computeWarnings(fullReport), [fullReport]);

  const appendWarning = (label) => {
    const current = summary.warnings || '';
    const line = `• ${label}`;
    if (current.includes(line)) return;
    setS('warnings', current ? `${current}\n${line}` : line);
  };

  return (
    <div className="rt-body">

      {/* ── SECTION A: COVER LETTER ── */}
      <div className="rt-section">
        <h3 className="rt-section-title">Cover Letter Options</h3>
        <div className="rt-check-group">
          <label className="rt-check">
            <input type="checkbox"
              checked={cover.hypothetical_condition_letter}
              onChange={e => setC('hypothetical_condition_letter', e.target.checked)} />
            Hypothetical Condition Letter
          </label>
          <label className="rt-check">
            <input type="checkbox"
              checked={cover.draft_copy_disclaimer}
              onChange={e => setC('draft_copy_disclaimer', e.target.checked)} />
            Draft / Broker Copy Disclaimer
          </label>
          <label className="rt-check">
            <input type="checkbox"
              checked={cover.owner_borrower_disclaimer}
              onChange={e => setC('owner_borrower_disclaimer', e.target.checked)} />
            Owner / Borrower Disclaimer
          </label>
        </div>

        <div className="rt-field">
          <label>Letter Body</label>
          <textarea rows={8} value={cover.letter_body}
            placeholder="Standard cover letter text…"
            onChange={e => setC('letter_body', e.target.value)} />
        </div>
        <div className="rt-field">
          <label>
            Letter Body 2
            <span className="rt-hint"> — conditional clauses</span>
          </label>
          <textarea rows={4} value={cover.letter_body2}
            onChange={e => setC('letter_body2', e.target.value)} />
        </div>
      </div>

      {/* ── SECTION B: EXECUTIVE SUMMARY ── */}
      <div className="rt-section">
        <h3 className="rt-section-title">Executive Summary</h3>

        <div className="rt-row">
          <div className="rt-field">
            <label>Final Value Opinion <span className="rt-required">*</span></label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.final_value}
                placeholder="0"
                onChange={e => setS('final_value', e.target.value)} />
            </div>
          </div>
          <div className="rt-field">
            <label>Land Value</label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.land_value}
                disabled={summary.land_value_na}
                placeholder="0"
                onChange={e => setS('land_value', e.target.value)} />
            </div>
          </div>
          <div className="rt-field rt-field-auto">
            <label>&nbsp;</label>
            <label className="rt-check">
              <input type="checkbox" checked={summary.land_value_na}
                onChange={e => setS('land_value_na', e.target.checked)} />
              N/A
            </label>
          </div>
        </div>

        <div className="rt-row">
          <div className="rt-field">
            <label>Current Purchase Price</label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.current_purchase_price}
                onChange={e => setS('current_purchase_price', e.target.value)} />
            </div>
          </div>
          <div className="rt-field">
            <label>Current List Price</label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.current_list_price}
                onChange={e => setS('current_list_price', e.target.value)} />
            </div>
          </div>
          <div className="rt-field">
            <label>Prior List Price (1yr)</label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.prior_list_price}
                onChange={e => setS('prior_list_price', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rt-row">
          <div className="rt-field">
            <label>Last Sold Price (3yr)</label>
            <div className="rt-prefix-input">
              <span className="rt-prefix">$</span>
              <input type="text" value={summary.last_sold_price}
                onChange={e => setS('last_sold_price', e.target.value)} />
            </div>
          </div>
          <div className="rt-field">
            <label>Last Sold Date</label>
            <input type="date" value={summary.last_sold_date || ''}
              onChange={e => setS('last_sold_date', e.target.value)} />
          </div>
        </div>

        <div className="rt-field">
          <label>Reconciliation Summary</label>
          <textarea rows={4} value={summary.reconciliation}
            onChange={e => setS('reconciliation', e.target.value)} />
        </div>
        <div className="rt-field">
          <label>Exposure Analysis</label>
          <textarea rows={3} value={summary.exposure_analysis}
            onChange={e => setS('exposure_analysis', e.target.value)} />
        </div>
        <div className="rt-field">
          <label>Trends</label>
          <textarea rows={3} value={summary.trends}
            onChange={e => setS('trends', e.target.value)} />
        </div>
      </div>

      {/* ── SECTION C: WARNINGS ── */}
      <div className="rt-section">
        <h3 className="rt-section-title">Report Warnings</h3>
        <div className="rt-field">
          <label>
            Warnings / Qualifications
            <span className="rt-hint"> — appears on cover page</span>
          </label>
          <textarea rows={4} value={summary.warnings}
            placeholder="Add any special warnings or conditions for this report…"
            onChange={e => setS('warnings', e.target.value)} />
        </div>

        {autoWarnings.length > 0 && (
          <div className="rt-warn-panel">
            <div className="rt-warn-panel-title">Auto-detected conditions:</div>
            {autoWarnings.map(w => (
              <div key={w.key} className="rt-warn-row">
                <span className="rt-warn-icon">⚠️</span>
                <div className="rt-warn-text">
                  <div className="rt-warn-label">{w.label}</div>
                  <div className="rt-warn-source">{w.source}</div>
                </div>
                <button className="rt-warn-btn" onClick={() => appendWarning(w.label)}>
                  Include in Report
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rt-warn-row rt-warn-manual">
          <span className="rt-warn-icon">⚠️</span>
          <div className="rt-warn-text">
            <div className="rt-warn-label">Purchase Price 10%+ Higher / Lower Than Market Value</div>
            <div className="rt-warn-source">Manual trigger</div>
          </div>
          <button className="rt-warn-btn"
            onClick={() => appendWarning('Purchase price deviates significantly from indicated market value')}>
            Include in Report
          </button>
        </div>
      </div>

    </div>
  );
}
