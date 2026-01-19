# LO5: Reviews, Inspections, and Automated Testing Processes

## 5.1 Code Review and Inspection

This section identifies and applies review criteria to selected parts of the code, identifying issues and potential improvements.

### Review Methodology

Following established code review practices, I examined critical code modules using these criteria:
1. **Correctness** - Does the code do what it's supposed to do?
2. **Security** - Are there potential vulnerabilities?
3. **Maintainability** - Is the code readable and well-structured?
4. **Error Handling** - Are errors handled appropriately?
5. **Performance** - Are there obvious inefficiencies?

### Code Review: endpoints/auth.js

**File Purpose:** JWT authentication middleware for protecting API endpoints.

#### Review Findings

**Issue 1: Use of Loose Equality (==) Instead of Strict Equality (===)**

```javascript
// Current code:
if (token == null){
  return res.sendStatus(401);
}

// Recommended fix:
if (token === null || token === undefined){
  return res.sendStatus(401);
}
```

**Severity:** Medium
**Impact:** Could lead to unexpected type coercion bugs

---

**Issue 2: No Token Expiration Validation Feedback**

```javascript
// Current: Generic error for all JWT failures
if (error) {
  return res.status(403).send({"message": "Unauthorized access."});
}
```

**Problem:** Client cannot distinguish between expired token vs malformed token
**Severity:** Low
**Recommendation:** Provide specific error messages for different JWT failure modes.

```javascript
if (error.name === 'TokenExpiredError') {
  return res.status(401).send({"message": "Token expired. Please login again."});
} else if (error.name === 'JsonWebTokenError') {
  return res.status(403).send({"message": "Invalid token."});
}
```

---

**Issue 3: Missing Rate Limiting**

**Problem:** No protection against brute force authentication attempts
**Severity:** High (Security)
**Recommendation:** Add express-rate-limit middleware.

```javascript
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});
app.use('/login', authLimiter);
```

---

**Issue 4: Synchronous Database Query in Async Context**

```javascript
// Current code uses .then() callback
User.findOne({_id: user.id}).then(userFound => {
  // ...
});
```

**Problem:** Mixing callback style with modern async patterns
**Severity:** Low (Maintainability)
**Recommendation:** Use async/await for consistency.

```javascript
const authenticateToken = async (req, res, next) => {
  try {
    const userFound = await User.findOne({_id: user.id});
    if (!userFound) {
      return res.status(403).send({"message": "Unauthorized access."});
    }
    // ...
  } catch (error) {
    return res.status(500).send({"message": "Internal server error."});
  }
};
```

---

### Code Review: endpoints/orders.js

**File Purpose:** Order management API endpoints (CRUD operations).

#### Review Findings

**Issue 5: Inconsistent Error Response Format**

```javascript
// Some endpoints return:
return res.status(400).json({"message": "Bad Request."});

// Others return:
return res.status(403).json({"message": "Unauthorized Access."});
```

**Problem:** Inconsistent capitalization and punctuation in error messages
**Severity:** Low (Maintainability)
**Recommendation:** Standardize error response format.

```javascript
const ErrorResponses = {
  BAD_REQUEST: { message: "Bad request", code: "BAD_REQUEST" },
  UNAUTHORIZED: { message: "Unauthorized access", code: "UNAUTHORIZED" },
  NOT_FOUND: { message: "Resource not found", code: "NOT_FOUND" }
};
```

---

**Issue 6: No Input Validation for Order Data**

```javascript
// Current code - directly uses req.body without validation
const newOrder = new Order({
  user: req.user.id,
  items: req.body.items,  // No validation!
  // ...
});
```

**Problem:** Missing validation for order items (Box1/Box2), quantities
**Severity:** High (Security & Correctness)
**Recommendation:** Add input validation before creating orders.

```javascript
const validateOrderInput = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "Items must be a non-empty array" };
  }
  for (const item of items) {
    if (!['Box1', 'Box2'].includes(item.type)) {
      return { valid: false, error: `Invalid item type: ${item.type}` };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { valid: false, error: "Quantity must be a positive integer" };
    }
  }
  return { valid: true };
};
```

---

**Issue 7: Missing Transaction for Order Operations**

```javascript
// Current: No transaction wrapper
const newOrder = new Order({...});
await newOrder.save();
```

**Problem:** If save fails partially, database could be in inconsistent state
**Severity:** Medium
**Recommendation:** Use MongoDB transactions for critical operations.

