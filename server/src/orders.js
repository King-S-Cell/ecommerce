const orders = [];

function createOrder({ cartItems = [], customer = {}, createdBy = null }) {
  const order = {
    id: `order-${Math.random().toString(36).slice(2, 10)}`,
    cartItems,
    customer,
    createdBy,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  orders.push(order);
  return order;
}

function listOrders() {
  return orders;
}

module.exports = { createOrder, listOrders };
