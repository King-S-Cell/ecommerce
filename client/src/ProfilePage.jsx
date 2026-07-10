import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

export default function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.token) {
      navigate('/auth');
      return;
    }

    setProfileForm({
      name: session.user?.name || '',
      email: session.user?.email || '',
      password: ''
    });
  }, [navigate, session?.token, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, [session]);

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!session?.token) {
      return;
    }

    const trimmedName = profileForm.name.trim();
    const trimmedEmail = profileForm.email.trim().toLowerCase();
    const password = profileForm.password;
    const payload = {
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      ...(password ? { password } : {})
    };

    if (!Object.keys(payload).length) {
      setProfileMessage('Add a name, email, or new password to update your account.');
      return;
    }

    setProfileSubmitting(true);
    setProfileMessage('');

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session.token) },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      setSession((current) => (current ? { ...current, user: data.user } : current));
      setProfileForm((current) => ({ ...current, password: '' }));
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileMessage(error.message || 'Profile update failed');
    } finally {
      setProfileSubmitting(false);
    }
  }

  function logout() {
    setSession(null);
    navigate('/auth');
  }

  const roleLabel = useMemo(() => session?.user?.role === 'admin' ? 'Admin account' : 'Customer account', [session?.user?.role]);

  return (
    <div className="profile-page-shell">
      <div className="profile-page-card">
        <div className="profile-page-copy">
          <span className="eyebrow">Account settings</span>
          <h1>Update your profile</h1>
          <p>Change your name, email, or password here. You can also sign out from the same place.</p>
          <Link className="secondary" to="/" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
            Back to store
          </Link>
        </div>

        <div className="profile-page-form-card">
          <div className="session-meta">
            <span className="section-kicker">Signed in as</span>
            <strong>{session?.user?.name || 'Your account'}</strong>
            <span>{session?.user?.email || ''}</span>
          </div>
          <div className="role-badge">{roleLabel}</div>

          <form className="auth-form" onSubmit={handleProfileSubmit}>
            <label>
              Full name
              <input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
            </label>
            <label>
              New password
              <input type="password" value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} autoComplete="new-password" />
            </label>
            <button className="primary full" type="submit" disabled={profileSubmitting}>
              {profileSubmitting ? 'Saving...' : 'Save profile'}
            </button>
            {profileMessage ? <div className="notice">{profileMessage}</div> : null}
          </form>

          <button type="button" className="secondary full" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