```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await newOrder.save({ session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

**Issue 8: No Pagination for Order Listing**

```javascript
// Current: Returns all orders
const allOrders = await Order.find({user: userID});
```

**Problem:** Could return thousands of records, causing performance issues
**Severity:** Medium (Performance)
**Recommendation:** Add pagination with skip/limit.

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

const allOrders = await Order.find({user: userID})
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });
```

---

### Code Review: endpoints/users.js

#### Review Findings

**Issue 9: Password Not Validated for Strength**

```javascript
// Current: Only checks if password exists
if (!req.body.password) {
  return res.status(400).json({...});
}
```

**Problem:** No minimum length, complexity requirements
**Severity:** High (Security)
**Recommendation:** Add password validation (min 8 chars, uppercase, number).

```javascript
const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null; // valid
};
```

---

**Issue 10: Email Not Normalized**

```javascript
// Current: Email stored as-is
const newUser = new User({
  email: req.body.email,  // "User@Example.COM" stored differently from "user@example.com"
  // ...
});
```

**Problem:** Same email with different casing could create duplicate accounts
**Severity:** Medium
**Recommendation:** Normalize email before storage (toLowerCase, trim).

```javascript
const normalizedEmail = req.body.email.toLowerCase().trim();
```

---

### Code Review Summary

| File | Issues Found | Critical | Medium | Low |
|------|-------------|----------|--------|-----|
| auth.js | 4 | 1 (rate limiting) | 1 | 2 |
| orders.js | 4 | 1 (input validation) | 2 | 1 |
| users.js | 2 | 1 (password strength) | 1 | 0 |
| **Total** | **10** | **3** | **4** | **3** |

### Recommendations Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Add input validation (orders) | 2 hrs | High |
| 2 | Add rate limiting (auth) | 1 hr | High |
| 3 | Add password validation | 1 hr | High |
| 4 | Use strict equality | 30 min | Medium |
| 5 | Normalize emails | 30 min | Medium |
| 6 | Add pagination | 2 hrs | Medium |
| 7 | Standardize error format | 1 hr | Low |
| 8 | Use async/await consistently | 1 hr | Low |

---

## 5.2 CI/CD Pipeline Construction

### Pipeline Overview

The project uses **two CI/CD configurations**:
1. **GitLab CI** (original) - Docker-based pipeline, unable to run due to runner limitations
2. **GitHub Actions** (primary) - Successfully configured and executed

### GitHub Actions Pipeline (Primary)

**File:** `.github/workflows/ci.yml`

```yaml
name: Software Testing CI Pipeline

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Create .env file
        run: |
          echo "MONGO_URI=mongodb://localhost:27017/foodshop_test" >> .env
          echo "JWT_SECRET=test_jwt_secret_key_for_ci" >> .env
          echo "NODE_ENV=test" >> .env
          echo "PORT=3000" >> .env

      - name: Start server in background
        run: |
          node server.js &
          sleep 5

      - name: Run tests
        run: npm test

      - name: Generate coverage report
        run: npx nyc --reporter=html --reporter=text npm test

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 30
```

### Pipeline Stages

| Stage | Description | Duration |
|-------|-------------|----------|
| Set up job | Initialize runner and environment | ~1s |
| Initialize containers | Start MongoDB service container | ~11s |
| Checkout code | Clone repository | ~1s |
| Setup Node.js | Install Node.js v18 | ~4s |
| Install dependencies | npm install | ~17s |
| Create .env file | Configure environment | <1s |
| Start server | Launch application in background | ~5s |
| Run tests | Execute 42 test cases | ~3s |
| Generate coverage | Create coverage report | ~3s |
| Upload artifacts | Store coverage report | ~1s |
| **Total** | | **~54 seconds** |

### Design Strengths

1. **Service containers** - MongoDB runs as a service, no Docker-in-Docker needed
2. **Artifact preservation** - Coverage reports saved for 30 days
3. **Manual trigger** - workflow_dispatch allows manual execution
4. **Modern actions** - Uses v4 of checkout, setup-node, and upload-artifact

### GitLab CI Pipeline (Secondary)

**File:** `.gitlab-ci.yml`

The GitLab pipeline was originally configured but could not execute due to Docker-in-Docker limitations on the University's shared runners.

```yaml
image: docker:latest

services:
  - node
  - mongo
  - docker:dind

stages:
  - prepare_images
  - setup_applications
  - check_status
  - test
  - teardown_applications
```

**Status:** Pipeline #64547 stuck - no available runners with Docker capability.

---

## 5.3 Test Automation

### Automated Testing Integration

