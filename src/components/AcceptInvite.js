import { useState, useEffect } from 'react';
import { getInvite, acceptInvite, setAuthToken } from '../services/api';

const ROLE_LABELS = { appraiser: 'Appraiser', assistant: 'Assistant' };

export default function AcceptInvite({ token, onSuccess }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getInvite(token);
        setInvite(data);
        if (data.role === 'assistant') {
          const inviterFirst = data.invited_by_name?.split(' ')[0] || 'Appraiser';
          setFullName(`${inviterFirst}'s Assistant`);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'This invitation is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await acceptInvite(token, { full_name: fullName, password });
      setAuthToken(result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      onSuccess(result.user);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to create account. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p>Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Invitation Error</h2>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Spoke</div>
        <h2 style={styles.heading}>You're invited!</h2>
        <p style={styles.subtext}>
          Join <strong>{invite.organization_name}</strong> as a{' '}
          <strong>{ROLE_LABELS[invite.role] || invite.role}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
          Invited to: {invite.email}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Your Name</label>
            <input
              style={styles.input}
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              style={styles.input}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
            />
          </div>
          {submitError && <p style={{ color: '#ef4444', marginBottom: 12 }}>{submitError}</p>}
          <button
            type="submit"
            style={styles.button}
            disabled={submitting}
          >
            {submitting ? 'Creating Account…' : 'Create Account & Join'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
    color: '#1e293b',
  },
  subtext: {
    marginBottom: 4,
    color: '#374151',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#1e293b',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
};
