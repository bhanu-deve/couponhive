import React, { useState, useEffect } from 'react';
import { API } from '../api/api';

// ── Steps: login | signup | forgot | otp | reset ─────────
export default function AuthModal({ mode, onClose, onAuth }) {
  const [view,       setView]       = useState(mode);
  const [form,       setForm]       = useState({
    username: '', email: '', password: '', confirm: '',
    otp: '', newPw: '', newPwConfirm: '',
  });
  const [resetToken, setResetToken] = useState('');
  const [error,      setError]      = useState('');
  const [info,       setInfo]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [countdown,  setCountdown]  = useState(0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const go  = (v)    => { setView(v); setError(''); setInfo(''); };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submit = async () => {
    setError(''); setInfo(''); setLoading(true);
    try {
      if (view === 'login') {
        if (!form.email || !form.password) { setError('Email and password are required'); return; }
        const user = await API.login(form.email.trim(), form.password);
        onAuth(user);

      } else if (view === 'signup') {
        if (!form.username || !form.email || !form.password || !form.confirm) { setError('All fields are required'); return; }
        if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        const user = await API.signup(form.username.trim(), form.email.trim(), form.password);
        onAuth(user);

      } else if (view === 'forgot') {
        if (!form.email) { setError('Email is required'); return; }
        await API.forgotPassword(form.email.trim());
        setCountdown(60);
        go('otp');

      } else if (view === 'otp') {
        const clean = form.otp.replace(/\s/g, '');
        if (clean.length !== 6) { setError('Please enter the full 6-digit OTP'); return; }
        const res = await API.verifyOTP(form.email.trim(), clean);
        setResetToken(res.resetToken);
        go('reset');

      } else if (view === 'reset') {
        if (!form.newPw || !form.newPwConfirm) { setError('Both password fields are required'); return; }
        if (form.newPw !== form.newPwConfirm)  { setError('Passwords do not match'); return; }
        if (form.newPw.length < 6)             { setError('Password must be at least 6 characters'); return; }
        const user = await API.resetPassword(resetToken, form.newPw);
        onAuth(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    setError(''); setLoading(true);
    try {
      await API.forgotPassword(form.email.trim());
      setCountdown(60);
      set('otp', '');
      setInfo('New OTP sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login:  '👋 Welcome Back',
    signup: '🎉 Create Account',
    forgot: '🔑 Forgot Password',
    otp:    '📧 Enter OTP',
    reset:  '🔒 Set New Password',
  };

  const btnLabel = {
    login:  loading ? '⏳ Logging in...'      : 'Login',
    signup: loading ? '⏳ Creating account...' : 'Create Account',
    forgot: loading ? '⏳ Sending OTP...'      : 'Send OTP',
    otp:    loading ? '⏳ Verifying...'        : 'Verify OTP',
    reset:  loading ? '⏳ Resetting...'        : 'Reset Password',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{titles[view]}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* LOGIN / SIGNUP TABS */}
          {(view === 'login' || view === 'signup') && (
            <div className="auth-tabs">
              <button className={`auth-tab ${view === 'login'  ? 'active' : ''}`} onClick={() => go('login')}>Login</button>
              <button className={`auth-tab ${view === 'signup' ? 'active' : ''}`} onClick={() => go('signup')}>Sign Up</button>
            </div>
          )}

          {/* USERNAME — signup only */}
          {view === 'signup' && (
            <div className="form-group">
              <label className="form-label">Username <span className="form-label-hint">3–20 chars, a-z/0-9/_</span></label>
              <input className="form-input" placeholder="coolsaver99" maxLength={20}
                value={form.username} onChange={e => set('username', e.target.value)} />
            </div>
          )}

          {/* EMAIL — login / signup / forgot */}
          {(view === 'login' || view === 'signup' || view === 'forgot') && (
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="your@email.com" maxLength={100}
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          )}

          {/* PASSWORD — login / signup */}
          {(view === 'login' || view === 'signup') && (
            <div className="form-group">
              <label className="form-label">
                Password {view === 'signup' && <span className="form-label-hint">min 6 chars</span>}
              </label>
              <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                value={form.password} onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && view === 'login' && submit()} />
            </div>
          )}

          {/* CONFIRM PASSWORD — signup */}
          {view === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                value={form.confirm} onChange={e => set('confirm', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          )}

          {/* OTP STEP */}
          {view === 'otp' && (
            <div className="form-group">
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                OTP sent to <strong style={{ color: 'var(--text)' }}>{form.email}</strong>
              </div>

              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                Enter the 6-digit code from your email
              </label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={form.otp}
                onChange={e => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{
                  textAlign: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  letterSpacing: '0.5em',
                  fontFamily: "'Courier New', monospace",
                  padding: '16px',
                  color: 'var(--accent)',
                }}
                autoFocus
              />

              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: i < form.otp.length ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>

              {/* Resend */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {countdown > 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Resend in <strong style={{ color: 'var(--accent)' }}>{countdown}s</strong>
                  </span>
                ) : (
                  <button onClick={resendOTP} disabled={loading}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* RESET — new password */}
          {view === 'reset' && (
            <>
              <div className="form-group">
                <label className="form-label">New Password <span className="form-label-hint">min 6 chars</span></label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                  value={form.newPw} onChange={e => set('newPw', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                  value={form.newPwConfirm} onChange={e => set('newPwConfirm', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>
            </>
          )}

          {/* ERROR */}
          {error && <div className="form-error" style={{ marginBottom: 14 }}>⚠️ {error}</div>}

          {/* INFO */}
          {info && (
            <div style={{
              color: 'var(--green)', fontSize: '0.85rem', marginBottom: 14,
              padding: '10px 14px', background: 'rgba(34,197,94,0.08)',
              borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)',
            }}>
              ✅ {info}
            </div>
          )}

          {/* SUBMIT */}
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {btnLabel[view]}
          </button>

          {/* FOOTER LINKS */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.85rem' }}>
            {view === 'login' && (
              <button onClick={() => go('forgot')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                Forgot password?
              </button>
            )}
            {(view === 'forgot' || view === 'otp' || view === 'reset') && (
              <button onClick={() => go('login')}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                ← Back to login
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}