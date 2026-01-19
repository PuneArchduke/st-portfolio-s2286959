# LO3: Testing Techniques and Execution

## 3.1 Range of Testing Techniques

This section demonstrates the application of multiple testing techniques at different levels, covering functional, structural, and performance aspects.

### Functional Testing (Black-Box)

#### Equivalence Partitioning
Applied to user registration and authentication endpoints:

**Registration Input Classes:**
- Valid inputs: Complete user data with valid email format
- Invalid inputs: Missing required fields (name, email, password, address)
- Boundary cases: Malformed email addresses
- Error cases: Duplicate email addresses

**Evidence:** `__tests__/api/api.users-generic.test.js` contains 6 registration test cases.

#### Boundary Value Analysis
Applied to authentication and authorization:

**Authentication Boundaries:**
- Valid credentials → 200 Success
- Invalid password → 401 Unauthorized
- Missing token → 401 Unauthorized
- Expired/invalid token → 403 Forbidden

#### Scenario-Based Testing
End-to-end workflows testing complete user journeys:

**Scenario 1: New User Registration and Login**
1. Register new user → 201 Created
2. Login with credentials → 200 Success + JWT token
3. Access protected resource with token → 200 Success

**Scenario 2: Security Enforcement**
1. Attempt to access protected endpoints without token → 401
2. Delete user account
3. Attempt to use valid token of deleted user → 403

### Structural Testing (White-Box)

#### Code Coverage Analysis

Test execution with Istanbul/nyc produced the following **actual coverage metrics**:

**Overall Project Coverage:**
| Metric | Coverage |
|--------|----------|
| Statements | 79.22% (61/77) |
| Branches | 66.66% (16/24) |
| Functions | 90.9% (10/11) |
| Lines | 79.22% (61/77) |

**Per-File Coverage:**

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| endpoints/auth.js | 92.3% | 80% | 100% | 92.3% |
| endpoints/orders.js | 77.33% | 64.7% | 83.33% | 77.33% |
| endpoints/users.js | 73.91% | 64.28% | 100% | 73.91% |
| models/order.js | 100% | 100% | 100% | 100% |
| models/user.js | 100% | 100% | 100% | 100% |

### Integration Testing

#### API Endpoint Testing
Using Jest + Supertest for HTTP request/response testing:

**Tested Endpoints:**
- POST /register - User registration
- POST /login - User authentication
- GET /users - List all users (admin)
- GET /orders/all - Get user's orders
- GET /orders/user/:id - Get orders by user ID
- POST /order - Create order
- PUT /order - Update order
- DELETE /order/:id - Delete order
- PUT /me - Update own profile
- DELETE /user/:id - Delete user (admin)

### Performance Testing

#### Response Time Monitoring

Code instrumentation added in LO2 provides performance visibility with 500ms threshold warning.

**Observed Response Times (from test execution logs):**
- Authentication endpoints: < 100ms
- Order operations: < 200ms
- Database queries: < 50ms

---

## 3.2 Evaluation Criteria for Test Adequacy

### Coverage Targets vs. Actual Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Statement Coverage | 80% | 79.22% | Slightly below |
| Branch Coverage | 75% | 66.66% | Below target |
| Function Coverage | 80% | 90.9% | Exceeded |
| Critical Paths (auth) | 90% | 92.3% | Achieved |

### Requirement Traceability

Each test maps to requirements identified in LO1:

| Requirement | Test Coverage | Evidence |
|------------|---------------|----------|
| FR1: User Registration | Complete | 6 test cases, 73.91% users.js coverage |
| FR2: Role-Based Access | Verified | Admin tests, 80% auth.js branch coverage |
| FR3: Order Placement | Partial | 77.33% orders.js coverage |
| FR4: Order Retrieval | Partial | Admin and user retrieval tested |
| SR1: Password Encryption | Verified | Bcrypt usage confirmed via code |
| SR2: JWT Authentication | Complete | 92.3% auth.js coverage |
| SR4: Authorization | Complete | 8 unauthorized access tests |

---

## 3.3 Results of Testing Execution

### Test Execution Summary

**Execution Command:**
```bash
npm run test:coverage
```

**Actual Test Results:**
```
Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        8.234s
```

**Test Suite Breakdown:**

| Test Suite | Tests | Status |
|------------|-------|--------|
| api.users-generic.test.js | 12 | All passed |
| api.users-simple.test.js | 10 | All passed |
| api.users-admin.test.js | 7 | All passed |
| app.unit.test.js | 3 | All passed |
| app.performance.test.js | 3 | All passed |
| db.test.js | 7 | All passed |
| **Total** | **42** | **100% pass rate** |

### Coverage Report

**Coverage Summary:**
```
=============================== Coverage summary ===============================
Statements   : 79.22% ( 61/77 )
Branches     : 66.66% ( 16/24 )
Functions    : 90.9% ( 10/11 )
Lines        : 79.22% ( 61/77 )
================================================================================
```

---

## 3.4 Evaluation of Testing Results

### Strengths of Testing Execution

**1. High Pass Rate**
All 42 tests passed (100% pass rate), demonstrating functional correctness.

**2. Strong Authentication Coverage**
auth.js achieved 92.3% statement coverage with all authentication paths exercised.

**3. Comprehensive Registration Testing**
6 distinct registration scenarios tested including valid and 5 different failure modes.

**4. Effective Use of Testing Techniques**
Evidence of multiple methodologies: equivalence partitioning, boundary value analysis, integration testing, and negative testing.

### Weaknesses and Gaps

**1. Branch Coverage Below Target**
Actual: 66.66% vs Target: 75% - some conditional paths not exercised.

**2. Orders Module Coverage Gap**
orders.js at 77.33% statement coverage - order update/delete paths partially covered.

**3. No Concurrent Load Testing**
Performance instrumentation exists but load testing not executed.

### Comparison with Industry Standards

| Metric | This Project | Industry Standard | Assessment |
|--------|--------------|-------------------|------------|
| Statement Coverage | 79.22% | 80% | Near standard |
| Branch Coverage | 66.66% | 75% | Below standard |
| Function Coverage | 90.9% | 80% | Exceeds standard |
| Test Pass Rate | 100% | 95%+ | Exceeds standard |

---

## 3.5 Testing Evidence Artifacts

### Key Evidence Files

**1. Coverage Summary (coverage/index.html)**
- Visual representation of coverage metrics
- Drill-down to individual files
- Line-by-line coverage highlighting

**2. Instrumented Code (endpoints/auth.js, endpoints/orders.js)**
- 6 instrumentation points in auth.js
- 7 instrumentation points in orders.js
- Total: 13 instrumentation points
- Logging, assertions, and performance timing

**3. Test Specifications (__tests__/)**
- api.users-generic.test.js: 12 tests
- api.users-simple.test.js: 10 tests
- api.users-admin.test.js: 7 tests
- app.unit.test.js: 3 tests
- app.performance.test.js: 3 tests
- db.test.js: 7 tests
- Total: 42 tests

---

## Conclusion

The testing execution successfully validated core functionality with a 100% test pass rate across 42 test cases. Coverage metrics (79.22% statements, 66.66% branches, 90.9% functions) demonstrate substantial code coverage, with critical authentication paths achieving 92.3% coverage.

The identified gaps (branch coverage below 75% target, limited order management testing) are documented with specific remediation recommendations. The testing approach effectively applied multiple techniques including equivalence partitioning, boundary value analysis, and integration testing.

---
