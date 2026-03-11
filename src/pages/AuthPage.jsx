import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn, UserPlus, Sparkles } from 'lucide-react';
import api from '../utils/api';
import { saveAuthSession } from '../utils/auth';
import {
  convertAccessStateToRecords,
  getCurrentActorAccessState,
  hydrateBookAccessForUser,
  syncBookAccessRecords,
} from '../utils/readingAccess';
import './AuthPage.css';

const initialSignupState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const initialLoginState = {
  email: '',
  password: '',
};

export default function AuthPage({ onAuthSuccess, currentUser }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [signupForm, setSignupForm] = useState(initialSignupState);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isGuest = currentUser?.isAnonymous;
  const introCopy = useMemo(() => {
    if (isGuest) {
      return 'Save your identity, keep your reading history, and sign in from any device.';
    }
    return 'Create an account or sign in to keep your reading identity with you.';
  }, [isGuest]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const previousAccessState = getCurrentActorAccessState();
      const { data } = await api.post('/users/login', loginForm);
      const user = saveAuthSession(data);
      hydrateBookAccessForUser(user);
      const migratedUser = await syncBookAccessRecords(convertAccessStateToRecords(previousAccessState)).catch(() => user);
      onAuthSuccess(migratedUser || user);
      navigate('/books');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const previousAccessState = getCurrentActorAccessState();
      const payload = {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
      };
      const { data } = await api.post('/users/signup', payload);
      const user = saveAuthSession(data);
      hydrateBookAccessForUser(user);
      const migratedUser = await syncBookAccessRecords(convertAccessStateToRecords(previousAccessState)).catch(() => user);
      onAuthSuccess(migratedUser || user);
      navigate('/books');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-shell">
        <section className="auth-copy glass-panel">
          <div className="auth-badge">
            <Sparkles size={16} />
            <span>Reader Access</span>
          </div>
          <h1 className="font-serif auth-title">Keep your reading world with you.</h1>
          <p className="auth-subtitle">{introCopy}</p>
          <div className="auth-points">
            <div className="auth-point">
              <span className="auth-point-dot" />
              <span>Save your profile beyond a guest session</span>
            </div>
            <div className="auth-point">
              <span className="auth-point-dot" />
              <span>Reuse the same identity for discussion and matching</span>
            </div>
            <div className="auth-point">
              <span className="auth-point-dot" />
              <span>Sign back in instead of starting over</span>
            </div>
          </div>
        </section>

        <section className="auth-card glass-panel">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              <LogIn size={18} /> Login
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              <UserPlus size={18} /> Sign up
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-label">
                <span>Email</span>
                <input name="email" type="email" value={loginForm.email} onChange={handleLoginChange} className="auth-input" required />
              </label>
              <label className="auth-label">
                <span>Password</span>
                <input name="password" type="password" value={loginForm.password} onChange={handleLoginChange} className="auth-input" required />
              </label>
              <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Login'} <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <label className="auth-label">
                <span>Name</span>
                <input name="name" type="text" value={signupForm.name} onChange={handleSignupChange} className="auth-input" required />
              </label>
              <label className="auth-label">
                <span>Email</span>
                <input name="email" type="email" value={signupForm.email} onChange={handleSignupChange} className="auth-input" required />
              </label>
              <label className="auth-label">
                <span>Password</span>
                <input name="password" type="password" value={signupForm.password} onChange={handleSignupChange} className="auth-input" minLength={6} required />
              </label>
              <label className="auth-label">
                <span>Confirm password</span>
                <input name="confirmPassword" type="password" value={signupForm.confirmPassword} onChange={handleSignupChange} className="auth-input" minLength={6} required />
              </label>
              <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'} <ArrowRight size={18} />
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
