# LO2: Test Plan and Code Instrumentation

## 2.1 Construction of the Test Plan

### Test-Driven Development Approach

This project adopts a Test-Driven Development (TDD) methodology as recommended in Pezzè & Young Ch.20 and the course materials. TDD ensures that tests are written before implementation code, making tests serve as executable specifications.

### TDD Workflow

The testing approach follows this iterative cycle:

1. **Write Test First** → Define expected behavior
2. **Run Test (Fails)** → Verify test catches missing functionality
3. **Write Minimal Code** → Implement just enough to pass
4. **Run Test (Passes)** → Verify implementation works
5. **Refactor** → Improve code quality while maintaining passing tests
6. **Repeat** → Move to next requirement

### Test Plan Evolution

The test plan evolved alongside development requirements identified in LO1:

#### Phase 1: Authentication Foundation
**Initial Requirements:**
- FR1: User registration
- FR2: JWT token generation
- SR1: Password encryption

**Initial Tests:**
```
__tests__/api/api.users-generic.test.js
- Test user registration with valid data
- Test password is hashed (not stored plain text)
- Test JWT token is generated on login
```

**Rationale:** Authentication is foundational - all other features depend on it. Testing this first ensures a secure base.

#### Phase 2: Authorization & Role Management
**Requirements Added:**
- FR2: Role-based access control
- SR4: Authorization enforcement

**Tests Extended:**
```
__tests__/api/api.users-admin.test.js
- Test admin can view all users
- Test regular user cannot view all users (403 error)
- Test admin can view all orders
```

**Evolution:** After basic authentication worked, we added role differentiation. Tests verify that roles properly restrict access.

#### Phase 3: Order Management
**Requirements Added:**
- FR3: Order placement
- FR4: Order retrieval

**Tests Extended:**
```
__tests__/api/ (admin and simple test suites)
- Test order creation with valid data
- Test order retrieval by user
- Test admin order management
```

#### Phase 4: Complete Test Suite
**Final Test Suite Structure:**
```
__tests__/
├── api/
│   ├── api.users-generic.test.js  (12 tests) - Registration, login, auth
│   ├── api.users-simple.test.js   (10 tests) - Regular user operations
│   └── api.users-admin.test.js    (7 tests)  - Admin operations
├── app/
│   ├── app.unit.test.js           (3 tests)  - Unit tests
│   └── app.performance.test.js    (3 tests)  - Performance tests
└── db/
    └── db.test.js                 (7 tests)  - Database tests

Total: 42 tests
```

### Test Plan Structure by Requirement Level

Following ISO/IEC/IEEE 29119-2, tests are organized by level:

#### Unit Tests
**Location:** `__tests__/app/app.unit.test.js`
**Coverage:** Individual functions in isolation
**Tests:** 3 tests for system health and configuration

#### Integration Tests
**Location:** `__tests__/api/`
**Coverage:** Module interactions, API endpoints
**Tests:** 29 tests across registration, authentication, authorization (12 + 10 + 7)

#### Performance Tests
**Location:** `__tests__/app/app.performance.test.js`
**Coverage:** Response time measurement
**Tests:** 3 tests for performance validation

#### Database Tests
**Location:** `__tests__/db/db.test.js`
**Coverage:** Database operations and model validation
**Tests:** 7 tests for data persistence and retrieval

### Test Execution Results

**Actual Results from Test Execution:**
```
Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        8.234s
```

---

## 2.2 Evaluation of Test Plan Quality

### Strengths of the Test Plan

**1. Systematic Requirement Coverage**
The plan directly maps to requirements identified in LO1:
- All 5 functional requirements (FR1-FR5) have dedicated test scenarios
- Security requirements (SR1-SR4) are tested at appropriate levels
- 42 tests achieving 100% pass rate

**2. Multi-Level Testing Strategy**
Tests span unit, integration, performance, and database levels:
- Unit tests: 3 tests for system health
- Integration tests: 29 tests for API endpoints
- Performance tests: 3 tests for timing validation
- Database tests: 7 tests for data operations

**3. Actual Coverage Metrics**
Test execution produced measurable coverage:
- Statement: 79.22%
- Branch: 66.66%
- Functions: 90.9%
- Critical auth path: 92.3%

**4. Automated Execution**
All tests automated via npm scripts and CI pipeline:
- `npm test` - Run all tests
- `npm run test:coverage` - Run with coverage
- GitHub Actions pipeline triggers on commit

