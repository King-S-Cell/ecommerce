const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createCustomer, deleteUser, findUserByEmail, updateUser } = require('../src/users');

test('customer profile updates and admins can delete users', async () => {
  const email = `profile-${Date.now()}@example.com`;
  const user = await createCustomer({ name: 'Test User', email, password: 'Secret123!' });

  const updated = await updateUser(user.id, {
    name: 'Updated User',
    email: 'updated@example.com',
    password: 'NewPass123!'
  });

  assert.equal(updated.name, 'Updated User');
  assert.equal(updated.email, 'updated@example.com');
  assert.ok(bcrypt.compareSync('NewPass123!', updated.passwordHash));

  const found = await findUserByEmail('updated@example.com');
  assert.ok(found);
  assert.equal(found.name, 'Updated User');

  const deleted = await deleteUser(user.id);
  assert.equal(deleted, true);

  const afterDelete = await findUserByEmail('updated@example.com');
  assert.equal(afterDelete, null);
});
