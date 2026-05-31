import { useState, useEffect } from 'react';
import { getInvite, acceptInvite, setAuthToken } from '../services/api';
import logoWhite from '../assets/logo-white.svg';

export default function AcceptInvite({ token, onSuccess }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getInvite(token)
      .then(data => { setInvite(data); setLoading(false); })
      .catch(() => { setError('This invite link is invalid or has expired.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await acceptInvite(token, { fullName, password });
      setAuthToken(res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invite. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#13294B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
        <img src={logoWhite} alt="Spoke" style={{ height: 32, marginBottom: 28, filter: 'invert(1) sepia(1) saturate(2) hue-rotate(180deg)', display: 'block' }} />

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading invite…</p>
        ) : error && !invite ? (
          <div>
            <p style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Contact your organization admin for a new invite link.</p>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#13294B', marginBottom: 6, fontSize: 22 }}>You're invited!</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>
              You've been invited to join <strong>{invite?.organization_name || 'Spoke'}</strong> as a{' '}
              <strong>{invite?.role || 'team member'}</strong>. Create your account below.
            </p>

            {error && <p style={{ color: '#e74c3c', fontSize: 14, marginBottom: 16 }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#13294B', marginBottom: 5 }}>Email</label>
                <input type="email" value={invite?.email || ''} disabled style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #dee2e6', borderRadius: 6, fontSize: 14, background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#13294B', marginBottom: 5 }}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #dee2e6', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#13294B', marginBottom: 5 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #dee2e6', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={submitting} style={{ marginTop: 8, padding: '12px', background: '#D6A319', color: '#13294B', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Creating account…' : 'Accept Invite'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
