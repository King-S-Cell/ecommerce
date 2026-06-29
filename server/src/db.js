const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    return { connected: false, mode: 'memory' };
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
  }

  await connectionPromise;

  return { connected: true, mode: 'mongo' };
}

module.exports = {
  connectDatabase
};