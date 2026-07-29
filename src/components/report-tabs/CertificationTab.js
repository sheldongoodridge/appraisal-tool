import { useState, useMemo } from 'react';

// ─── BOILERPLATE TEXT ─────────────────────────────────────────────────────────

const AIC_CONDITIONS = [
  "The appraiser assumes no responsibility for matters of a legal nature affecting the property or the title thereto.",
  "The property is assumed to be free and clear of any liens or encumbrances unless otherwise stated in this report.",
  "It is assumed that there are no hidden or unapparent conditions of the property, subsoil, or structures that render it more or less valuable. No responsibility is assumed for such conditions or for engineering or testing that might be required to discover them.",
  "The appraiser has relied on information provided by the client and others, and assumes it to be correct.",
  "Sketches, diagrams, floor plans, photographs, or other exhibits included in this report are intended to assist the reader in visualizing the property and are not to be construed as surveys or relied upon for other purposes.",
  "No opinion of title is rendered and the title is assumed to be marketable and in fee simple unless otherwise stated.",
  "The appraiser will not be required to give testimony or appear in court unless other specific arrangements are made in advance.",
  "The distribution of the total value estimated in this report between land and improvements applies only under the existing program of utilization.",
  "Possession of this report or a copy thereof does not carry with it the right of publication. The report may not be used for any purpose by any person other than the party to whom it is addressed without the written consent of the appraiser.",
  "The compensation for the appraiser is not contingent on the reporting of a predetermined value or direction in value that favours the cause of the client.",
  "Unless otherwise stated, the property is assumed to conform with applicable zoning and use regulations and restrictions.",
  "Neither all nor any part of the contents of this report shall be conveyed to the public through advertising, public relations, news, sales, or other media without the written consent and approval of the author.",
  "The appraiser assumes that all required licenses, certificates of occupancy, consents, or other legislative or administrative authority from any local, provincial, or national government agency, private entity, or organization have been or can be obtained or renewed for any use on which the opinion of value contained in this report is based.",
  "Information, estimates, and opinions furnished to the appraiser, and contained in this report, were obtained from sources considered reliable and believed to be true and correct. However, no representation or warranty, expressed or implied, is made nor is it to be inferred that any such information is accurate.",
  "The effective date of this appraisal is stated in the report. The dollar amount of any value opinion herein rendered is based upon the purchasing power of the Canadian dollar on that date.",
  "This appraisal was conducted and this report prepared in conformance with the Canadian Uniform Standards of Professional Appraisal Practice (CUSPAP) as adopted by the Appraisal Institute of Canada.",
  "Any amendments or supplements to this report, or any change in the opinions expressed herein, will require the written approval and signature of the appraiser.",
];

