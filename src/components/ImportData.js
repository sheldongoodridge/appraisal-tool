import { useState, useRef } from 'react';
import { importCSV, getImportJob } from '../services/api';

const POLL_INTERVAL = 2000;

export default function ImportData({ onClose }) {
  const [file, setFile]         = useState(null);
  const [stage, setStage]       = useState('idle'); // idle | uploading | processing | done | error
  const [job, setJob]           = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef                 = useRef(null);
  const fileInputRef            = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ok = f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (!ok) { setErrorMsg('Please select a .csv or .xlsx file.'); return; }
    setErrorMsg('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const syntheticEvent = { target: { files: [f] } };
    handleFileChange(syntheticEvent);
  };

  const startImport = async () => {
    if (!file) return;
    setStage('uploading');
    setErrorMsg('');
    try {
      const { job_id, total } = await importCSV(file);
      setJob({ id: job_id, total_rows: total, processed: 0, status: 'pending' });
      setStage('processing');
      pollRef.current = setInterval(() => pollJob(job_id), POLL_INTERVAL);
    } catch (err) {
      setStage('error');
      setErrorMsg(err.response?.data?.error || 'Upload failed. Please try again.');
    }
  };

  const pollJob = async (jobId) => {
    try {
      const data = await getImportJob(jobId);
      setJob(data);
      if (data.status === 'done' || data.status === 'error') {
        clearInterval(pollRef.current);
        setStage(data.status === 'done' ? 'done' : 'error');
        if (data.status === 'error') setErrorMsg('Import failed during processing.');
      }
    } catch {
      clearInterval(pollRef.current);
      setStage('error');
      setErrorMsg('Lost connection while checking import status.');
    }
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setFile(null);
    setJob(null);
    setStage('idle');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pct = job && job.total_rows > 0
    ? Math.round((job.processed / job.total_rows) * 100)
    : 0;

  return (
    <div className="import-data">
      <div className="import-header">
        <h2>Import Historical Data</h2>
        <button className="btn btn-small" onClick={onClose}>← Back to Inspections</button>
      </div>

      <div className="import-body">
        <div className="import-info-box">
          <strong>Expected columns (CRAL export)</strong>
          <p>
            File No. · Tracking No. · Case Number · Client File · Form Type · Loan Type ·
            Property Type · Borrower Last Name · Borrower First Name · Appraiser ·
            Client Code · Client Misc · Property Address
          </p>
          <p className="import-note">Columns are auto-mapped. Extra columns are ignored. One property record is created per unique address.</p>
        </div>

        {stage === 'idle' && (
          <>
            <div
              className="drop-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current.click()}
            >
              {file
                ? <span className="drop-zone-file">📄 {file.name}</span>
                : <span>Drop your .csv or .xlsx file here, or <u>click to browse</u></span>
              }
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            {errorMsg && <p className="import-error">{errorMsg}</p>}
            <button
              className="btn btn-primary"
              onClick={startImport}
              disabled={!file}
            >
              Start Import
            </button>
          </>
        )}

        {stage === 'uploading' && (
          <div className="import-status">
            <p>Uploading file...</p>
            <div className="progress-bar">
              <div className="progress-fill progress-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {stage === 'processing' && job && (
          <div className="import-status">
            <p>Processing records...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="progress-label">{job.processed} / {job.total_rows} records ({pct}%)</p>
            <div className="import-stats">
              <span>Properties created: <strong>{job.properties_created}</strong></span>
              <span>Clients found: <strong>{job.clients_found}</strong></span>
              <span>Imported: <strong>{job.imported}</strong></span>
              <span>Skipped: <strong>{job.skipped}</strong></span>
            </div>
          </div>
        )}

        {stage === 'done' && job && (
          <div className="import-complete">
            <h3>✓ Import Complete</h3>
            <div className="import-results">
              <div className="result-stat">
                <span className="stat-num">{job.imported}</span>
                <span>Records imported</span>
              </div>
              <div className="result-stat">
                <span className="stat-num">{job.properties_created}</span>
                <span>Properties created</span>
              </div>
              <div className="result-stat">
                <span className="stat-num">{job.clients_found}</span>
                <span>Clients found</span>
              </div>
              <div className="result-stat">
                <span className="stat-num">{job.skipped}</span>
                <span>Skipped</span>
              </div>
            </div>
            {job.errors?.length > 0 && (
              <details className="import-errors-detail">
                <summary>{job.errors.length} rows had errors</summary>
                <ul>
                  {job.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                  {job.errors.length > 20 && <li>...and {job.errors.length - 20} more</li>}
                </ul>
              </details>
            )}
            <button className="btn btn-small" onClick={reset}>Import Another File</button>
          </div>
        )}

        {stage === 'error' && (
          <div className="import-error-state">
            <p className="import-error">{errorMsg}</p>
            <button className="btn btn-small" onClick={reset}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
