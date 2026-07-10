import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

const STORAGE_SESSION_KEY = 'nimbus-session';

function loadSession() {
  try {
    const saved = window.localStorage.getItem(STORAGE_SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function AdminPage({ initialTab = 'products' }) {
  const navigate = useNavigate();
  const [session] = useState(loadSession);

  useEffect(() => {
    if (!session?.token) {
      navigate('/auth');
      return;
    }

    if (session.user?.role !== 'admin') {
      navigate('/');
    }
  }, [navigate, session?.token, session?.user?.role]);

  if (!session?.token || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-page-shell">
      <div className="admin-page-card">
        <div className="admin-page-copy">
          <span className="eyebrow">Admin workspace</span>
          <h1>Manage storefront operations</h1>
          <p>Use these dedicated pages to create products, review orders, and manage users without leaving the admin area.</p>
          <div className="admin-page-nav">
            <Link className={initialTab === 'products' ? 'chip active' : 'chip'} to="/admin/products">
              Products
            </Link>
            <Link className={initialTab === 'orders' ? 'chip active' : 'chip'} to="/admin/orders">
              Orders
            </Link>
            <Link className={initialTab === 'users' ? 'chip active' : 'chip'} to="/admin/users">
              Users
            </Link>
          </div>
          <Link className="secondary" to="/" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none', marginTop: '1rem' }}>
            Back to store
          </Link>
        </div>

        <div className="admin-page-panel">
          <AdminDashboard token={session.token} initialTab={initialTab} />
        </div>
      </div>
    </div>
  );
}
