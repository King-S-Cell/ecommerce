import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_SESSION_KEY = 'nimbus-session';

function loadSession() {
  try {
    const saved = window.localStorage.getItem(STORAGE_SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);
  const [authTab, setAuthTab] = useState('customer');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) {
      setSessionLoading(false);
      return;
    }

    let ignore = false;

    async function validateSession() {
      try {
        const response = await fetch('/api/auth/me', {
          headers: authHeaders(session.token)
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json();

        if (!ignore) {
          setSession({ token: session.token, user: data.user });
          navigate('/');
        }
      } catch {
        if (!ignore) {
          setSession(null);
          setAuthMessage('Session expired. Sign in again.');
        }
      } finally {
        if (!ignore) {
          setSessionLoading(false);
        }
      }
    }

    validateSession();

    return () => {
      ignore = true;
    };
  }, [navigate, session?.token]);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, [session]);

  async function handleAuthSubmit(event) {
    event.preventDefault();

    const mode = authTab === 'admin' ? 'login' : authMode;
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

    if (authTab === 'admin' && mode !== 'login') {
      return;
    }

    if (authTab === 'customer' && mode === 'register' && authForm.name.trim().length < 2) {
      setAuthMessage('Enter a name to register.');
      return;
    }

    setAuthSubmitting(true);
    setAuthMessage('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(mode === 'register' ? { name: authForm.name } : {}),
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setSession({ token: data.token, user: data.user });
      setAuthForm((current) => ({ ...current, password: '' }));
      navigate('/');
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  }

  const heroMessage = useMemo(() => {
    if (authTab === 'admin') {
      return 'Secure admin access';
    }

    return authMode === 'register' ? 'Create your account' : 'Welcome back';
  }, [authMode, authTab]);

  return (
    <div className="auth-page-shell">
      <div className="auth-page-card">
        <div className="auth-page-copy">
          <span className="eyebrow">Access control</span>
          <h1>{heroMessage}</h1>
          <p>
            Customers sign in here to browse, checkout, and manage their profile. Admins can use the seeded account to reach the protected dashboard.
          </p>
          <div className="auth-help">
            <span>Admin demo: admin@nimbus.local</span>
            <span>Password: Admin123!</span>
          </div>
        </div>

        <form className="auth-form auth-page-form" onSubmit={handleAuthSubmit}>
          <div className="auth-tabs">
            <button type="button" className={authTab === 'customer' ? 'chip active' : 'chip'} onClick={() => { setAuthTab('customer'); setAuthMessage(''); }}>
              Customer
            </button>
            <button type="button" className={authTab === 'admin' ? 'chip active' : 'chip'} onClick={() => { setAuthTab('admin'); setAuthMode('login'); setAuthMessage(''); }}>
              Admin
            </button>
          </div>

          <div className="auth-mode">
            {authTab === 'customer' ? (
              <>
                <button type="button" className={authMode === 'login' ? 'chip active' : 'chip'} onClick={() => setAuthMode('login')}>
                  Sign in
                </button>
                <button type="button" className={authMode === 'register' ? 'chip active' : 'chip'} onClick={() => setAuthMode('register')}>
                  Register
                </button>
              </>
            ) : (
              <span className="auth-note">Admin login only</span>
            )}
          </div>

          {authTab === 'customer' && authMode === 'register' ? (
            <label>
              Full name
              <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} autoComplete="name" required />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} autoComplete="email" required />
          </label>

          <label>
            Password
            <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength="8" required />
          </label>

          <button className="primary full" type="submit" disabled={authSubmitting}>
            {authSubmitting ? 'Working...' : authTab === 'admin' ? 'Admin sign in' : authMode === 'register' ? 'Create account' : 'Sign in'}
          </button>

          {authMessage ? <div className="notice">{authMessage}</div> : null}
          {sessionLoading ? <div className="empty-state">Checking session...</div> : null}
        </form>
      </div>
    </div>
  );
}
