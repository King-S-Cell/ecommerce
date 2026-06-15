const bcrypt = require('bcryptjs');

const users = [
  {
    id: 'user-admin',
    name: 'Store Admin',
    email: 'admin@nimbus.local',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    role: 'admin'
  }
];

function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  return users.find((user) => user.id === id);
}

function createCustomer({ name, email, password }) {
  const user = {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user'
  };

  users.push(user);

  return user;
}

function listUsers() {
  return users;
}

module.exports = {
  createCustomer,
  findUserByEmail,
  findUserById,
  listUsers
};