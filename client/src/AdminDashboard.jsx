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
      features: String(product.features || '').split(',').map((feature) => feature.trim()).filter(Boolean),
      imageUrl: String(product.imageUrl || '').trim()
    };
  }

  function handleImageSelection(event, setter) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setter((current) => ({ ...current, imageUrl: dataUrl }));
    };

    reader.readAsDataURL(file);
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

      setProducts((list) => [data, ...list]);
      setNewProduct({ ...emptyProduct });
      setMessage('Product created');
      onInventoryChanged && onInventoryChanged();
    } catch (err) {
      setMessage(err.message || 'Failed');
    }
  }

  function startEdit(product) {
    setEditProduct({
      id: product.id,
      name: product.name || '',
      category: product.category || '',
      price: product.price || 0,
      rating: product.rating || 4.5,
      badge: product.badge || '',
      stock: product.stock || 0,
      accentA: product.accentA || '#dddddd',
      accentB: product.accentB || '#333333',
      description: product.description || '',
      features: Array.isArray(product.features) ? product.features.join(', ') : (product.features || ''),
      imageUrl: product.imageUrl || ''
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

      setProducts((list) => list.map((item) => (item.id === data.id ? data : item)));
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

      setProducts((list) => list.filter((item) => item.id !== id));
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
      setOrders((list) => list.map((item) => (item.id === updated.id ? updated : item)));
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
      setUsers((list) => list.map((item) => (item.id === updated.id ? updated : item)));
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
              <input placeholder="Name" value={editProduct.name} onChange={(event) => setEditProduct({ ...editProduct, name: event.target.value })} required />
              <input placeholder="Category" value={editProduct.category} onChange={(event) => setEditProduct({ ...editProduct, category: event.target.value })} required />
              <input placeholder="Price" type="number" value={editProduct.price} onChange={(event) => setEditProduct({ ...editProduct, price: Number(event.target.value) })} />
              <input placeholder="Rating (0-5)" type="number" step="0.1" min="0" max="5" value={editProduct.rating} onChange={(event) => setEditProduct({ ...editProduct, rating: Number(event.target.value) })} />
              <input placeholder="Badge" value={editProduct.badge} onChange={(event) => setEditProduct({ ...editProduct, badge: event.target.value })} />
              <input placeholder="Stock" type="number" value={editProduct.stock} onChange={(event) => setEditProduct({ ...editProduct, stock: Number(event.target.value) })} />
              <input placeholder="Accent A (hex)" value={editProduct.accentA} onChange={(event) => setEditProduct({ ...editProduct, accentA: event.target.value })} />
              <input placeholder="Accent B (hex)" value={editProduct.accentB} onChange={(event) => setEditProduct({ ...editProduct, accentB: event.target.value })} />
              <input placeholder="Description" value={editProduct.description} onChange={(event) => setEditProduct({ ...editProduct, description: event.target.value })} />
              <input placeholder="Features (comma separated)" value={editProduct.features} onChange={(event) => setEditProduct({ ...editProduct, features: event.target.value })} />
              <label style={{ display: 'grid', gap: '0.35rem', color: '#b9c2e2', fontSize: '0.9rem' }}>
                <span>Choose image from device</span>
                <input type="file" accept="image/*" onChange={(event) => handleImageSelection(event, setEditProduct)} />
              </label>
              {editProduct.imageUrl ? (
                <img src={editProduct.imageUrl} alt="Selected preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14 }} />
              ) : null}
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
              <input placeholder="Name" value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} required />
              <input placeholder="Category" value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })} required />
              <input placeholder="Price" type="number" value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: Number(event.target.value) })} />
              <input placeholder="Rating (0-5)" type="number" step="0.1" min="0" max="5" value={newProduct.rating} onChange={(event) => setNewProduct({ ...newProduct, rating: Number(event.target.value) })} />
              <input placeholder="Badge" value={newProduct.badge} onChange={(event) => setNewProduct({ ...newProduct, badge: event.target.value })} />
              <input placeholder="Stock" type="number" value={newProduct.stock} onChange={(event) => setNewProduct({ ...newProduct, stock: Number(event.target.value) })} />
              <input placeholder="Accent A (hex)" value={newProduct.accentA} onChange={(event) => setNewProduct({ ...newProduct, accentA: event.target.value })} />
              <input placeholder="Accent B (hex)" value={newProduct.accentB} onChange={(event) => setNewProduct({ ...newProduct, accentB: event.target.value })} />
              <input placeholder="Description" value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} />
              <input placeholder="Features (comma separated)" value={newProduct.features} onChange={(event) => setNewProduct({ ...newProduct, features: event.target.value })} />
              <label style={{ display: 'grid', gap: '0.35rem', color: '#b9c2e2', fontSize: '0.9rem' }}>
                <span>Choose image from device</span>
                <input type="file" accept="image/*" onChange={(event) => handleImageSelection(event, setNewProduct)} />
              </label>
              {newProduct.imageUrl ? (
                <img src={newProduct.imageUrl} alt="Selected preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14 }} />
              ) : null}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${newProduct.accentA || '#ddd'}, ${newProduct.accentB || '#333'})`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} />
                <div style={{ color: '#b9c2e2', fontSize: '0.9rem' }}>
                  <div>{newProduct.accentA || '#dddddd'} / {newProduct.accentB || '#333333'}</div>
                  <div>Preview colors</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="primary" type="submit">Create</button>
                <button type="button" className="secondary" onClick={() => setNewProduct({ ...emptyProduct })}>Reset</button>
              </div>
            </form>
          )}

          <div className="grid">
            {products.map((product) => (
              <article key={product.id} className="product-card" style={{ '--accent-a': product.accentA || '#ddd', '--accent-b': product.accentB || '#333' }}>
                <div className="product-copy">
                  <div style={{ marginBottom: '0.75rem', borderRadius: 16, overflow: 'hidden', minHeight: 130, background: `linear-gradient(135deg, ${product.accentA || '#ddd'}, ${product.accentB || '#333'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'white', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{product.badge || 'Preview'}</span>
                    )}
                  </div>
                  <div className="product-meta">
                    <span>{product.category}</span>
                    <span>{product.rating} stars</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description || ''}</p>
                  <div className="product-footer">
                    <strong>${product.price}</strong>
                    <span>{product.stock} left</span>
                  </div>
                  <div className="card-actions">
                    <button className="secondary small" type="button" onClick={() => navigator.clipboard.writeText(product.id)}>Copy ID</button>
                    <button className="secondary small" type="button" onClick={() => startEdit(product)}>Edit</button>
                    <button className="secondary small" type="button" onClick={() => deleteProduct(product.id)}>Delete</button>
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
            {orders.map((order) => (
              <div key={order.id} className="metric-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{order.orderId}</strong>
                  <span>{order.status}</span>
                </div>
                <div style={{ color: '#9aa3c8' }}>{order.customer?.email}</div>
                <div>
                  <div>Items: {order.items?.length || 0}</div>
                  <div>Subtotal: ${order.subtotal}</div>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary small" onClick={() => updateOrderStatus(order.id, 'processing')}>Processing</button>
                  <button className="secondary small" onClick={() => updateOrderStatus(order.id, 'shipped')}>Shipped</button>
                  <button className="secondary small" onClick={() => updateOrderStatus(order.id, 'delivered')}>Delivered</button>
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
            {users.map((user) => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <strong>{user.name}</strong>
                  <div style={{ color: '#9aa3c8' }}>{user.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={user.role} onChange={(event) => updateUserRole(user.id, event.target.value)}>
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