const AIC_CERTIFICATIONS = [
  "The statements of fact contained in this report are true and correct.",
  "The reported analyses, opinions, and conclusions are limited only by the reported assumptions and limiting conditions and are my personal, impartial, and unbiased professional analyses, opinions, and conclusions.",
  "I have no present or prospective interest in the property that is the subject of this report and no personal interest with respect to the parties involved.",
  "I have no bias with respect to the property that is the subject of this report or the parties involved with this assignment.",
  "My engagement in this assignment was not contingent upon developing or reporting predetermined results.",
  "My compensation for completing this assignment is not contingent upon the development or reporting of a predetermined value or direction in value that favours the cause of the client.",
  "My analyses, opinions, and conclusions were developed and this report has been prepared in conformity with the Canadian Uniform Standards of Professional Appraisal Practice (CUSPAP).",
  "I have made a personal inspection of the property that is the subject of this report, unless otherwise noted herein.",
  "No one provided significant professional assistance to the person signing this report unless otherwise noted.",
  "This appraisal assignment was not based on a requested minimum valuation, a specific valuation, or the approval of a loan.",
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PA_OPTIONS = [
  'N/A',
  'NAME, AIC Candidate Member, certifies that they assisted in data collection and analysis',
  'NAME, AOLS Member, certifies that the survey was prepared in accordance with established standards',
  'NAME, OGCA Member, certifies that the cost estimates are accurate',
  'NAME, ATEFQ Member, certifies that the analysis is accurate',
];

const SOURCE_OPTIONS = [
  'Software Company (Spoke Appraisal)',
  'Notarius',
  'PDF Secured',
  'Other (describe)',
];

const AIC_DESIGNATIONS = ['AIC Candidate Member', 'P.App., CRA', 'P.App., AACI'];

const COSIGNER_DESIGNATIONS = ['P.App., CRA', 'P.App., AACI'];

const ADDENDUM_OPTS_1 = ['', 'Narrative Addendum', 'Scope Addendum', 'Inspection Notes', 'Other (specify)'];
const ADDENDUM_OPTS_2 = ['', 'Comparable Sale Photographs', 'Market Rent', 'Plans/Specifications', 'Progress Inspection', 'Qualifications', 'Other (specify)'];
const ADDENDUM_OPTS_MAPS = [
  '', 'Agricultural Land Reserve', 'Elevation Profile Addendum',
  'Flood Map Addendum', 'Google Earth Addendum',
  'Official Community Plan Map', 'Plot Map Addendum',
  'Site Map Addendum', 'Other (specify)',
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Collapsible({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cert-collapsible">
      <div className="rt-collapsible-header" onClick={() => setOpen(o => !o)}>
        <span className="rt-collapsible-arrow">{open ? '▼' : '▶'}</span>
        {title}
      </div>
      {!open && <p className="cert-collapsed-hint">{subtitle}</p>}
      {open  && <div className="rt-collapsible-body cert-boilerplate-body">{children}</div>}
    </div>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function CertificationTab({
  certification, onCertificationChange,
  addenda, onAddendaChange,
  parties, onPartiesChange,
  fullReport,
}) {
  const cert = certification ?? {};
  const add  = addenda      ?? {};
  const app  = parties?.appraiser ?? {};
  const cos  = parties?.cosigner  ?? {};
  const subj = fullReport?.subject        ?? {};
  const meta = fullReport?.meta           ?? {};
  const recon = fullReport?.reconciliation ?? {};

  const setCert = (k, v) => onCertificationChange({ ...cert, [k]: v });
  const setAdd  = (k, v) => onAddendaChange({ ...add, [k]: v });
  const setCos  = (k, v) => onPartiesChange({ ...parties, cosigner: { ...cos, [k]: v } });

  // ── Auto-computed addenda ──────────────────────────────────────────────────
  const autoAddenda = useMemo(() => {
    const enabledGroups = new Set(fullReport?.comparables_groups_enabled ?? [0]);
    return {
      additional_sales:    enabledGroups.has(2) || enabledGroups.has(3),
      extraordinary_items: fullReport?.extraordinary_items?.included  ?? false,
      narrative:           fullReport?.narrative?.included            ?? false,
      photographs:         true,
      market_rent:         fullReport?.market_rent?.included          ?? false,
      cost_approach:       !!(fullReport?.cost_approach?.estimated_value),
      income_approach:     fullReport?.income_approach?.included      ?? false,
      scope_of_work:       true,
      progress_inspection: (fullReport?.meta?.inspection_type ?? '').toLowerCase().includes('progress'),
    };
  }, [fullReport]);

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const w = [];
    if (add.building_sketch && !fullReport?.building_sketch) {
      w.push('Building Sketch checked but no sketch has been uploaded');
    }
    if (add.market_rent && !(fullReport?.market_rent?.included)) {
      w.push('Market Rent checked but no rental comparable data found');
    }
    if (add.cost_approach && !(fullReport?.cost_approach?.estimated_value)) {
      w.push('Cost Approach checked but no cost approach data found');
    }
    return w;
  }, [add, fullReport]);

  const finalValue    = recon.final_value    || '—';
  const effectiveDate = recon.effective_date || meta.effective_date || '—';

  const ADDENDA_ITEMS = [
    { key: 'additional_sales',    label: 'Additional Sales',     auto: true },
    { key: 'extraordinary_items', label: 'Extraordinary Items',  auto: true },
    { key: 'narrative',           label: 'Narrative',            auto: true },
    { key: 'photographs',         label: 'Photographs',          auto: true },
    { key: 'building_sketch',     label: 'Building Sketch',      auto: false },
    { key: 'market_rent',         label: 'Market Rent',          auto: true },
    { key: 'maps',                label: 'Maps',                 auto: false },
    { key: 'cost_approach',       label: 'Cost Approach',        auto: true },
    { key: 'income_approach',     label: 'Income Approach',      auto: true },
    { key: 'scope_of_work',       label: 'Scope of Work',        auto: true },
    { key: 'progress_inspection', label: 'Progress Inspection',  auto: true },
    { key: 'plans_specifications',label: 'Plans/Specifications', auto: false },
  ];

  return (
    <div className="rt-body">

      {/* ── A: ASSUMPTIONS & LIMITING CONDITIONS ── */}
      <div className="rt-section">
        <p className="rt-section-title">A — Assumptions, Limiting Conditions & Disclaimers</p>
        <Collapsible
          title="Assumptions, Limiting Conditions, Disclaimers and Limitations of Liability"
          subtitle="Standard AIC assumptions and limiting conditions apply. Click to expand."
        >
          <ol className="cert-boilerplate-list">
            {AIC_CONDITIONS.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </Collapsible>
        <div className="rt-row" style={{ marginTop: 16 }}>
          <div className="rt-field rt-field-wide">
            <label>Additional Disclaimers</label>
            <textarea
              rows={3}
              value={cert.disclaimer_blank ?? ''}
              onChange={ev => setCert('disclaimer_blank', ev.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── B: CERTIFICATION STATEMENTS ── */}
      <div className="rt-section">
        <p className="rt-section-title">B — Certification</p>
        <Collapsible
          title="Certification"
          subtitle="Standard AIC certification statements 1–10 apply. Click to expand."
        >
          <ol className="cert-boilerplate-list">
            {AIC_CERTIFICATIONS.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </Collapsible>
        <div className="rt-row" style={{ marginTop: 16 }}>
          <div className="rt-field rt-field-wide">
            <label>Additional Certifications (if any)</label>
            <textarea
              rows={3}
              value={cert.extra_certifications ?? ''}
              onChange={ev => setCert('extra_certifications', ev.target.value)}
            />
          </div>
        </div>
        <div className="rt-row">
          <div className="rt-field">
            <label>Professional Assistance</label>
            <select
              value={cert.professional_assistance ?? 'N/A'}
              onChange={ev => setCert('professional_assistance', ev.target.value)}
            >
              {PA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── C: PROPERTY IDENTIFICATION ── */}
      <div className="rt-section">
        <p className="rt-section-title">C — Property Identification</p>
        <div className="rt-two-col">
          <div>
            {[
              ['Address',           subj.address],
              ['City',              subj.city],
              ['Province',          subj.province],
              ['Postal Code',       subj.postal_code],
              ['Legal Description', subj.legal_description],
            ].map(([lbl, val]) => (
              <div className="rt-field" key={lbl} style={{ marginBottom: 12 }}>
                <label>{lbl}</label>
                <div className="rt-display">{val || <span style={{ color: '#9ca3af' }}>—</span>}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="cert-final-stmt">
              <p className="cert-final-preamble">
                BASED UPON THE DATA, ANALYSES AND CONCLUSIONS CONTAINED HEREIN, THE MARKET VALUE OF THE INTEREST IN THE PROPERTY DESCRIBED:
              </p>
              <p className="cert-final-line">
                AS AT <strong>{effectiveDate}</strong>
              </p>
              <p className="cert-final-line">
                IS ESTIMATED AT <strong className="cert-final-value">${finalValue}</strong>
              </p>
              {meta.has_hypothetical && meta.hypothetical_type && (
                <p className="cert-final-line">
                  AS IF {meta.hypothetical_type}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── D: SIGNATURES ── */}
      <div className="rt-section">
        <p className="rt-section-title">D — Signatures</p>

        <div className="cert-sig-block">
          <p className="cert-sig-block-title">Primary Appraiser</p>
          <div className="rt-two-col">
            <div>
              {[
                ['Name',         app.name],
                ['Company',      app.company],
                ['Membership #', app.membership_number],
                ['Email',        app.email],
                ['Phone',        app.phone],
              ].map(([lbl, val]) => (
                <div className="rt-field" key={lbl} style={{ marginBottom: 12 }}>
                  <label>{lbl} <span className="rt-source-badge">from profile</span></label>
                  <div className="rt-display">{val || <span style={{ color: '#9ca3af' }}>—</span>}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="rt-field" style={{ marginBottom: 12 }}>
                <label>AIC Designation / Status <span className="rt-source-badge">from profile</span></label>
                <div className="cert-designation-group">
                  {AIC_DESIGNATIONS.map(d => (
                    <label key={d} className="rt-check">
                      <input type="radio" readOnly checked={app.designation === d} onChange={() => {}} />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rt-field" style={{ marginBottom: 12 }}>
                <label>Date of Inspection <span className="rt-source-badge">from workfile</span></label>
                <div className="rt-display">{meta.inspection_date || '—'}</div>
              </div>
              <div className="rt-field" style={{ marginBottom: 12 }}>
                <label>Inspection Type <span className="rt-source-badge">from workfile</span></label>
                <div className="rt-display">{meta.inspection_type || '—'}</div>
              </div>
              <div className="rt-field">
                <label>Source of Digital Signature Security</label>
                <select
                  value={cert.source_of_signature ?? 'Software Company (Spoke Appraisal)'}
                  onChange={ev => setCert('source_of_signature', ev.target.value)}
                >
                  {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="cert-sig-placeholder">
            <div className="cert-sig-area">
              <span className="cert-sig-hint">Digital signature will be applied on PDF generation</span>
            </div>
          </div>
        </div>

        {/* Co-Signer */}
        <div style={{ marginTop: 20 }}>
          <label className="rt-check" style={{ display: 'inline-flex', marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={cos.enabled ?? false}
              onChange={ev => setCos('enabled', ev.target.checked)}
            />
            Include Co-Signer
          </label>

          {cos.enabled && (
            <div className="cert-sig-block">
              <p className="cert-sig-block-title">Co-Signer</p>
              <div className="rt-two-col">
                <div>
                  <div className="rt-field" style={{ marginBottom: 12 }}>
                    <label>Name</label>
                    <input type="text" value={cos.name ?? ''} onChange={ev => setCos('name', ev.target.value)} />
                  </div>
                  <div className="rt-field" style={{ marginBottom: 12 }}>
                    <label>AIC Designation</label>
                    <select value={cos.designation ?? ''} onChange={ev => setCos('designation', ev.target.value)}>
                      <option value="" />
                      {COSIGNER_DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="rt-field">
                    <label>Membership #</label>
                    <input type="text" value={cos.membership_number ?? ''} onChange={ev => setCos('membership_number', ev.target.value)} />
                  </div>
                </div>
                <div>
                  <div className="rt-field" style={{ marginBottom: 12 }}>
                    <label>Date of Report</label>
                    <input type="date" value={cos.date_report ?? ''} onChange={ev => setCos('date_report', ev.target.value)} />
                  </div>
                  <div className="rt-field">
                    <label>Date of Inspection</label>
                    <input type="date" value={cos.date_inspection ?? ''} onChange={ev => setCos('date_inspection', ev.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── E: ADDENDA CHECKBOXES ── */}
      <div className="rt-section">
        <p className="rt-section-title">E — Attachments and Addenda</p>

        {warnings.length > 0 && (
          <div className="rt-warn-panel" style={{ marginBottom: 16 }}>
            <div className="rt-warn-panel-title">Addenda Warnings</div>
            {warnings.map((w, i) => (
              <div key={i} className="rt-warn-row">
                <span className="rt-warn-icon">⚠️</span>
                <span className="rt-warn-label">{w}</span>
              </div>
            ))}
          </div>
        )}

        <div className="cert-addenda-grid">
          {ADDENDA_ITEMS.map(({ key, label, auto }) => {
            const checked = auto ? (autoAddenda[key] ?? false) : (add[key] ?? false);
            return (
              <label key={key} className={`cert-addenda-item${auto ? ' cert-addenda-auto' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={auto}
                  onChange={!auto ? ev => setAdd(key, ev.target.checked) : undefined}
                />
                {label}
                {auto && <span className="cert-auto-badge">auto</span>}
              </label>
            );
          })}
        </div>

        <div className="rt-section-title" style={{ marginTop: 24, marginBottom: 12 }}>Additional Addenda</div>
        <div className="rt-row">
          {['addendum_dropdown', 'addendum_dropdown2', 'addendum_dropdown4'].map(k => (
            <div key={k} className="rt-field">
              <select value={add[k] ?? ''} onChange={ev => setAdd(k, ev.target.value)}>
                {ADDENDUM_OPTS_1.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="rt-row">
          {['addenda_dropdown2', 'addenda_dropdown3', 'addenda_dropdown4'].map(k => (
            <div key={k} className="rt-field">
              <select value={add[k] ?? ''} onChange={ev => setAdd(k, ev.target.value)}>
                {ADDENDUM_OPTS_2.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="rt-row">
          <div className="rt-field">
            <label>Maps</label>
            <select value={add.addendum_dropdown5 ?? ''} onChange={ev => setAdd('addendum_dropdown5', ev.target.value)}>
              {ADDENDUM_OPTS_MAPS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
