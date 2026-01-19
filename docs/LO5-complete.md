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
// Line 23 - Current code:
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
**Recommendation:** Always use `===` for comparisons in JavaScript

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
**Recommendation:** Provide specific error messages:
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
**Recommendation:** Add express-rate-limit middleware:
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
**Recommendation:** Use async/await for consistency:
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
**Recommendation:** Standardize error response format:
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
**Recommendation:** Add input validation:
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
**Recommendation:** Use MongoDB transactions for critical operations:
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
**Recommendation:** Add pagination:
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
**Recommendation:** Add password validation:
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
**Recommendation:** Normalize email before storage:
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

### Pipeline Design

The project uses GitLab CI with a Docker-based pipeline defined in `.gitlab-ci.yml`:

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

### Pipeline Stages

**Stage 1: Prepare Images**
- Builds application Docker image from `Dockerfile`
- Builds test environment image from `TestDockerfile`
- Tags images for use in subsequent stages

**Stage 2: Setup Applications**
- Uses Docker Compose to orchestrate multi-container deployment
- Starts application container and MongoDB container
- Configures networking between containers

**Stage 3: Check Status**
- Inspects deployed container state
- Verifies services are running
- Provides diagnostic information

**Stage 4: Test**
- Runs test container connected to application network
- Executes `npm test` inside container
- Tests communicate with application and database

**Stage 5: Teardown**
- Stops and removes all containers
- Cleans up Docker network
- Runs regardless of test success/failure (`when: always`)

### Pipeline Configuration File

**Location:** `.gitlab-ci.yml`

```yaml
prepare_images:
  stage: prepare_images
  script:
    - docker build -t sample .
    - docker build -f TestDockerfile -t test .

setup_applications:
  stage: setup_applications
  script:
    - docker-compose -f docker-compose.yml up -d

check_status:
  stage: check_status
  script:
    - docker inspect sample

test:
  stage: test
  script:
    - docker run --network=st-sample_default test npm test

teardown_applications:
  stage: teardown_applications
  script:
    - docker-compose -f docker-compose.yml down
  when: always
```

### Design Strengths

1. **Multi-stage architecture** - Clear separation of concerns
2. **Docker-based testing** - Consistent, reproducible environment
3. **Infrastructure as code** - Pipeline version controlled
4. **Cleanup guarantee** - `when: always` ensures teardown

### Design Weaknesses

1. **No caching** - Rebuilds images every run
2. **No artifact collection** - Test results not preserved
3. **No health checks** - Race condition risk with database
4. **No coverage reporting** - Coverage not tracked in GitLab

---

## 5.3 Test Automation

### Automated Testing Integration

The pipeline automates the following testing activities:

**Unit Tests**
- Location: `__tests__/app/app.unit.test.js`
- 3 tests for system health and configuration
- Automated via `npm test`

**Integration Tests**
- Location: `__tests__/api/`
- 30 tests for API endpoints
- Tests authentication, authorization, CRUD operations

**Database Tests**
- Location: `__tests__/api/db.test.js`
- 9 tests for data operations
- Uses mongodb-memory-server for isolation

### Test Execution Command

```bash
npm run test:coverage
```

### Automated Coverage Collection

Coverage is collected using Istanbul/nyc:

```json
// .nycrc configuration
{
  "reporter": ["text", "html", "lcov"],
  "include": ["endpoints/**/*.js", "models/**/*.js"],
  "exclude": ["**/*.test.js"]
}
```

### Achieved Automation Level

| Aspect | Automated? | Tool |
|--------|------------|------|
| Unit tests | ✅ Yes | Jest |
| Integration tests | ✅ Yes | Jest + Supertest |
| Coverage collection | ✅ Yes | Istanbul/nyc |
| Coverage reporting | ⚠️ Local only | HTML report |
| Performance tests | ⚠️ Configured | Artillery (not executed) |
| Security scanning | ❌ No | - |

### Test Results (from local execution)

```
Test Suites: 4 passed, 4 total
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

### Pipeline Execution Evidence

**Pipeline ID:** #64547
**Repository:** https://git.ecdf.ed.ac.uk/s2286959/st-portfolio-s2286959
**Trigger:** Push to master branch

### Pipeline Status: "Stuck"

The pipeline was successfully triggered but shows "stuck" status:

**Visible Stages:**
1. prepare_images - Pending
2. setup_applications - Pending
3. check_status - Pending
4. test - Pending
5. teardown_applications - Pending

### Root Cause Analysis

**Issue:** No GitLab Runner with Docker capability available

The University of Edinburgh GitLab instance (git.ecdf.ed.ac.uk) has limited Docker-capable runners. The pipeline requires:
- Docker executor capability
- Access to Docker daemon (docker:dind service)
- Ability to build and run containers

### Workaround: Local Test Execution

Since CI could not execute, testing was performed locally:

**Environment:**
- Node.js v18.x
- MongoDB via mongodb-memory-server
- Windows development machine

**Execution:**
```bash
npm run test:coverage
```

**Results:** 42 tests passed, 79.22% coverage

### Evidence of Expected Pipeline Behavior

Based on pipeline configuration analysis, when a Docker-capable runner is available:

1. **prepare_images** would:
   - Build `sample` image (~30 seconds)
   - Build `test` image (~20 seconds)

2. **setup_applications** would:
   - Start MongoDB container
   - Start application container
   - Configure networking

3. **check_status** would:
   - Verify containers are running
   - Output container configuration

4. **test** would:
   - Execute 42 tests
   - Generate coverage report
   - Expected: All tests pass

5. **teardown_applications** would:
   - Stop all containers
   - Remove network
   - Clean up resources

### Alternative CI Configuration

A simpler pipeline that would work with standard runners:

```yaml
image: node:18

stages:
  - test

test:
  stage: test
  services:
    - mongo:6.0
  variables:
    DB_ENDPOINT: mongodb://mongo:27017/testdb
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Statements\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    paths:
      - coverage/
```

This alternative does not require Docker-in-Docker and would work with shared runners.

---

## 5.5 Summary and Evaluation

### Code Review (5.1)

| Criterion | Assessment |
|-----------|------------|
| Review criteria applied | ✅ 5 criteria: correctness, security, maintainability, error handling, performance |
| Code examined | ✅ auth.js, orders.js, users.js |
| Issues identified | ✅ 10 issues found (3 critical, 4 medium, 3 low) |
| Recommendations provided | ✅ Prioritized fix list with effort estimates |

### CI Pipeline (5.2-5.4)

| Criterion | Assessment |
|-----------|------------|
| Pipeline constructed | ✅ 5-stage Docker-based pipeline |
| Testing automated | ✅ 42 tests automated via npm |
| Coverage automated | ✅ Istanbul/nyc integration |
| Pipeline demonstration | ⚠️ Stuck due to runner unavailability; local execution as alternative |

### Lessons Learned

1. **Code review is valuable** - Found 3 critical security issues through manual review
2. **CI infrastructure matters** - Academic environments may have constraints
3. **Local testing is essential** - Cannot rely solely on CI
4. **Documentation is key** - Evidence collected despite pipeline issues

---

## References

- Pezzè, M., & Young, M. (Updated) Chapter 23: Automation
- Pezzè, M., & Young, M. (Updated) Chapter 24: Documentation
- GitLab CI/CD Documentation: https://docs.gitlab.com/ee/ci/
- Course Tutorial LO5: Reviews and CI/CD (2025/6)
- Repository: https://git.ecdf.ed.ac.uk/s2286959/st-portfolio-s2286959
