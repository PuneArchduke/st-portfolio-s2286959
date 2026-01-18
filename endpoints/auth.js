require('dotenv').config();
var jwt = require("jsonwebtoken");
const user = require("../models/user");
const User = user.User;

// ===== 插桩：导入assert模块 =====
const assert = require('assert');
// =================================

/* Auth User module. */
const authenticateToken = (req, res, next) => {
  // ===== 插桩1：记录认证尝试 =====
  console.log('[AUTH] Authentication attempt:', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers['authorization'],
    timestamp: new Date().toISOString()
  });
  // =================================
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null){
    // ===== 插桩2：记录token缺失 =====
    console.log('[AUTH] Authentication failed: No token provided');
    // =================================
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.API_SECRET, (error, user) => {
    
    if (error) {
      // ===== 插桩3：增强错误日志 =====
      console.log('[AUTH] JWT verification failed:', {
        error: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString()
      });
      // =================================
      return res.status(403).send({"message": "Unauthorized access."});
    }
    
    User.findOne({_id: user.id}).then(userFound => {
      // If the token does not belong to an existing user,
      // then block access.
      if (!userFound) {
        // ===== 插桩4：记录用户不存在 =====
        console.log('[AUTH] User not found in database:', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        // =================================
        return res.status(403).send({"message": "Unauthorized access."});
      }
      
      // ===== 插桩5：断言和成功日志 =====
      assert(userFound.role, 'User must have a role');
      console.log('[AUTH] Authentication successful:', {
        userId: user.id,
        role: userFound.role,
        timestamp: new Date().toISOString()
      });
      // =================================
      
      user.role = userFound.role;
      req.user = user;
      next();
    });
  });
}

module.exports = {
  authenticateToken: authenticateToken
};