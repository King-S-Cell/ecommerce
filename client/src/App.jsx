import { useEffect, useMemo, useState } from 'react';

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

function loadCart() {
  try {
    const saved = window.localStorage.getItem('nimbus-cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
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

  useEffect(() => {
    let ignore = false;

    async function fetchProducts() {
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
  }, []);

  useEffect(() => {
    window.localStorage.setItem('nimbus-cart', JSON.stringify(cart));
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

  async function handleCheckout(event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          customer
        })
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const result = await response.json();
      setCheckoutResult(result);
      setCart([]);
      setCheckoutOpen(false);
      setCustomer({ name: '', email: '', address: '' });
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Nimbus Market</span>
          <h1>Fast, polished commerce for a modern product catalog.</h1>
          <p>
            A React storefront paired with an Express API, built to showcase products, collect carts,
            and simulate checkout without unnecessary overhead.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setCheckoutOpen(true)} type="button">
              Start checkout
            </button>
            <button className="secondary" type="button" onClick={() => setCategory('All')}>
              Browse everything
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div>
            <span className="panel-label">Today&apos;s traffic</span>
            <strong>8.4k sessions</strong>
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

          {loading ? (
            <div className="empty-state">Loading the storefront...</div>
          ) : null}

          {error ? <div className="notice">{error}</div> : null}

          <div className="grid">
            {filteredProducts.map((product) => (
              <article
                className="product-card"
                key={product.id}
                style={{ '--accent-a': product.accentA, '--accent-b': product.accentB }}
              >
                <button className="product-visual" type="button" onClick={() => setSelectedProduct(product)}>
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

          <button className="primary full" type="button" onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0}>
            Continue to checkout
          </button>
        </aside>
      </main>

      {selectedProduct ? (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div
              className="modal-visual"
              style={{ '--accent-a': selectedProduct.accentA, '--accent-b': selectedProduct.accentB }}
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
          <span>{checkoutResult.orderId} · arrives in {checkoutResult.estimatedDelivery}</span>
          <button type="button" className="icon-button" onClick={() => setCheckoutResult(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;