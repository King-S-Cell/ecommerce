const mongoose = require('mongoose');
const seedProducts = require('./products');

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5 },
    badge: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0 },
    accentA: { type: String, required: true },
    accentB: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    imageUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

const ProductModel = mongoose.models.Product || mongoose.model('Product', productSchema);
const memoryProducts = seedProducts.map((product) => ({ ...product }));

function isMongoReady() {
  return Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;
}

function toPlainProduct(product) {
  if (!product) {
    return null;
  }

  const plainProduct = product.toObject ? product.toObject() : product;

  return {
    id: String(plainProduct.productId || plainProduct.id),
    name: plainProduct.name,
    category: plainProduct.category,
    price: plainProduct.price,
    rating: plainProduct.rating,
    badge: plainProduct.badge,
    stock: plainProduct.stock,
    accentA: plainProduct.accentA,
    accentB: plainProduct.accentB,
    description: plainProduct.description,
    features: plainProduct.features || [],
    imageUrl: plainProduct.imageUrl || '',
    createdAt: plainProduct.createdAt,
    updatedAt: plainProduct.updatedAt
  };
}

function normalizeProductInput(input) {
  return {
    name: String(input.name || '').trim(),
    category: String(input.category || '').trim(),
    price: Number(input.price) || 0,
    rating: Number(input.rating) || 0,
    badge: String(input.badge || '').trim(),
    stock: Number(input.stock) || 0,
    accentA: String(input.accentA || '').trim(),
    accentB: String(input.accentB || '').trim(),
    description: String(input.description || '').trim(),
    features: Array.isArray(input.features)
      ? input.features.map((feature) => String(feature).trim()).filter(Boolean)
      : [],
    imageUrl: String(input.imageUrl || '').trim()
  };
}

async function ensureProductSeed() {
  if (!isMongoReady()) {
    return;
  }

  const existingCount = await ProductModel.countDocuments();

  if (existingCount === 0) {
    await ProductModel.insertMany(
      seedProducts.map((product) => ({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        rating: product.rating,
        badge: product.badge,
        stock: product.stock,
        accentA: product.accentA,
        accentB: product.accentB,
        description: product.description,
        features: product.features
      }))
    );
  }
}

async function listProducts() {
  if (isMongoReady()) {
    const records = await ProductModel.find().sort({ createdAt: -1 }).lean();
    return records.map((record) => toPlainProduct(record));
  }

  return memoryProducts.map((product) => ({ ...product }));
}

async function findProductById(id) {
  if (isMongoReady()) {
    return toPlainProduct(await ProductModel.findOne({ productId: id }).lean());
  }

  return memoryProducts.find((product) => product.id === id) || null;
}

async function createProduct(input) {
  const payload = normalizeProductInput(input);

  if (isMongoReady()) {
    const created = await ProductModel.create({
      productId: `prd-${Math.random().toString(36).slice(2, 10)}`,
      ...payload
    });

    return toPlainProduct(created);
  }

  const product = {
    id: `prd-${Math.random().toString(36).slice(2, 10)}`,
    ...payload
  };

  memoryProducts.unshift(product);
  return { ...product };
}

async function updateProduct(id, input) {
  const payload = normalizeProductInput(input);

  if (isMongoReady()) {
    const updated = await ProductModel.findOneAndUpdate(
      { productId: id },
      { $set: payload },
      { new: true }
    ).lean();

    return toPlainProduct(updated);
  }

  const productIndex = memoryProducts.findIndex((product) => product.id === id);

  if (productIndex === -1) {
    return null;
  }

  memoryProducts[productIndex] = {
    ...memoryProducts[productIndex],
    ...payload
  };

  return { ...memoryProducts[productIndex] };
}

async function deleteProduct(id) {
  if (isMongoReady()) {
    const deleted = await ProductModel.findOneAndDelete({ productId: id }).lean();
    return Boolean(deleted);
  }

  const productIndex = memoryProducts.findIndex((product) => product.id === id);

  if (productIndex === -1) {
    return false;
  }

  memoryProducts.splice(productIndex, 1);
  return true;
}

module.exports = {
  createProduct,
  deleteProduct,
  ensureProductSeed,
  findProductById,
  listProducts,
  updateProduct
};