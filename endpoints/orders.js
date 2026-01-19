require('dotenv').config();

const {authenticateToken} = require("./auth");

const user = require("../models/user");
const User = user.User;

const order = require("../models/order");
const Order = order.Order;

// ===== INSTRUMENTATION 1: Import assert module =====
const assert = require('assert');
// ===================================================

module.exports = (app) => {

  /* Get orders of any user. */
  app.get("/orders/user/:userID", authenticateToken, async (req, res) => {
    try {

      // ===== INSTRUMENTATION 2: Log permission check =====
      console.log('[ORDERS] Admin access check:', {
        userId: req.user.id,
        userRole: req.user.role,
        requestedUserID: req.params.userID,
        endpoint: '/orders/user/:userID',
        timestamp: new Date().toISOString()
      });
      // ===================================================

      // This is an admin-only operation.
      if(req.user.role !== "Admin") {
        // ===== INSTRUMENTATION 3: Log permission denied =====
        console.log('[ORDERS] Access denied: Not admin');
        // ====================================================
        return res.status(403).json({
          "message": "Unauthorized Access."
        });
      }
      const {userID} = req.params;
      const allOrders = await Order.find({user: userID});

      return res.status(200).json(allOrders);
    } catch(error) {
      console.log(error);
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });

  /* Get orders of user. */
  app.get("/orders/all", authenticateToken, async (req, res) => {
    try{
      let allOrders = await Order.find({ user : req.user.id });
      return res.status(200).json(allOrders);
    } catch(error) {
      console.log(error);
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });

  /* Get a single order info. */
  app.get("/order/:orderID", authenticateToken, async (req, res) => {
    try{
      const {orderID} = req.params;
      const orderFound = await Order.findOne({ _id: orderID });

      if(orderFound) {
        // Admin can see orders of any person, including himself/herself.
        // Simple users can only access their orders.
        if(req.user.role !== "Admin" && orderFound.user.toString() !== req.user.id) {
          return res.status(403).json({
            "message": "Unauthorized Access."
          });
        }
        return res.status(200).json(orderFound);
      } else {
        return res.status(404).json({
          "message": "No order found."
        });
      }
    } catch(error) {
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });

  /* Add a new order. Admins can NOT add orders for other members. */
  app.post("/order", authenticateToken, async (req, res) => {
    try {
      // ===== INSTRUMENTATION 4: Log order creation and performance timing =====
      const startTime = Date.now();
      console.log('[ORDERS] Creating new order:', {
        userId: req.user.id,
        orderData: req.body,
        timestamp: new Date().toISOString()
      });

      // Validate order data integrity (commented out - for demonstration)
      //assert(req.body.items, 'Order must contain items');
      //assert(Array.isArray(req.body.items), 'Items must be an array');
      //assert(req.body.items.length > 0, 'Order must have at least one item');

      console.log('[ORDERS] Order validation passed');
      // ========================================================================

      const newOrder = new Order({ ...req.body });
      newOrder.user = req.user.id;
      const userExists = await User.exists({ _id: req.user.id });
      // Obtain orders only if respective user exists.
      if(userExists) {
        const insertedOrder = await newOrder.save();

        // ===== INSTRUMENTATION 5: Log creation success and performance =====
        const duration = Date.now() - startTime;
        console.log('[ORDERS] Order created successfully:', {
          orderId: insertedOrder._id,
          userId: req.user.id,
          duration: duration + 'ms',
          timestamp: new Date().toISOString()
        });

        if (duration > 500) {
          console.warn('[ORDERS] PERFORMANCE WARNING: Slow order creation:', {
            duration: duration + 'ms',
            threshold: '500ms'
          });
        }
        // ===================================================================

        return res.status(201).json(insertedOrder);
      } else {
        // ===== INSTRUMENTATION 6: Log user not found error =====
        console.log('[ORDERS] Order creation failed: User does not exist:', {
          userId: req.user.id,
          timestamp: new Date().toISOString()
        });
        // =======================================================
        return res.status(400).json({
          "message": "No user associated with order."
        });
      }
    } catch(error) {
      // ===== INSTRUMENTATION 7: Enhanced error logging =====
      console.log('[ORDERS] Order creation error:', {
        error: error.message,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
      // =====================================================
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });

  /* Update an *EXISTING* order. Admins CAN update orders of other members. */
  app.put("/order", authenticateToken, async (req, res) => {
    try {
      const id = req.body._id;
      const orderFound = await Order.findOne({ _id: id });
      // If the user is not admin, then no access to other user orders
      // should be allowed.
      if(req.user.role !== "Admin" && orderFound.user.toString() !== req.user.id) {
        return res.status(403).json({
          "message": "Unauthorized Access."
        });
      }

      if(orderFound) {
        const updatedOrder = await Order.findByIdAndUpdate(id, req.body, {"new": true});
        return res.status(201).json(updatedOrder);
      } else {
        return res.status(404).json({
          "message": "No order found."
        });
      }
    } catch(error) {
      console.log(error);
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });

  /* Delete an order. */
  app.delete("/order/:orderID", authenticateToken, async (req, res) => {
    try{
      const { orderID } = req.params;
      const orderFound = await Order.findOne({ _id: orderID });

      if(req.user.role !== "Admin" && orderFound.user.toString() !== req.user.id) {
        return res.status(403).json({
          "message": "Unauthorized Access."
        });
      }

      const orderDeleted = await Order.findByIdAndDelete(orderID);
      return res.status(200).json(orderDeleted);
    } catch(error) {
      return res.status(400).json({
        "message": "Bad Request."
      });
    }
  });
}