### Weaknesses and Gaps

**1. Branch Coverage Below Target**
*Issue:* 66.66% branch coverage vs 75% target
*Impact:* Some conditional paths not exercised
*Mitigation:* Additional tests targeting uncovered branches

**2. Limited Order Management Coverage**
*Issue:* orders.js at 77.33% statement coverage
*Impact:* User order workflows less validated
*Mitigation:* Dedicated order test suite needed

**3. No Concurrency Testing**
*Issue:* Tests run sequentially
*Impact:* Race conditions not detected
*Mitigation:* Would need concurrent testing tools

### Assessment Against Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Pass Rate | 95%+ | 100% | Exceeded |
| Statement Coverage | 80% | 79.22% | Near target |
| Branch Coverage | 75% | 66.66% | Below target |
| Function Coverage | 80% | 90.9% | Exceeded |

---

## 2.3 Instrumentation of the Code

Code instrumentation provides visibility into program behavior during testing. This section documents the **actual instrumentation** added to critical code paths.

### Instrumentation Strategy

Following Pezzè & Young Ch.17 on scaffolding and instrumentation, I added:
1. **Assertion checks** - Validate preconditions and invariants
2. **Diagnostic logging** - Capture execution flow and state
3. **Performance timing** - Measure operation duration
4. **Error context** - Enhance error messages with debugging information

### Instrumentation Summary

**Total: 13 instrumentation points (auth.js: 6, orders.js: 7)**

---

### auth.js Instrumentation (6 points)

#### Instrumentation 1: Import Assert Module
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 1: Import assert module =====
const assert = require('assert');
// ===================================================
```

**Purpose:** Import Node.js assert module for runtime validation of critical conditions.

---

#### Instrumentation 2: Authentication Attempt Logging
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 2: Log authentication attempt =====
console.log('[AUTH] Authentication attempt:', {
  path: req.path,
  method: req.method,
  hasAuthHeader: !!req.headers['authorization'],
  timestamp: new Date().toISOString()
});
// ==========================================================
```

**Purpose:** Log every authentication attempt with context for debugging and audit.

---

#### Instrumentation 3: Missing Token Handling
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 3: Log missing token =====
console.log('[AUTH] Authentication failed: No token provided');
// ================================================
```

**Purpose:** Log when requests arrive without authentication token.

---

#### Instrumentation 4: JWT Verification Error Logging
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 4: Enhanced error logging =====
console.log('[AUTH] JWT verification failed:', {
  error: error.message,
  errorType: error.name,
  timestamp: new Date().toISOString()
});
// =====================================================
```

**Purpose:** Capture detailed JWT verification failures with error type and message.

---

#### Instrumentation 5: User Not Found Logging
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 5: Log user not found =====
console.log('[AUTH] User not found in database:', {
  userId: user.id,
  timestamp: new Date().toISOString()
});
// =================================================
```

**Purpose:** Log cases where JWT is valid but user no longer exists in database.

---

#### Instrumentation 6: Assertion and Success Logging
**File:** `endpoints/auth.js`

```javascript
// ===== INSTRUMENTATION 6: Assert and success logging =====
assert(userFound.role, 'User must have a role');
console.log('[AUTH] Authentication successful:', {
  userId: user.id,
  role: userFound.role,
  timestamp: new Date().toISOString()
});
// =========================================================
```

**Purpose:** Assert user has a role (invariant check) and log successful authentication.

---

### orders.js Instrumentation (7 points)

#### Instrumentation 1: Import Assert Module
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 1: Import assert module =====
const assert = require('assert');
// ===================================================
```

**Purpose:** Import Node.js assert module for runtime validation.

---

#### Instrumentation 2: Admin Permission Check Logging
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 2: Log permission check =====
console.log('[ORDERS] Admin access check:', {
  userId: req.user.id,
  userRole: req.user.role,
  requestedUserID: req.params.userID,
  endpoint: '/orders/user/:userID',
  timestamp: new Date().toISOString()
});
// ===================================================
```

**Purpose:** Log authorization checks for admin-only operations.

---

#### Instrumentation 3: Permission Denied Logging
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 3: Log permission denied =====
console.log('[ORDERS] Access denied: Not admin');
// ====================================================
```

**Purpose:** Log when non-admin users attempt admin operations.

---

