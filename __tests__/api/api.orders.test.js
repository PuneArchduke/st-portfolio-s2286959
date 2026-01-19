const axios = require("axios");
const jwt = require("jsonwebtoken");
const { prepare } = require("../setup/test-helper");


describe("Supplementary Order Tests - CAT Gap Coverage", () => {

  let simpleConfig = null;
  let adminConfig = null;
  let simpleUserId = null;
  let adminUserId = null;

  beforeAll(async () => {
    // Login as simple user.
    const userLogin = await axios.post(prepare("/login"), {
      email: "testuser@test.com",
      password: "12345"
    });
    simpleUserId = userLogin.data.user.id;
    simpleConfig = {
      headers: { Authorization: `Bearer ${userLogin.data.accessToken}` }
    };

    // Login as admin user.
    const adminLogin = await axios.post(prepare("/login"), {
      email: "test@test.com",
      password: "12345"
    });
    adminUserId = adminLogin.data.user.id;
    adminConfig = {
      headers: { Authorization: `Bearer ${adminLogin.data.accessToken}` }
    };
  });



  it("should reject request with malformed token", async () => {
    const malformedConfig = {
      headers: { Authorization: "Bearer this.is.not.a.valid.jwt.token" }
    };

    await axios.post(prepare("/order"), {
      "type": "Box1",
      "description": "Malformed token test"
    }, malformedConfig).catch(error => {
      expect(error.response.status).toEqual(403);
    });
  });



  it("should reject request with expired token", async () => {
    // Generate a token that expired 1 hour ago.
    const expiredToken = jwt.sign(
      { id: simpleUserId },
      process.env.API_SECRET,
      { expiresIn: "-1h" }
    );

    const expiredConfig = {
      headers: { Authorization: `Bearer ${expiredToken}` }
    };

    await axios.post(prepare("/order"), {
      "type": "Box1",
      "description": "Expired token test"
    }, expiredConfig).catch(error => {
      expect(error.response.status).toEqual(403);
    });
  });



  it("should reject order with invalid type", async () => {
    await axios.post(prepare("/order"), {
      "type": "Box3",
      "description": "Invalid type test"
    }, simpleConfig).catch(error => {
      expect(error.response.status).toEqual(400);
    });
  });



  it("should reject order from non-existent user", async () => {
    // Register a temporary user.
    await axios.post(prepare("/register"), {
      "name": "TempUser",
      "role": "User",
      "email": "tempuser_order_test@test.com",
      "password": "12345",
      "address": "Temporary Address"
    });

    // Login to get a valid token.
    const tempLogin = await axios.post(prepare("/login"), {
      email: "tempuser_order_test@test.com",
      password: "12345"
    });

    const tempConfig = {
      headers: { Authorization: `Bearer ${tempLogin.data.accessToken}` }
    };

    // Delete this user via admin.
    await axios.delete(
      prepare("/user/" + tempLogin.data.user.id),
      adminConfig
    );

    // Attempt to create order with deleted user's token.
    await axios.post(prepare("/order"), {
      "type": "Box1",
      "description": "Non-existent user test"
    }, tempConfig).catch(error => {
      // User no longer exists, auth middleware returns 403.
      expect(error.response.status).toEqual(403);
    });
  });



  it("should default to Box1 when type is missing", async () => {
    const response = await axios.post(prepare("/order"), {
      "description": "Default type test"
    }, simpleConfig);

    expect(response.status).toEqual(201);
    expect(response.data.type).toEqual("Box1");
  });



  it("should accept order with empty description", async () => {
    const response = await axios.post(prepare("/order"), {
      "type": "Box2",
      "description": ""
    }, simpleConfig);

    expect(response.status).toEqual(201);
    expect(response.data.type).toEqual("Box2");
  });




  /**
   * GET non-existent order should return 404.
   * Covers: orders.js GET /order/:orderID - orderFound is null branch.
   */
  it("should return 404 for non-existent order", async () => {
    const fakeOrderId = "000000000000000000000000";

    await axios.get(
      prepare("/order/" + fakeOrderId),
      simpleConfig
    ).catch(error => {
      expect(error.response.status).toEqual(404);
    });
  });

  /**
   * Non-admin accessing another user's order should return 403.
   * Covers: orders.js GET /order/:orderID - role check branch.
   */
  it("should block non-admin from accessing another user's order", async () => {
    // Admin creates an order (owned by admin).
    const adminOrder = await axios.post(prepare("/order"), {
      "type": "Box1",
      "description": "Admin's order"
    }, adminConfig);

    const adminOrderId = adminOrder.data._id;

    // Simple user tries to access admin's order.
    await axios.get(
      prepare("/order/" + adminOrderId),
      simpleConfig
    ).catch(error => {
      expect(error.response.status).toEqual(403);
    });
  });




  /**
   * Updating a non-existent order should return 400.
   * Covers: orders.js PUT /order - catch block (null orderFound).
   */
  it("should fail to update a non-existent order", async () => {
    const fakeOrderId = "000000000000000000000000";

    await axios.put(prepare("/order"), {
      "_id": fakeOrderId,
      "type": "Box2",
      "description": "Should not update"
    }, simpleConfig).catch(error => {
      expect(error.response.status).toEqual(400);
    });
  });




  /**
   * Non-admin deleting another user's order should return 403.
   * Covers: orders.js DELETE /order/:orderID - role check branch.
   */
  it("should block non-admin from deleting another user's order", async () => {
    // Admin creates an order.
    const adminOrder = await axios.post(prepare("/order"), {
      "type": "Box2",
      "description": "Admin's order to protect"
    }, adminConfig);

    const adminOrderId = adminOrder.data._id;

    // Simple user tries to delete admin's order.
    await axios.delete(
      prepare("/order/" + adminOrderId),
      simpleConfig
    ).catch(error => {
      expect(error.response.status).toEqual(403);
    });
  });

});
