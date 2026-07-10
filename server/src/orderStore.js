const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true }
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, required: true, enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] },
    estimatedDelivery: { type: String, required: true }
  },
  { timestamps: true }
);

const OrderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);
const memoryOrders = [];

function isMongoReady() {
  return Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;
}

function toPlainOrder(order) {
  if (!order) {
    return null;
  }

  const plainOrder = order.toObject ? order.toObject() : order;

  return {
    id: String(plainOrder.orderId || plainOrder.id),
    orderId: String(plainOrder.orderId || plainOrder.id),
    userId: plainOrder.userId,
    customer: plainOrder.customer,
    items: plainOrder.items || [],
    subtotal: plainOrder.subtotal,
    shipping: plainOrder.shipping,
    total: plainOrder.total,
    status: plainOrder.status,
    estimatedDelivery: plainOrder.estimatedDelivery,
    createdAt: plainOrder.createdAt,
    updatedAt: plainOrder.updatedAt
  };
}

async function createOrder({ userId, customer, items, subtotal, shipping, total, status = 'pending' }) {
  const orderPayload = {
    orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    userId,
    customer,
    items,
    subtotal,
    shipping,
    total,
    status,
    estimatedDelivery: '3-5 business days'
  };

  if (isMongoReady()) {
    const created = await OrderModel.create(orderPayload);
    return toPlainOrder(created);
  }

  const order = {
    id: orderPayload.orderId,
    orderId: orderPayload.orderId,
    ...orderPayload
  };

  memoryOrders.unshift(order);
  return { ...order };
}

async function listOrders() {
  if (isMongoReady()) {
    const records = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return records.map((record) => toPlainOrder(record));
  }

  return memoryOrders.map((order) => ({ ...order }));
}

async function listOrdersForUser(userId) {
  if (isMongoReady()) {
    const records = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return records.map((record) => toPlainOrder(record));
  }

  return memoryOrders.filter((order) => order.userId === userId).map((order) => ({ ...order }));
}

async function updateOrderStatus(orderId, status) {
  if (isMongoReady()) {
    const updated = await OrderModel.findOneAndUpdate(
      { orderId },
      { $set: { status } },
      { new: true }
    ).lean();

    return toPlainOrder(updated);
  }

  const orderIndex = memoryOrders.findIndex((order) => order.orderId === orderId || order.id === orderId);

  if (orderIndex === -1) {
    return null;
  }

  memoryOrders[orderIndex] = {
    ...memoryOrders[orderIndex],
    status
  };

  return { ...memoryOrders[orderIndex] };
}

module.exports = {
  createOrder,
  listOrders,
  listOrdersForUser,
  updateOrderStatus
};