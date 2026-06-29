require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('./db');
const {
  authenticateRequest,
  requireRole,
  sanitizeUser,
  signUser
} = require('./auth');
const {
  createOrder,
  listOrders,
  updateOrderStatus
} = require('./orderStore');
const {
  createProduct,
  deleteProduct,
  ensureProductSeed,
  findProductById,
  listProducts,
  updateProduct
} = require('./productStore');
const {
  createCustomer,
  ensureAdminSeed,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser
} = require('./users');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function wrapAsync(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeStatus(status) {
  const allowedStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
  return allowedStatuses.includes(status) ? status : 'pending';
}

function normalizeFeatures(features) {
  return Array.isArray(features)
    ? features.map((feature) => String(feature).trim()).filter(Boolean)
    : String(features || '')
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean);
}

function validateProductPayload(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const price = Number(body.price);
  const rating = Number(body.rating);
  const badge = String(body.badge || '').trim();
  const stock = Number(body.stock);
  const accentA = String(body.accentA || '').trim();
  const accentB = String(body.accentB || '').trim();
  const description = String(body.description || '').trim();
  const features = normalizeFeatures(body.features);
  const imageUrl = String(body.imageUrl || '').trim();
  const normalizedImageUrl = imageUrl
    ? (() => {
        try {
          return new URL(imageUrl).toString();
        } catch {
          return '';
        }
      })()
    : '';

  if (!name || !category || !badge || !accentA || !accentB || !description) {
    return null;
  }

  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isFinite(stock) || stock < 0) {
    return null;
  }

  return {
    name,
    category,
    price,
    rating,
    badge,
    stock,
    accentA,
    accentB,
    description,
    features,
    imageUrl: normalizedImageUrl
  };
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'ecommerce-api' });
});

app.get(
  '/api/products',
  wrapAsync(async (_request, response) => {
    response.json(await listProducts());
  })
);

app.get(
  '/api/products/:id',
  wrapAsync(async (request, response) => {
    const product = await findProductById(request.params.id);

    if (!product) {
      return response.status(404).json({ message: 'Product not found' });
    }

    return response.json(product);
  })
);

app.post(
  '/api/auth/register',
  wrapAsync(async (request, response) => {
    const { name = '', email = '', password = '' } = request.body || {};
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || password.length < 8) {
      return response.status(400).json({
        message: 'Name, email, and an 8 character password are required'
      });
    }

    const existingUser = await findUserByEmail(trimmedEmail);

    if (existingUser) {
      return response.status(409).json({ message: 'Email already exists' });
    }

    const user = await createCustomer({
      name: trimmedName,
      email: trimmedEmail,
      password
    });

    return response.status(201).json({
      token: signUser(user),
      user: sanitizeUser(user)
    });
  })
);

app.post(
  '/api/auth/login',
  wrapAsync(async (request, response) => {
    const { email = '', password = '' } = request.body || {};
    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(trimmedEmail);

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return response.status(401).json({ message: 'Invalid credentials' });
    }

    return response.json({
      token: signUser(user),
      user: sanitizeUser(user)
    });
  })
);

app.get(
  '/api/auth/me',
  authenticateRequest,
  wrapAsync(async (request, response) => {
    const user = await findUserById(request.auth.sub);

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    return response.json({ user: sanitizeUser(user) });
  })
);

app.get(
  '/api/admin/overview',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (_request, response) => {
    const products = await listProducts();
    const orders = await listOrders();
    const users = await listUsers();
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const lowStockProducts = products
      .filter((product) => product.stock <= 12)
      .map((product) => ({ id: product.id, name: product.name, stock: product.stock }));

    response.json({
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === 'pending').length,
      totalCustomers: users.filter((user) => user.role === 'user').length,
      totalAdmins: users.filter((user) => user.role === 'admin').length,
      lowStockProducts,
      highlightedRevenue: totalRevenue
    });
  })
);

app.get(
  '/api/admin/products',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (_request, response) => {
    response.json(await listProducts());
  })
);

app.post(
  '/api/admin/products',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (request, response) => {
    const payload = validateProductPayload(request.body || {});

    if (!payload) {
      return response.status(400).json({ message: 'Invalid product payload' });
    }

    const created = await createProduct(payload);
    return response.status(201).json(created);
  })
);

app.patch(
  '/api/admin/products/:id',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (request, response) => {
    const payload = validateProductPayload(request.body || {});

    if (!payload) {
      return response.status(400).json({ message: 'Invalid product payload' });
    }

    const updated = await updateProduct(request.params.id, payload);

    if (!updated) {
      return response.status(404).json({ message: 'Product not found' });
    }

    return response.json(updated);
  })
);

app.delete(
  '/api/admin/products/:id',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (request, response) => {
    const deleted = await deleteProduct(request.params.id);

    if (!deleted) {
      return response.status(404).json({ message: 'Product not found' });
    }

    return response.status(204).send();
  })
);

app.get(
  '/api/admin/orders',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (_request, response) => {
    response.json(await listOrders());
  })
);

app.patch(
  '/api/admin/orders/:id',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (request, response) => {
    const status = normalizeStatus(request.body?.status);
    const updated = await updateOrderStatus(request.params.id, status);

    if (!updated) {
      return response.status(404).json({ message: 'Order not found' });
    }

    return response.json(updated);
  })
);

app.get(
  '/api/admin/users',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (_request, response) => {
    response.json(await listUsers());
  })
);

app.patch(
  '/api/admin/users/:id',
  authenticateRequest,
  requireRole('admin'),
  wrapAsync(async (request, response) => {
    const updated = await updateUser(request.params.id, request.body || {});

    if (!updated) {
      return response.status(404).json({ message: 'User not found' });
    }

    return response.json(updated);
  })
);

app.post(
  '/api/checkout',
  authenticateRequest,
  wrapAsync(async (request, response) => {
    const { cartItems = [], customer = {} } = request.body || {};
    const user = await findUserById(request.auth.sub);

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return response.status(400).json({ message: 'Cart cannot be empty' });
    }

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    const normalizedItems = [];

    for (const item of cartItems) {
      const product = await findProductById(item.id);

      if (!product) {
        return response.status(400).json({ message: `Unknown product: ${item.id}` });
      }

      const quantity = parsePositiveInteger(item.quantity);

      if (quantity === 0) {
        return response.status(400).json({ message: 'Invalid cart quantity' });
      }

      normalizedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity
      });
    }

    const subtotal = normalizedItems.reduce(
      (total, item) => total + parsePositiveInteger(item.price) * parsePositiveInteger(item.quantity),
      0
    );
    const shipping = subtotal > 0 ? 12 : 0;
    const total = subtotal + shipping;

    const order = await createOrder({
      userId: user.id,
      customer: {
        name: customer.name || user.name,
        email: customer.email || user.email,
        address: customer.address || ''
      },
      items: normalizedItems,
      subtotal,
      shipping,
      total,
      status: 'pending'
    });

    return response.status(201).json(order);
  })
);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Server error' });
});

const clientDist = path.join(__dirname, '../../client/dist');

app.use(express.static(clientDist));

app.get('*', (request, response) => {
  if (request.path.startsWith('/api')) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.sendFile(path.join(clientDist, 'index.html'));
});

async function startServer() {
  const databaseStatus = await connectDatabase();

  if (databaseStatus.connected) {
    await ensureAdminSeed();
    await ensureProductSeed();
  }

  app.listen(port, () => {
    console.log(`E-commerce API running on http://localhost:${port}`);
    console.log(`Auth storage: ${databaseStatus.mode}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});