#### Instrumentation 4: Order Creation with Performance Timing
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 4: Log order creation and performance timing =====
const startTime = Date.now();
console.log('[ORDERS] Creating new order:', {
  userId: req.user.id,
  orderData: req.body,
  timestamp: new Date().toISOString()
});
console.log('[ORDERS] Order validation passed');
// ========================================================================
```

**Purpose:** Log incoming order requests and start performance timing.

---

#### Instrumentation 5: Order Creation Success and Performance
**File:** `endpoints/orders.js`

```javascript
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
```

**Purpose:** Log successful order creation with performance measurement and 500ms threshold warning.

---

#### Instrumentation 6: User Not Found Error
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 6: Log user not found error =====
console.log('[ORDERS] Order creation failed: User does not exist:', {
  userId: req.user.id,
  timestamp: new Date().toISOString()
});
// =======================================================
```

**Purpose:** Log when order creation fails because user doesn't exist.

---

#### Instrumentation 7: Enhanced Error Logging
**File:** `endpoints/orders.js`

```javascript
// ===== INSTRUMENTATION 7: Enhanced error logging =====
console.log('[ORDERS] Order creation error:', {
  error: error.message,
  userId: req.user.id,
  timestamp: new Date().toISOString()
});
// =====================================================
```

**Purpose:** Log detailed error context when order creation fails.

---

### Instrumentation Summary Table

| # | File | Type | Purpose | Testing Value |
|---|------|------|---------|---------------|
| 1 | auth.js | Import | Assert module | Runtime validation |
| 2 | auth.js | Log | Auth attempt | Audit & debug |
| 3 | auth.js | Log | Missing token | 401 validation |
| 4 | auth.js | Log | JWT error | Error diagnosis |
| 5 | auth.js | Log | User not found | Orphan token test |
| 6 | auth.js | Assert+Log | Success | Invariant + audit |
| 7 | orders.js | Import | Assert module | Runtime validation |
| 8 | orders.js | Log | Admin check | RBAC validation |
| 9 | orders.js | Log | Permission denied | 403 validation |
| 10 | orders.js | Timing+Log | Order creation start | Performance timing |
| 11 | orders.js | Timing+Log | Order success | PR1 performance |
| 12 | orders.js | Log | User not found | Error handling |
| 13 | orders.js | Log | Error handling | Error diagnosis |

---

## 2.4 Evaluation of the Instrumentation

### Effectiveness Assessment

**Strengths:**

**1. Comprehensive Coverage of Critical Paths**
- All 6 instrumentation points in auth.js cover the complete authentication flow
- All 7 instrumentation points in orders.js cover key business operations
- Both success and failure paths are instrumented

**2. Structured Logging Format**
All logs follow consistent JSON format:
```javascript
console.log('[MODULE] Description:', {
  key1: value1,
  key2: value2,
  timestamp: new Date().toISOString()
});
```
Benefits:
- Machine-parseable for log analysis
- Consistent format across modules
- Timestamp for correlation

**3. Performance Monitoring**
- Order creation timing implemented
- 500ms threshold warning (PR1 requirement)
- Duration tracked even for failures

**4. Security Audit Trail**
- All authentication attempts logged
- Authorization decisions recorded
- Failed access attempts captured

**5. Assertion-Based Validation**
```javascript
assert(userFound.role, 'User must have a role');
```
- Validates data integrity at runtime
- Fails fast on invariant violations
- Documents expected conditions

### Weaknesses and Limitations

**1. No Environment-Based Toggling**
Current: All logging always active
Better approach: Use environment variable to control logging

**2. No Log Level Differentiation**
Current: All logs use console.log/console.error
Better approach: Use logging library with levels (DEBUG, INFO, WARN, ERROR)

**3. Assert in Production Code**
Current: assert() throws and crashes on failure
Better approach: Defensive error handling for production

**4. No Centralized Log Configuration**
Current: Logging scattered across files
Better approach: Centralized logger module with configuration

### Recommendations for Improvement

**If Time Permits:**
1. Implement Winston or Pino logging library
2. Add log levels (DEBUG for development, ERROR for production)
3. Add environment-based log configuration
4. Convert assert() to defensive error handling

**For Production:**
1. Remove or guard assert() statements
2. Integrate with log aggregation (ELK, CloudWatch)
3. Add request ID for distributed tracing
4. Implement log rotation and retention policy

---
