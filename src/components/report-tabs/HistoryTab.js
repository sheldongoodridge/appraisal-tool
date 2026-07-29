import ResponsePicker from './ResponsePicker';

function YesNo({ label, value, onChange }) {
  return (
    <div className="rt-row">
      <div className="rt-field">
        <label>{label}</label>
        <div className="rt-check-group" style={{ marginBottom: 0 }}>
          <label className="rt-check">
            <input type="radio" checked={value === true}  onChange={() => onChange(true)}  /> Yes
          </label>
          <label className="rt-check">
            <input type="radio" checked={value === false} onChange={() => onChange(false)} /> No
          </label>
        </div>
      </div>
    </div>
  );
}

export default function HistoryTab({
  history, onHistoryChange,
  exposure, onExposureChange,
  reconciliation, onReconciliationChange,
  scope, onScopeChange,
  fullReport,
}) {
  const h = history        ?? {};
  const e = exposure       ?? {};
  const r = reconciliation ?? {};
  const s = scope          ?? {};

  const setH = (k, v) => onHistoryChange({ ...h, [k]: v });
  const setE = (k, v) => onExposureChange({ ...e, [k]: v });
  const setR = (k, v) => onReconciliationChange({ ...r, [k]: v });
  const setS = (k, v) => onScopeChange({ ...s, [k]: v });

  const asIfComplete = fullReport?.improvements?.as_if_complete ?? false;

  return (
    <div className="rt-body">

      {/* ── A: SALE HISTORY ── */}
      <div className="rt-section">
        <p className="rt-section-title">A — Sale History</p>

        <YesNo
          label="Subject Sold Within 3 Years of Effective Date"
          value={h.sold_within_3_years ?? false}
          onChange={v => setH('sold_within_3_years', v)}
        />

        {h.sold_within_3_years && (
          <div className="rt-row">
            <div className="rt-field">
              <label>Date</label>
              <input type="date" value={h.sale_date ?? ''} onChange={ev => setH('sale_date', ev.target.value)} />
            </div>
            <div className="rt-field">
              <label>Source</label>
              <input type="text" value={h.sale_source ?? ''} onChange={ev => setH('sale_source', ev.target.value)} placeholder="e.g. Offer to Purchase" />
            </div>
            <div className="rt-field">
              <label>Sale Price</label>
              <div className="rt-prefix-input">
                <span className="rt-prefix">$</span>
                <input type="text" value={h.sale_price ?? ''} onChange={ev => setH('sale_price', ev.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <label>Sale Transfer History <span className="rt-hint">— minimum three years</span></label>
            <textarea
              rows={4}
              value={h.sale_transfer_history ?? ''}
              onChange={ev => setH('sale_transfer_history', ev.target.value)}
              placeholder="Include all transfers of title within the past 3 years"
            />
          </div>
        </div>
      </div>

      {/* ── B: LISTING HISTORY ── */}
      <div className="rt-section">
        <p className="rt-section-title">B — Listing History</p>

        <YesNo
          label="Subject Listed Within 1 Year of Effective Date"
          value={h.listed_within_1_year ?? false}
          onChange={v => setH('listed_within_1_year', v)}
        />

        {h.listed_within_1_year && (
          <div className="rt-row">
            <div className="rt-field rt-field-narrow">
              <label>Last List Price</label>
              <div className="rt-prefix-input">
                <span className="rt-prefix">$</span>
                <input type="text" value={h.last_list_price ?? ''} onChange={ev => setH('last_list_price', ev.target.value)} />
              </div>
            </div>
          </div>
        )}

        <YesNo
          label="Subject Currently Listed"
          value={h.currently_listed ?? false}
          onChange={v => setH('currently_listed', v)}
        />

        {h.currently_listed && (
          <div className="rt-row">
            <div className="rt-field rt-field-narrow">
              <label>Current List Price</label>
              <div className="rt-prefix-input">
                <span className="rt-prefix">$</span>
                <input type="text" value={h.current_list_price ?? ''} onChange={ev => setH('current_list_price', ev.target.value)} />
              </div>
            </div>
          </div>
        )}

        <YesNo
          label="Under Contract / Agreement of Purchase and Sale"
          value={h.under_contract ?? false}
          onChange={v => setH('under_contract', v)}
        />

        {h.under_contract && (
          <div className="rt-row">
            <div className="rt-field">
              <label>Copy Obtained</label>
              <div className="rt-check-group" style={{ marginBottom: 0 }}>
                <label className="rt-check">
                  <input type="radio" checked={h.obtained === true}  onChange={() => setH('obtained', true)}  /> Yes
                </label>
                <label className="rt-check">
                  <input type="radio" checked={h.obtained === false} onChange={() => setH('obtained', false)} /> No
                </label>
              </div>
            </div>
            <div className="rt-field">
              <label>Current / Pending Purchase Price</label>
              <div className="rt-prefix-input">
                <span className="rt-prefix">$</span>
                <input type="text" value={h.pending_price ?? ''} onChange={ev => setH('pending_price', ev.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <label>Agreements for Sale, Options, Listings or Marketing of the Subject <span className="rt-hint">— minimum one year</span></label>
            <textarea
              rows={4}
              value={h.agreements ?? ''}
              onChange={ev => setH('agreements', ev.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── C: EXPOSURE TIME ── */}
      <div className="rt-section">
        <div className="ht-section-header">
          <p className="rt-section-title">C — Exposure Time</p>
          <ResponsePicker
            category="exposure"
            onInsert={text => setE('analysis', e.analysis ? `${e.analysis}\n\n${text}` : text)}
          />
        </div>
        <p className="rt-hint" style={{ marginBottom: 12 }}>
          Exposure Time is the estimated length of time the property interest being appraised would have been offered on the market before the hypothetical consummation of a sale at the estimated value on the Effective Date of the appraisal. (CUSPAP)
        </p>
        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <label>Exposure Analysis</label>
            <textarea rows={5} value={e.analysis ?? ''} onChange={ev => setE('analysis', ev.target.value)} />
          </div>
        </div>
        {asIfComplete && (
          <div className="rt-row">
            <div className="rt-field rt-field-wide">
              <label>As If Complete Exposure</label>
              <textarea rows={3} value={e.as_if ?? ''} onChange={ev => setE('as_if', ev.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── D: RECONCILIATION ── */}
      <div className="rt-section">
        <div className="ht-section-header">
          <p className="rt-section-title">D — Reconciliation</p>
          <ResponsePicker
            category="reconciliation"
            onInsert={text => setR('comments', r.comments ? `${r.comments}\n\n${text}` : text)}
          />
        </div>
        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <label>Reconciliation and Final Estimate of Value</label>
            <textarea rows={5} value={r.comments ?? ''} onChange={ev => setR('comments', ev.target.value)} />
          </div>
        </div>

        <div className="ht-final-box">
          <p className="ht-final-statement">
            UPON REVIEWING AND RECONCILING THE DATA, ANALYSES AND CONCLUSIONS OF EACH VALUATION APPROACH, THE MARKET VALUE OF THE INTEREST IN THE SUBJECT PROPERTY:
          </p>
          <div className="rt-row">
            <div className="rt-field">
              <label>AS AT (Effective Date)</label>
              <input type="date" value={r.effective_date ?? ''} onChange={ev => setR('effective_date', ev.target.value)} />
            </div>
            <div className="rt-field rt-field-wide">
              <label>IS ESTIMATED AT</label>
              <div className="rt-prefix-input ht-value-input">
                <span className="rt-prefix">$</span>
                <input
                  type="text"
                  className="ht-value-number"
                  value={r.final_value ?? ''}
                  onChange={ev => setR('final_value', ev.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div className="rt-row">
            <div className="rt-field">
              <label>COMPLETED ON (Date of Report)</label>
              <input type="date" value={r.report_date ?? ''} onChange={ev => setR('report_date', ev.target.value)} />
            </div>
            <div className="rt-field">
              <label>Remaining Economic Life</label>
              <div className="ht-years-row">
                <input type="text" value={r.remaining_economic_life ?? ''} onChange={ev => setR('remaining_economic_life', ev.target.value)} />
                <span className="ht-years-label">years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── E: SCOPE OF WORK ── */}
      <div className="rt-section">
        <div className="ht-section-header">
          <p className="rt-section-title">E — Scope of Work</p>
          <ResponsePicker
            category="scope"
            onInsert={text => setS('content', s.content ? `${s.content}\n\n${text}` : text)}
          />
        </div>
        <div className="rt-row">
          <div className="rt-field rt-field-wide">
            <textarea rows={6} value={s.content ?? ''} onChange={ev => setS('content', ev.target.value)} />
          </div>
        </div>
      </div>

    </div>
  );
}
