const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const users = [
  {
    id: 'user-admin',
    name: 'Store Admin',
    email: 'admin@nimbus.local',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    role: 'admin'
  }
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'admin'] }
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

function isMongoReady() {
  return Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;
}

function toPlainUser(user) {
  if (!user) {
    return null;
  }

  const plainUser = user.toObject ? user.toObject() : user;

  return {
    id: String(plainUser._id || plainUser.id),
    name: plainUser.name,
    email: plainUser.email,
    passwordHash: plainUser.passwordHash,
    role: plainUser.role,
    createdAt: plainUser.createdAt,
    updatedAt: plainUser.updatedAt
  };
}

async function ensureAdminSeed() {
  if (!isMongoReady()) {
    return;
  }

  const existingAdmin = await UserModel.findOne({ email: 'admin@nimbus.local' }).lean();

  if (!existingAdmin) {
    await UserModel.create({
      name: 'Store Admin',
      email: 'admin@nimbus.local',
      passwordHash: bcrypt.hashSync('Admin123!', 10),
      role: 'admin'
    });
  }
}

async function findUserByEmail(email) {
  if (isMongoReady()) {
    return toPlainUser(await UserModel.findOne({ email: email.toLowerCase() }).lean());
  }

  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findUserById(id) {
  if (isMongoReady()) {
    return toPlainUser(await UserModel.findById(id).lean());
  }

  return users.find((user) => user.id === id) || null;
}

async function createCustomer({ name, email, password }) {
  const passwordHash = bcrypt.hashSync(password, 10);

  if (isMongoReady()) {
    const created = await UserModel.create({
      name,
      email,
      passwordHash,
      role: 'user'
    });

    return toPlainUser(created);
  }

  const user = {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    name,
    email,
    passwordHash,
    role: 'user'
  };

  users.push(user);

  return user;
}

async function listUsers() {
  if (isMongoReady()) {
    const records = await UserModel.find().lean();
    return records.map((record) => {
      const user = toPlainUser(record);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    });
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));
}

async function updateUser(id, updates = {}) {
  const nextName = String(updates.name || '').trim();
  const nextEmail = String(updates.email || '').trim().toLowerCase();
  const nextPassword = typeof updates.password === 'string' ? updates.password : '';
  const nextRole = updates.role === 'admin' || updates.role === 'user' ? updates.role : null;

  if (nextEmail) {
    const existingUser = await findUserByEmail(nextEmail);

    if (existingUser && existingUser.id !== String(id)) {
      return null;
    }
  }

  const updatePayload = {
    ...(nextName ? { name: nextName } : {}),
    ...(nextEmail ? { email: nextEmail } : {})
  };

  if (nextRole) {
    updatePayload.role = nextRole;
  }

  if (nextPassword) {
    updatePayload.passwordHash = bcrypt.hashSync(nextPassword, 10);
  }

  if (isMongoReady()) {
    const updated = await UserModel.findByIdAndUpdate(id, updatePayload, { new: true }).lean();
    return toPlainUser(updated);
  }

  const userIndex = users.findIndex((user) => user.id === id);

  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    ...updatePayload
  };

  return {
    ...users[userIndex],
    id: users[userIndex].id,
    name: users[userIndex].name,
    email: users[userIndex].email,
    passwordHash: users[userIndex].passwordHash,
    role: users[userIndex].role,
    createdAt: users[userIndex].createdAt,
    updatedAt: users[userIndex].updatedAt
  };
}

async function deleteUser(id) {
  if (isMongoReady()) {
    const deleted = await UserModel.findByIdAndDelete(id);
    return Boolean(deleted);
  }

  const initialLength = users.length;
  const remainingUsers = users.filter((user) => user.id !== id);

  if (remainingUsers.length === initialLength) {
    return false;
  }

  users.splice(0, users.length, ...remainingUsers);
  return true;
}

module.exports = {
  createCustomer,
  ensureAdminSeed,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser,
  deleteUser
};