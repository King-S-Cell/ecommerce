import { useEffect, useState } from 'react';

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminDashboard({ token, onInventoryChanged }) {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const emptyProduct = {
    name: '',
    category: '',
    price: 0,
    rating: 4.5,
    badge: '',
    stock: 0,
    accentA: '#dddddd',
    accentB: '#333333',
    description: '',
    features: '',
    imageUrl: ''
  };

  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [editProduct, setEditProduct] = useState(null);

  useEffect(() => {
    fetchForTab(tab);
  }, [tab]);

  async function fetchForTab(current) {
    setLoading(true);
    setMessage('');

    try {
      if (current === 'products') {
        const res = await fetch('/api/admin/products', { headers: authHeaders(token) });
        const data = await res.json();
        setProducts(data || []);
      } else if (current === 'orders') {
        const res = await fetch('/api/admin/orders', { headers: authHeaders(token) });
        const data = await res.json();
        setOrders(data || []);
      } else if (current === 'users') {
        const res = await fetch('/api/admin/users', { headers: authHeaders(token) });
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function formToPayload(product) {
    return {
      name: String(product.name || '').trim(),
      category: String(product.category || '').trim(),
      price: Number(product.price || 0),
      rating: Number(product.rating || 0),
      badge: String(product.badge || '').trim(),
      stock: Number(product.stock || 0),
      accentA: String(product.accentA || '').trim(),
      accentB: String(product.accentB || '').trim(),
      description: String(product.description || '').trim(),
      features: String(product.features || '').split(',').map((f) => f.trim()).filter(Boolean),
      imageUrl: String(product.imageUrl || '').trim()
    };
  }

  async function createProduct(event) {
    event.preventDefault();
    setMessage('');

    try {
      const payload = formToPayload(newProduct);
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to create product');

      setProducts((p) => [data, ...p]);
      setNewProduct(emptyProduct);
      setMessage('Product created');
      onInventoryChanged && onInventoryChanged();
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  function startEdit(p) {
    setEditProduct({
      id: p.id,
      name: p.name || '',
      category: p.category || '',
      price: p.price || 0,
      rating: p.rating || 4.5,
      badge: p.badge || '',
      stock: p.stock || 0,
      accentA: p.accentA || '#dddddd',
      accentB: p.accentB || '#333333',
      description: p.description || '',
      features: Array.isArray(p.features) ? p.features.join(', ') : (p.features || ''),
      imageUrl: p.imageUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitEdit(event) {
    event.preventDefault();
    setMessage('');

    try {
      const payload = formToPayload(editProduct);
      const res = await fetch(`/api/admin/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to update product');

      setProducts((list) => list.map((x) => (x.id === data.id ? data : x)));
      setEditProduct(null);
      setMessage('Product updated');
      onInventoryChanged && onInventoryChanged();
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });

      if (!res.ok) throw new Error('Delete failed');

      setProducts((p) => p.filter((x) => x.id !== id));
      setMessage('Product deleted');
      onInventoryChanged && onInventoryChanged();
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  async function updateOrderStatus(id, status) {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      setMessage('Order updated');
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  async function updateUserRole(id, role) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ role })
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      setMessage('User updated');
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  return (
    <section className="admin-panel">
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Admin dashboard</span>
          <h2>Product, order, and user management</h2>
        </div>
        <div className="auth-tabs">
          <button type="button" className={tab === 'products' ? 'chip active' : 'chip'} onClick={() => setTab('products')}>
            Products
          </button>
          <button type="button" className={tab === 'orders' ? 'chip active' : 'chip'} onClick={() => setTab('orders')}>
            Orders
          </button>
          <button type="button" className={tab === 'users' ? 'chip active' : 'chip'} onClick={() => setTab('users')}>
            Users
          </button>
        </div>
      </div>

      {message ? <div className="notice">{message}</div> : null}

      {tab === 'products' ? (
        <div>
          {editProduct ? (
            <form onSubmit={submitEdit} style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <strong>Edit product</strong>
              <input placeholder="Name" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} required />
              <input placeholder="Category" value={editProduct.category} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })} required />
              <input placeholder="Price" type="number" value={editProduct.price} onChange={(e) => setEditProduct({ ...editProduct, price: Number(e.target.value) })} />
              <input placeholder="Rating (0-5)" type="number" step="0.1" min="0" max="5" value={editProduct.rating} onChange={(e) => setEditProduct({ ...editProduct, rating: Number(e.target.value) })} />
              <input placeholder="Badge" value={editProduct.badge} onChange={(e) => setEditProduct({ ...editProduct, badge: e.target.value })} />
              <input placeholder="Stock" type="number" value={editProduct.stock} onChange={(e) => setEditProduct({ ...editProduct, stock: Number(e.target.value) })} />
              <input placeholder="Accent A (hex)" value={editProduct.accentA} onChange={(e) => setEditProduct({ ...editProduct, accentA: e.target.value })} />
              <input placeholder="Accent B (hex)" value={editProduct.accentB} onChange={(e) => setEditProduct({ ...editProduct, accentB: e.target.value })} />
              <input placeholder="Description" value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
              <input placeholder="Features (comma separated)" value={editProduct.features} onChange={(e) => setEditProduct({ ...editProduct, features: e.target.value })} />
              <input placeholder="Image URL" value={editProduct.imageUrl} onChange={(e) => setEditProduct({ ...editProduct, imageUrl: e.target.value })} />
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${editProduct.accentA || '#ddd'}, ${editProduct.accentB || '#333'})`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} />
                <div style={{ color: '#b9c2e2', fontSize: '0.9rem' }}>
                  <div>{editProduct.accentA || '#dddddd'} / {editProduct.accentB || '#333333'}</div>
                  <div>Preview colors</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="primary" type="submit">Save changes</button>
                <button type="button" className="secondary" onClick={() => setEditProduct(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <form onSubmit={createProduct} style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <strong>Create new product</strong>
              <input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
              <input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} required />
              <input placeholder="Price" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
              <input placeholder="Rating (0-5)" type="number" step="0.1" min="0" max="5" value={newProduct.rating} onChange={(e) => setNewProduct({ ...newProduct, rating: Number(e.target.value) })} />
              <input placeholder="Badge" value={newProduct.badge} onChange={(e) => setNewProduct({ ...newProduct, badge: e.target.value })} />
              <input placeholder="Stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })} />
              <input placeholder="Accent A (hex)" value={newProduct.accentA} onChange={(e) => setNewProduct({ ...newProduct, accentA: e.target.value })} />
              <input placeholder="Accent B (hex)" value={newProduct.accentB} onChange={(e) => setNewProduct({ ...newProduct, accentB: e.target.value })} />
              <input placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              <input placeholder="Features (comma separated)" value={newProduct.features} onChange={(e) => setNewProduct({ ...newProduct, features: e.target.value })} />
              <input placeholder="Image URL" value={newProduct.imageUrl} onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${newProduct.accentA || '#ddd'}, ${newProduct.accentB || '#333'})`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} />
                <div style={{ color: '#b9c2e2', fontSize: '0.9rem' }}>
                  <div>{newProduct.accentA || '#dddddd'} / {newProduct.accentB || '#333333'}</div>
                  <div>Preview colors</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="primary" type="submit">Create</button>
                <button type="button" className="secondary" onClick={() => setNewProduct(emptyProduct)}>Reset</button>
              </div>
            </form>
          )}

          <div className="grid">
            {products.map((p) => (
              <article key={p.id} className="product-card" style={{ '--accent-a': p.accentA || '#ddd', '--accent-b': p.accentB || '#333' }}>
                <div className="product-copy">
                  <div style={{ marginBottom: '0.75rem', borderRadius: 16, overflow: 'hidden', minHeight: 130, background: `linear-gradient(135deg, ${p.accentA || '#ddd'}, ${p.accentB || '#333'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'white', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{p.badge || 'Preview'}</span>
                    )}
                  </div>
                  <div className="product-meta">
                    <span>{p.category}</span>
                    <span>{p.rating} stars</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description || ''}</p>
                  <div className="product-footer">
                    <strong>${p.price}</strong>
                    <span>{p.stock} left</span>
                  </div>
                  <div className="card-actions">
                    <button className="secondary small" type="button" onClick={() => navigator.clipboard.writeText(p.id)}>Copy ID</button>
                    <button className="secondary small" type="button" onClick={() => startEdit(p)}>Edit</button>
                    <button className="secondary small" type="button" onClick={() => deleteProduct(p.id)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'orders' ? (
        <div>
          {orders.length === 0 ? <div className="empty-state">No orders yet</div> : null}
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            {orders.map((o) => (
              <div key={o.id} className="metric-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{o.orderId}</strong>
                  <span>{o.status}</span>
                </div>
                <div style={{ color: '#9aa3c8' }}>{o.customer?.email}</div>
                <div>
                  <div>Items: {o.items?.length || 0}</div>
                  <div>Subtotal: ${o.subtotal}</div>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary small" onClick={() => updateOrderStatus(o.id, 'processing')}>Processing</button>
                  <button className="secondary small" onClick={() => updateOrderStatus(o.id, 'shipped')}>Shipped</button>
                  <button className="secondary small" onClick={() => updateOrderStatus(o.id, 'delivered')}>Delivered</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'users' ? (
        <div>
          {users.length === 0 ? <div className="empty-state">No users yet</div> : null}
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            {users.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <strong>{u.name}</strong>
                  <div style={{ color: '#9aa3c8' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
