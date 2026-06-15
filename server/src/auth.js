const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';

function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function authenticateRequest(request, response, next) {
  const authHeader = request.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return response.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    request.auth = payload;
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(role) {
  return (request, response, next) => {
    if (!request.auth || request.auth.role !== role) {
      return response.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
}

module.exports = {
  authenticateRequest,
  requireRole,
  sanitizeUser,
  signUser
};