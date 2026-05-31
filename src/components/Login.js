import { useState } from 'react';
import { login, signup, setAuthToken } from '../services/api';
import logoWhite from '../assets/logo-white.svg';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (isSignup) {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        response = await signup(email, password, fullName);
      } else {
        response = await login(email, password);
      }
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setIsSignup(s => !s); setError(''); };

  return (
    <div className="login-page">

      {/* ── Left panel: brand ── */}
      <div className="login-left">
        <div className="login-left-inner">
          <img src={logoWhite} alt="Spoke" className="login-logo" />
          <p className="login-tagline">
            Modern appraisal software,<br />built by an appraiser.
          </p>
          <ul className="login-features">
            <li>Cloud-based &amp; mobile-first</li>
            <li>Built for Canadian appraisers</li>
            <li>Your data, always portable</li>
          </ul>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <h1>{isSignup ? 'Create account' : 'Welcome back'}</h1>
            <p>{isSignup ? 'Start your free trial today.' : 'Sign in to your workspace.'}</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {isSignup && (
              <div className="login-field">
                <label htmlFor="login-name">Full Name</label>
                <input
                  id="login-name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required={isSignup}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength="8"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Please wait…' : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p className="login-toggle">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="login-toggle-btn" onClick={switchMode}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>

    </div>
  );
}

export default Login;
