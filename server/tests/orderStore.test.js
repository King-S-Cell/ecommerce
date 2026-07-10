const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrder, listOrdersForUser } = require('../src/orderStore');

test('listOrdersForUser returns only the current customer orders', async () => {
  const firstOrder = await createOrder({
    userId: 'user-1',
    customer: { name: 'Ada', email: 'ada@example.com', address: '1 Main St' },
    items: [{ productId: 'sku-1', name: 'Demo', price: 20, quantity: 1 }],
    subtotal: 20,
    shipping: 12,
    total: 32,
    status: 'pending'
  });

  await createOrder({
    userId: 'user-2',
    customer: { name: 'Grace', email: 'grace@example.com', address: '2 Main St' },
    items: [{ productId: 'sku-2', name: 'Other', price: 10, quantity: 1 }],
    subtotal: 10,
    shipping: 12,
    total: 22,
    status: 'paid'
  });

  const orders = await listOrdersForUser('user-1');

  assert.ok(orders.some((order) => order.orderId === firstOrder.orderId));
  assert.ok(!orders.some((order) => order.orderId === 'ORD-OTHER'));
});
