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

export default function OrdersPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) {
      navigate('/auth');
      return;
    }

    let ignore = false;

    async function loadOrders() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/orders', {
          headers: authHeaders(session.token)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load orders');
        }

        if (!ignore) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (caughtError) {
        if (!ignore) {
          setError(caughtError.message || 'Unable to load orders');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOrders();

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

  const summary = useMemo(() => ({
    count: orders.length,
    total: orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  }), [orders]);

  return (
    <div className="orders-page-shell">
      <div className="orders-page-card">
        <div className="orders-page-copy">
          <span className="eyebrow">Your orders</span>
          <h1>Track every purchase</h1>
          <p>Visit this page anytime to review your recent orders, totals, and current status.</p>
          <Link className="secondary" to="/" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
            Back to store
          </Link>
        </div>

        <div className="orders-page-list">
          <div className="session-meta">
            <span className="section-kicker">Signed in</span>
            <strong>{session?.user?.name || 'Your account'}</strong>
            <span>{session?.user?.email || ''}</span>
          </div>

          <div className="role-badge">{summary.count} order{summary.count === 1 ? '' : 's'}</div>
          <div className="empty-state">Lifetime spend: ${summary.total.toFixed(0)}</div>

          {loading ? <div className="empty-state">Loading your orders...</div> : null}
          {error ? <div className="notice">{error}</div> : null}

          {!loading && !error && orders.length === 0 ? (
            <div className="empty-state">You have not placed any orders yet.</div>
          ) : null}

          {orders.map((order) => (
            <div className="order-card-item" key={order.id || order.orderId}>
              <div className="order-card-meta">
                <strong>{order.orderId}</strong>
                <span>{new Date(order.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div className="order-card-meta">
                <span>Status: {order.status}</span>
                <span>Total: ${Number(order.total || 0).toFixed(0)}</span>
              </div>
              <div className="order-card-meta">
                <span>{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</span>
                <span>Estimated delivery: {order.estimatedDelivery || '3-5 business days'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
