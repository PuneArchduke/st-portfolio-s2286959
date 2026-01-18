require('dotenv').config();
var jwt = require("jsonwebtoken");
const user = require("../models/user");
const User = user.User;

// ===== INSTRUMENTATION: Import assert module =====
const assert = require('assert');
// =================================================

/* Auth User module. */
const authenticateToken = (req, res, next) => {
  // ===== INSTRUMENTATION 1: Log authentication attempt =====
  console.log('[AUTH] Authentication attempt:', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers['authorization'],
    timestamp: new Date().toISOString()
  });
  // ==========================================================

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null){
    // ===== INSTRUMENTATION 2: Log missing token =====
    console.log('[AUTH] Authentication failed: No token provided');
    // ================================================
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.API_SECRET, (error, user) => {
    if (error) {
      // ===== INSTRUMENTATION 3: Enhanced error logging =====
      console.log('[AUTH] JWT verification failed:', {
        error: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString()
      });
      // =====================================================
      return res.status(403).send({"message": "Unauthorized access."});
    }

    User.findOne({_id: user.id}).then(userFound => {
      if (!userFound) {
        // ===== INSTRUMENTATION 4: Log user not found =====
        console.log('[AUTH] User not found in database:', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        // =================================================
        return res.status(403).send({"message": "Unauthorized access."});
      }

      // ===== INSTRUMENTATION 5: Assert and success logging =====
      assert(userFound.role, 'User must have a role');
      console.log('[AUTH] Authentication successful:', {
        userId: user.id,
        role: userFound.role,
        timestamp: new Date().toISOString()
      });
      // =========================================================

      user.role = userFound.role;
      req.user = user;
      next();
    });
  });
}

module.exports = {
  authenticateToken: authenticateToken
};