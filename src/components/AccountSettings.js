import { useState, useEffect } from 'react';
import { getOrganization, updateOrganization, sendInvite, getWorkfileSettings, saveWorkfileSettings } from '../services/api';

const PLAN_LABELS = { solo: 'Solo', solo_plus: 'Solo+', team: 'Team' };
const ROLE_LABELS = { org_admin: 'Admin', appraiser: 'Appraiser', assistant: 'Assistant', platform_admin: 'Platform Admin' };
const ROLE_COLORS = { org_admin: '#3b82f6', appraiser: '#22c55e', assistant: '#f97316', platform_admin: '#8b5cf6' };

function RoleBadge({ role }) {
  return (
    <span style={{ background: ROLE_COLORS[role] || '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function buildFileNumberPreview({ prefix, current_number, separator, year_format, suffix }) {
  const num = String(current_number || 1000).padStart(4, '0');
  const now = new Date();
  const year = year_format === 'YYYY' ? String(now.getFullYear()) : String(now.getFullYear()).slice(-2);
  return `${prefix || ''}${num}${separator ?? '-'}${year}${suffix || ''}`;
}

export default function AccountSettings({ currentUser, onUserUpdate }) {
  const [orgData, setOrgData] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('appraiser');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);

  // File numbering state
  const [, setFileSeq] = useState(null);
  const [fnPrefix, setFnPrefix] = useState('');
  const [fnNumber, setFnNumber] = useState(1000);
  const [fnYearFormat, setFnYearFormat] = useState('YY');
  const [fnSeparator, setFnSeparator] = useState('-');
  const [fnSuffix, setFnSuffix] = useState('');
  const [fnSaving, setFnSaving] = useState(false);
  const [fnMsg, setFnMsg] = useState('');

  const isOrgAdmin = currentUser?.role === 'org_admin' || currentUser?.role === 'platform_admin';

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [orgResult, seqResult] = await Promise.all([
        getOrganization(),
        getWorkfileSettings().catch(() => null),
      ]);
      setOrgData(orgResult.organization);
      setMembers(orgResult.members);
      setPendingInvites(orgResult.pending_invitations);
      setOrgName(orgResult.organization.name);
      setBillingEmail(orgResult.organization.billing_email || '');
      if (seqResult) {
        setFileSeq(seqResult);
        setFnPrefix(seqResult.prefix || '');
        setFnNumber(seqResult.current_number ?? 1000);
        setFnYearFormat(seqResult.year_format || 'YY');
        setFnSeparator(seqResult.separator ?? '-');
        setFnSuffix(seqResult.suffix || '');
      }
    } catch { setError('Failed to load organization data.'); }
    finally { setLoading(false); }
  };

  const handleSaveOrg = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const updated = await updateOrganization({ name: orgName, billing_email: billingEmail });
      setOrgData(updated); setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch { setSaveMsg('Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true); setInviteError('');
    try {
      const invite = await sendInvite({ email: inviteEmail, role: inviteRole });
      setPendingInvites(prev => [invite, ...prev]);
      setInviteEmail('');
    } catch (err) { setInviteError(err.response?.data?.error || 'Failed to send invite.'); }
    finally { setInviting(false); }
  };

  const handleSaveFileNumbering = async () => {
    setFnSaving(true); setFnMsg('');
    try {
      const saved = await saveWorkfileSettings({ prefix: fnPrefix, current_number: fnNumber, year_format: fnYearFormat, separator: fnSeparator, suffix: fnSuffix });
      setFileSeq(saved); setFnMsg('Saved!');
      setTimeout(() => setFnMsg(''), 2500);
    } catch { setFnMsg('Failed to save.'); }
    finally { setFnSaving(false); }
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/appraisal-tool?invite=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const canInviteAppraisers = orgData && members.filter(m => m.role === 'appraiser' || m.role === 'org_admin').length < orgData.max_appraisers;
  const canInviteAssistants = orgData && members.filter(m => m.role === 'assistant').length < orgData.max_assistants;
  const canInvite = isOrgAdmin && (canInviteAppraisers || canInviteAssistants);

  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (error) return <div style={{ padding: 32, color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Account Settings</h2>

      {/* Organization */}
      <div className="form-section">
        <div className="section-header" style={{ cursor: 'default' }}>
          <h2>Organization</h2>
          <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '3px 10px', fontSize: 13, fontWeight: 600 }}>
            {PLAN_LABELS[orgData?.plan_type] || orgData?.plan_type}
          </span>
        </div>
        <div className="section-content">
          {isOrgAdmin ? (
            <>
              <div className="form-group"><label>Organization Name</label><input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} /></div>
              <div className="form-group"><label>Billing Email</label><input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} /></div>
              <button className="btn btn-primary" onClick={handleSaveOrg} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              {saveMsg && <span style={{ marginLeft: 12, color: saveMsg === 'Saved!' ? '#22c55e' : 'red' }}>{saveMsg}</span>}
            </>
          ) : (
            <><p><strong>Name:</strong> {orgData?.name}</p><p><strong>Billing Email:</strong> {orgData?.billing_email || '—'}</p></>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="form-section">
        <div className="section-header" style={{ cursor: 'default' }}><h2>Team Members</h2></div>
        <div className="section-content">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 4px' }}>
                    {member.full_name}
                    {member.email === currentUser?.email && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>(you)</span>}
                  </td>
                  <td style={{ padding: '10px 4px' }}><RoleBadge role={member.role} /></td>
                  <td style={{ padding: '10px 4px', color: member.is_active ? '#22c55e' : '#ef4444', fontWeight: 500 }}>{member.is_active ? 'Active' : 'Inactive'}</td>
                  <td style={{ padding: '10px 4px', color: '#6b7280' }}>{member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite */}
      {isOrgAdmin && (
        <div className="form-section">
          <div className="section-header" style={{ cursor: 'default' }}><h2>Invite Team Member</h2></div>
          <div className="section-content">
            {!canInvite ? (
              <p style={{ color: '#6b7280' }}>Your plan is at capacity. Upgrade to add more team members.</p>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group"><label>Email Address</label><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@example.com" /></div>
                  <div className="form-group"><label>Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      {canInviteAppraisers && <option value="appraiser">Appraiser</option>}
                      {canInviteAssistants && <option value="assistant">Assistant</option>}
                    </select>
                  </div>
                </div>
                {inviteError && <p style={{ color: '#ef4444', marginBottom: 8 }}>{inviteError}</p>}
                <button className="btn btn-primary" onClick={handleSendInvite} disabled={inviting || !inviteEmail}>{inviting ? 'Sending…' : 'Send Invite'}</button>
              </>
            )}
            {pendingInvites.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Pending Invitations</h3>
                {pendingInvites.map(invite => (
                  <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: 6, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{invite.email}</span>
                      <span style={{ marginLeft: 8 }}><RoleBadge role={invite.role} /></span>
                      {invite.expires_at && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>Expires {new Date(invite.expires_at).toLocaleDateString()}</span>}
                    </div>
                    <button className="btn btn-small" onClick={() => copyInviteLink(invite.token)}>
                      {copiedToken === invite.token ? 'Copied!' : 'Copy Invite Link'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Numbering */}
      <div className="form-section">
        <div className="section-header" style={{ cursor: 'default' }}><h2>File Numbering</h2></div>
        <div className="section-content">
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 16 }}>Configure how your appraiser file numbers are generated for new workfiles.</p>
          <div className="fn-preview">
            Next file number: <strong>{buildFileNumberPreview({ prefix: fnPrefix, current_number: fnNumber, separator: fnSeparator, year_format: fnYearFormat, suffix: fnSuffix })}</strong>
          </div>
          <div className="fn-grid">
            <div className="form-group"><label>Starting Number</label><input type="number" min="0" value={fnNumber} onChange={e => setFnNumber(parseInt(e.target.value) || 0)} /><small style={{ color: '#6b7280', fontSize: 12 }}>Auto-increments on each new workfile</small></div>
            <div className="form-group"><label>Year Format</label>
              <select value={fnYearFormat} onChange={e => setFnYearFormat(e.target.value)}>
                <option value="YY">YY (e.g. 26)</option>
                <option value="YYYY">YYYY (e.g. 2026)</option>
              </select>
            </div>
            <div className="form-group"><label>Separator</label>
              <select value={fnSeparator} onChange={e => setFnSeparator(e.target.value)}>
                <option value="-">Hyphen ( - )</option>
                <option value="/">Slash ( / )</option>
                <option value="_">Underscore ( _ )</option>
                <option value="">None</option>
              </select>
            </div>
            <div className="form-group"><label>Suffix (initials)</label><input type="text" value={fnSuffix} onChange={e => setFnSuffix(e.target.value)} placeholder="e.g. GD" maxLength={10} /></div>
            <div className="form-group"><label>Prefix <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label><input type="text" value={fnPrefix} onChange={e => setFnPrefix(e.target.value)} placeholder="e.g. ON-" maxLength={10} /></div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveFileNumbering} disabled={fnSaving} style={{ marginTop: 8 }}>{fnSaving ? 'Saving…' : 'Save Format'}</button>
          {fnMsg && <span style={{ marginLeft: 12, color: fnMsg === 'Saved!' ? '#22c55e' : '#ef4444' }}>{fnMsg}</span>}
        </div>
      </div>

      {/* Plan */}
      <div className="form-section">
        <div className="section-header" style={{ cursor: 'default' }}><h2>Plan</h2></div>
        <div className="section-content">
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
            <div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Current Plan</div><div style={{ fontWeight: 600, fontSize: 16 }}>{PLAN_LABELS[orgData?.plan_type] || orgData?.plan_type}</div></div>
            <div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Appraisers</div><div style={{ fontWeight: 600, fontSize: 16 }}>{members.filter(m => m.role === 'appraiser' || m.role === 'org_admin').length} / {orgData?.max_appraisers}</div></div>
            <div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Assistants</div><div style={{ fontWeight: 600, fontSize: 16 }}>{members.filter(m => m.role === 'assistant').length} / {orgData?.max_assistants}</div></div>
          </div>
          {isOrgAdmin && <button className="btn btn-small" disabled style={{ opacity: 0.5 }}>Upgrade Plan (coming soon)</button>}
        </div>
      </div>
    </div>
  );
}
