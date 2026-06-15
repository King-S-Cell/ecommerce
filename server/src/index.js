const express = require('express');
const cors = require('cors');
const path = require('path');
const products = require('./products');
const bcrypt = require('bcryptjs');
const {
  authenticateRequest,
  requireRole,
  sanitizeUser,
  signUser
} = require('./auth');
const {
  createCustomer,
  findUserByEmail,
  findUserById,
  listUsers
} = require('./users');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'ecommerce-api' });
});

app.post('/api/auth/register', (request, response) => {
  const { name = '', email = '', password = '' } = request.body || {};
  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();

  if (!trimmedName || !trimmedEmail || password.length < 8) {
    return response.status(400).json({
      message: 'Name, email, and an 8 character password are required'
    });
  }

  if (findUserByEmail(trimmedEmail)) {
    return response.status(409).json({ message: 'Email already exists' });
  }

  const user = createCustomer({
    name: trimmedName,
    email: trimmedEmail,
    password
  });

  const token = signUser(user);

  return response.status(201).json({
    token,
    user: sanitizeUser(user)
  });
});

app.post('/api/auth/login', (request, response) => {
  const { email = '', password = '' } = request.body || {};
  const trimmedEmail = String(email).trim().toLowerCase();
  const user = findUserByEmail(trimmedEmail);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return response.status(401).json({ message: 'Invalid credentials' });
  }

  return response.json({
    token: signUser(user),
    user: sanitizeUser(user)
  });
});

app.get('/api/auth/me', authenticateRequest, (request, response) => {
  const user = findUserById(request.auth.sub);

  if (!user) {
    return response.status(404).json({ message: 'User not found' });
  }

  return response.json({ user: sanitizeUser(user) });
});

app.get('/api/admin/overview', authenticateRequest, requireRole('admin'), (_request, response) => {
  const totalProducts = products.length;
  const lowStockProducts = products
    .filter((product) => product.stock <= 12)
    .map((product) => ({ id: product.id, name: product.name, stock: product.stock }));

  response.json({
    totalProducts,
    totalCustomers: listUsers().filter((user) => user.role === 'user').length,
    totalAdmins: listUsers().filter((user) => user.role === 'admin').length,
    lowStockProducts,
    highlightedRevenue: 18240
  });
});

app.get('/api/products', (_request, response) => {
  response.json(products);
});

app.get('/api/products/:id', (request, response) => {
  const product = products.find((item) => item.id === request.params.id);

  if (!product) {
    return response.status(404).json({ message: 'Product not found' });
  }

  return response.json(product);
});

app.post('/api/checkout', authenticateRequest, (request, response) => {
  const { cartItems = [], customer = {} } = request.body || {};

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return response.status(400).json({ message: 'Cart cannot be empty' });
  }

  const subtotal = cartItems.reduce(
    (total, item) => total + parsePositiveInteger(item.price) * parsePositiveInteger(item.quantity),
    0
  );
  const shipping = subtotal > 0 ? 12 : 0;
  const total = subtotal + shipping;

  return response.json({
    orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    subtotal,
    shipping,
    total,
    customer,
    estimatedDelivery: '3-5 business days'
  });
});

const clientDist = path.join(__dirname, '../../client/dist');

app.use(express.static(clientDist));

app.get('*', (request, response) => {
  if (request.path.startsWith('/api')) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`E-commerce API running on http://localhost:${port}`);
});