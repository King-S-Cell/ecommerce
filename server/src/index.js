const express = require('express');
const cors = require('cors');
const path = require('path');
const products = require('./products');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'ecommerce-api' });
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

app.post('/api/checkout', (request, response) => {
  const { cartItems = [], customer = {} } = request.body || {};

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return response.status(400).json({ message: 'Cart cannot be empty' });
  }

  const subtotal = cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
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