The pipeline automates the following testing activities:

**Test Suite Structure:**
```
__tests__/
├── api/
│   ├── api.users-generic.test.js  (12 tests)
│   ├── api.users-simple.test.js   (10 tests)
│   └── api.users-admin.test.js    (7 tests)
├── app/
│   ├── app.unit.test.js           (3 tests)
│   └── app.performance.test.js    (3 tests)
└── db/
    └── db.test.js                 (7 tests)

Total: 42 tests
```

### Test Execution Command

```bash
npm test
```

### Automated Coverage Collection

Coverage is collected using Istanbul/nyc:

```json
// package.json scripts
{
  "test": "jest --coverage",
  "test:coverage": "nyc --reporter=html --reporter=text npm test"
}
```

### Achieved Automation Level

| Aspect | Automated? | Tool |
|--------|------------|------|
| Unit tests | Yes | Jest |
| Integration tests | Yes | Jest + Supertest |
| Coverage collection | Yes | Istanbul/nyc |
| Coverage reporting | Yes | HTML + LCOV |
| CI trigger on push | Yes | GitHub Actions |
| Artifact preservation | Yes | 30-day retention |

### Test Results (from CI execution)

```
Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Time:        8.234s

Coverage Summary:
- Statements: 79.22%
- Branches: 66.66%
- Functions: 90.9%
- Lines: 79.22%
```

---

## 5.4 CI Pipeline Demonstration

### GitHub Actions Execution Evidence

**Repository:** https://github.com/PuneArchduke/st-portfolio-s2286959
**Workflow:** Software Testing CI Pipeline
**Run #4:** Success

### Execution Timeline

| Step | Status | Duration |
|------|--------|----------|
| Set up job | ✅ | 1s |
| Initialize containers | ✅ | 11s |
| Checkout code | ✅ | 1s |
| Setup Node.js | ✅ | 4s |
| Install dependencies | ✅ | 17s |
| Create .env file | ✅ | <1s |
| Start server | ✅ | 5s |
| Run tests | ✅ | 3s |
| Generate coverage | ✅ | 3s |
| Upload coverage report | ✅ | 1s |
| Post actions | ✅ | 8s |
| **Total** | **✅** | **~54s** |

### Pipeline Output

```
Run npm test

> food-shop-api@1.0.0 test
> jest --coverage

PASS __tests__/app/app.unit.test.js
PASS __tests__/app/app.performance.test.js
PASS __tests__/db/db.test.js
PASS __tests__/api/api.users-generic.test.js
PASS __tests__/api/api.users-simple.test.js
PASS __tests__/api/api.users-admin.test.js

Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        8.234s
```

### Artifacts Generated

| Artifact | Description | Retention |
|----------|-------------|-----------|
| coverage-report | HTML coverage report with line-by-line analysis | 30 days |

### Evidence Links

- **Repository:** https://github.com/PuneArchduke/st-portfolio-s2286959
- **Actions Tab:** https://github.com/PuneArchduke/st-portfolio-s2286959/actions
- **Workflow File:** `.github/workflows/ci.yml`

---

## 5.5 Summary and Evaluation

### Code Review (5.1)

| Criterion | Assessment |
|-----------|------------|
| Review criteria applied | 5 criteria: correctness, security, maintainability, error handling, performance |
| Code examined | auth.js, orders.js, users.js |
| Issues identified | 10 issues found (3 critical, 4 medium, 3 low) |
| Recommendations provided | Prioritized fix list with effort estimates |

### CI Pipeline (5.2-5.4)

| Criterion | Assessment |
|-----------|------------|
| Pipeline constructed | GitHub Actions with MongoDB service container |
| Testing automated | 42 tests automated via Jest |
| Coverage automated | Istanbul/nyc integration with artifact upload |
| Pipeline demonstration | Run #4 successful in 54 seconds |

### Key Achievements

1. **Successful CI Implementation** - GitHub Actions pipeline runs all 42 tests with coverage
2. **Fast Execution** - Complete pipeline finishes in ~54 seconds
3. **Artifact Preservation** - Coverage reports stored for 30 days
4. **Code Quality Insights** - 10 issues identified through systematic code review

### Lessons Learned

1. **Code review is valuable** - Found 3 critical security issues through manual review
2. **CI infrastructure matters** - GitHub Actions proved more accessible than GitLab CI for this use case
3. **Service containers simplify setup** - No Docker-in-Docker complexity needed
4. **Documentation is key** - Evidence collected demonstrates both process and results

---
