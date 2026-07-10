import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const FALLBACK_PRODUCTS = [
  {
    id: 'sku-01',
    name: 'Atlas Runner',
    category: 'Footwear',
    price: 124,
    rating: 4.9,
    badge: 'Best seller',
    stock: 18,
    accentA: '#ffb36b',
    accentB: '#ff6f61',
    description: 'A lightweight everyday runner with responsive cushioning and a sleek city-ready profile.',
    features: ['Breathable knit upper', 'Energy-return foam', 'All-day grip']
  },
  {
    id: 'sku-02',
    name: 'Canvas Weekender',
    category: 'Bags',
    price: 86,
    rating: 4.7,
    badge: 'New arrival',
    stock: 24,
    accentA: '#8be0c9',
    accentB: '#2c9d8f',
    description: 'A structured carryall with waterproof lining and enough room for a full weekend away.',
    features: ['Reinforced handles', 'Water-resistant shell', 'Laptop sleeve']
  },
  {
    id: 'sku-03',
    name: 'Monarch Lamp',
    category: 'Home',
    price: 112,
    rating: 4.8,
    badge: 'Design pick',
    stock: 11,
    accentA: '#f7d06e',
    accentB: '#c47b2f',
    description: 'Warm ambient lighting shaped to feel sculptural on a desk, console, or bedside table.',
    features: ['Warm LED glow', 'Brushed metal base', 'Dimmable control']
  },
  {
    id: 'sku-04',
    name: 'North Field Jacket',
    category: 'Apparel',
    price: 148,
    rating: 4.6,
    badge: 'Limited run',
    stock: 9,
    accentA: '#9fc5f8',
    accentB: '#4a69ff',
    description: 'A weather-ready shell with a tailored fit and practical layering space for changing seasons.',
    features: ['Storm flap zip', 'Hidden pockets', 'Packable hood']
  },
  {
    id: 'sku-05',
    name: 'Nova Watch',
    category: 'Accessories',
    price: 199,
    rating: 4.9,
    badge: 'Editor favorite',
    stock: 14,
    accentA: '#e2b1ff',
    accentB: '#865dff',
    description: 'A minimalist watch with precision movement and a brushed finish that works with anything.',
    features: ['Sapphire glass', 'Quick-change strap', 'Water resistant']
  },
  {
    id: 'sku-06',
    name: 'Field Bottle',
    category: 'Lifestyle',
    price: 38,
    rating: 4.5,
    badge: 'Popular',
    stock: 33,
    accentA: '#9ef0d0',
    accentB: '#1f8a70',
    description: 'An insulated bottle that keeps drinks cold for hours and looks good on any desk or trail.',
    features: ['Double-wall steel', 'Leak-proof cap', 'Easy-carry loop']
  }
];

const STORAGE_CART_KEY = 'nimbus-cart';
const STORAGE_SESSION_KEY = 'nimbus-session';

function loadCart() {
  try {
    const saved = window.localStorage.getItem(STORAGE_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

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

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState(loadCart);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });
  const [session, setSession] = useState(loadSession);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authTab, setAuthTab] = useState('customer');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchProducts() {
      setLoading(true);

      try {
        const response = await fetch('/api/products');

        if (!response.ok) {
          throw new Error('Unable to load products');
        }

        const data = await response.json();

        if (!ignore) {
          setProducts(data);
          setError('');
        }
      } catch (fetchError) {
        if (!ignore) {
          setProducts(FALLBACK_PRODUCTS);
          setError(fetchError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      ignore = true;
    };
  }, [inventoryVersion]);

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
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    function handleClick(event) {
      if (!event.target.closest('.account-menu-wrapper')) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [accountMenuOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const success = params.get('payment_success');

    if (!success || !sessionId) {
      return;
    }

    async function completePayment() {
      try {
        const response = await fetch(`/api/payments/complete?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (response.ok) {
          setCheckoutResult(data.order || data);
          setCart([]);
          setError('Payment completed successfully.');
        }
      } catch (err) {
        setError(err.message || 'Payment completion failed');
      }
    }

    completePayment();
  }, [session]);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 12 : 0;
  const total = subtotal + shipping;
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId, delta) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

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
      setAuthForm((current) => ({
        ...current,
        password: ''
      }));
    } catch (authError) {
      setAuthMessage(authError.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  function logout() {
    setSession(null);
    setAuthMessage('');
    setCheckoutOpen(false);
    setAccountMenuOpen(false);
  }

  function openCheckout() {
    if (!session) {
      setAuthTab('customer');
      setAuthMode('login');
      setAuthMessage('Sign in as a customer to continue to checkout.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCheckoutOpen(true);
  }

  async function handleCheckout(event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    if (!session) {
      setAuthMessage('Sign in as a customer to place an order.');
      setCheckoutOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(session.token)
        },
        body: JSON.stringify({
          cartItems: cart,
          customer
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setCheckoutResult(data.order || data);
      setCart([]);
      setCheckoutOpen(false);
      setCustomer({ name: '', email: '', address: '' });
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAdmin = session?.user.role === 'admin';
  const isCustomer = session?.user.role === 'user';

  return (
    <div className="shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="auth-shell">
        <div className="auth-copy">
          <span className="eyebrow">Account access</span>
          <h2>Sign in or register on a dedicated page.</h2>
          <p>
            The storefront stays on the home page, while customer and admin authentication now lives in a focused experience with its own route.
          </p>
        </div>

        <div className="auth-card">
          {sessionLoading ? (
            <div className="empty-state">Checking session...</div>
          ) : session ? (
            <div className="session-card">
              <div className="session-meta">
                <span className="section-kicker">Signed in</span>
                <strong>{session.user.name}</strong>
                <span>{session.user.email}</span>
              </div>
              <div className="role-badge">{session.user.role}</div>
              <div className="account-menu-wrapper">
                <button type="button" className="secondary full account-menu-trigger" onClick={() => setAccountMenuOpen((value) => !value)}>
                  Manage account
                </button>
                {accountMenuOpen ? (
                  <div className="account-menu">
                    {session?.user?.role === 'admin' ? (
                      <>
                        <Link to="/admin/products" onClick={() => setAccountMenuOpen(false)}>
                          Manage products
                        </Link>
                        <Link to="/admin/orders" onClick={() => setAccountMenuOpen(false)}>
                          Manage orders
                        </Link>
                        <Link to="/admin/users" onClick={() => setAccountMenuOpen(false)}>
                          Manage users
                        </Link>
                      </>
                    ) : null}
                    <Link to="/orders" onClick={() => setAccountMenuOpen(false)}>
                      View orders
                    </Link>
                    <Link to="/profile" onClick={() => setAccountMenuOpen(false)}>
                      Change information
                    </Link>
                    <button type="button" className="secondary full" onClick={logout}>
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="auth-form">
              <p className="auth-note">Use the dedicated sign-in page for customer or admin access.</p>
              <Link className="primary full" to="/auth" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
                Go to sign-in page
              </Link>
            </div>
          )}
        </div>
      </section>

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Nimbus Market</span>
          <h1>Fast, polished commerce for a modern product catalog.</h1>
          <p>
            A React storefront paired with an Express API, now with customer auth, admin auth, and a protected checkout
            flow.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={openCheckout} type="button">
              {session ? 'Start checkout' : 'Sign in to checkout'}
            </button>
            <button className="secondary" type="button" onClick={() => setCategory('All')}>
              Browse everything
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div>
            <span className="panel-label">Session</span>
            <strong>{session ? `${session.user.role} account` : 'Not signed in'}</strong>
          </div>
          <div>
            <span className="panel-label">Conversion</span>
            <strong>4.9%</strong>
          </div>
          <div>
            <span className="panel-label">Orders in cart</span>
            <strong>{cartCount}</strong>
          </div>
        </div>
      </header>

      {isAdmin ? (
        <AdminDashboard token={session.token} onInventoryChanged={() => setInventoryVersion((value) => value + 1)} />
      ) : null}

      <main className="content">
        <section className="catalog">
          <div className="section-head">
            <div>
              <span className="section-kicker">Catalog</span>
              <h2>Featured products</h2>
            </div>
            <label className="search">
              <span>Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a product" />
            </label>
          </div>

          <div className="filters">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={item === category ? 'chip active' : 'chip'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? <div className="empty-state">Loading the storefront...</div> : null}
          {error ? <div className="notice">{error}</div> : null}

          <div className="grid">
            {filteredProducts.map((product) => (
              <article
                className="product-card"
                key={product.id}
                style={{ '--accent-a': product.accentA, '--accent-b': product.accentB }}
              >
                <button
                  className="product-visual"
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  style={product.imageUrl ? {
                    backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.2), rgba(0,0,0,0.28)), url(${product.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  } : {
                    background: `linear-gradient(145deg, ${product.accentA || '#ddd'}, ${product.accentB || '#333'})`
                  }}
                >
                  {product.imageUrl ? null : (
                    <span className="placeholder-copy">
                      <span>{product.badge}</span>
                      <span>{product.category}</span>
                    </span>
                  )}
                  <span className="badge">{product.badge}</span>
                  <span className="orb orb-one" />
                  <span className="orb orb-two" />
                  <span className="product-mark">{product.category}</span>
                </button>

                <div className="product-copy">
                  <div className="product-meta">
                    <span>{product.category}</span>
                    <span>{product.rating} stars</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <strong>{currency.format(product.price)}</strong>
                    <span>{product.stock} left</span>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="secondary small" onClick={() => setSelectedProduct(product)}>
                      View details
                    </button>
                    <button type="button" className="primary small" onClick={() => addToCart(product)}>
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart-panel">
          <div className="section-head compact">
            <div>
              <span className="section-kicker">Cart</span>
              <h2>Your order</h2>
            </div>
            <span className="cart-pill">{cartCount} items</span>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? <div className="empty-state">Your cart is empty.</div> : null}

            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{currency.format(item.price)}</span>
                </div>
                <div className="quantity-controls">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="summary">
            <div>
              <span>Subtotal</span>
              <strong>{currency.format(subtotal)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{currency.format(shipping)}</strong>
            </div>
            <div className="total-row">
              <span>Total</span>
              <strong>{currency.format(total)}</strong>
            </div>
          </div>

          <button className="primary full" type="button" onClick={openCheckout} disabled={cart.length === 0}>
            {session ? 'Continue to checkout' : 'Sign in to checkout'}
          </button>
          {!isCustomer && !isAdmin ? <div className="notice">Sign in to unlock checkout.</div> : null}
        </aside>
      </main>

      {selectedProduct ? (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div
              className="modal-visual"
              style={selectedProduct.imageUrl ? {
                backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.2), rgba(0,0,0,0.28)), url(${selectedProduct.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : { '--accent-a': selectedProduct.accentA, '--accent-b': selectedProduct.accentB }}
            >
              <span className="badge">{selectedProduct.badge}</span>
            </div>
            <div className="modal-copy">
              <div className="section-head compact">
                <div>
                  <span className="section-kicker">Product detail</span>
                  <h2>{selectedProduct.name}</h2>
                </div>
                <button type="button" className="icon-button" onClick={() => setSelectedProduct(null)}>
                  Close
                </button>
              </div>
              <p>{selectedProduct.description}</p>
              <ul>
                {selectedProduct.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="product-footer">
                <strong>{currency.format(selectedProduct.price)}</strong>
                <span>{selectedProduct.stock} in stock</span>
              </div>
              <button type="button" className="primary full" onClick={() => addToCart(selectedProduct)}>
                Add to cart
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}>
          <form className="checkout-modal" onClick={(event) => event.stopPropagation()} onSubmit={handleCheckout}>
            <div className="section-head compact">
              <div>
                <span className="section-kicker">Checkout</span>
                <h2>Complete your order</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setCheckoutOpen(false)}>
                Close
              </button>
            </div>

            <div className="checkout-grid">
              <label>
                Full name
                <input
                  value={customer.name}
                  onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={customer.email}
                  onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                  required
                />
              </label>
              <label className="wide">
                Shipping address
                <textarea
                  rows="4"
                  value={customer.address}
                  onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
                  required
                />
              </label>
            </div>

            <div className="summary checkout-summary">
              <div>
                <span>Order total</span>
                <strong>{currency.format(total)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>3-5 business days</strong>
              </div>
            </div>

            <button type="submit" className="primary full" disabled={isSubmitting || cart.length === 0}>
              {isSubmitting ? 'Placing order...' : 'Place order'}
            </button>
          </form>
        </div>
      ) : null}

      {checkoutResult ? (
        <div className="toast">
          <strong>Order confirmed</strong>
          <span>
            {checkoutResult.orderId || checkoutResult.id} · arrives in {checkoutResult.estimatedDelivery}
          </span>
          <button type="button" className="icon-button" onClick={() => setCheckoutResult(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;