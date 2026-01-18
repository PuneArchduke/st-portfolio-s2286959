# LO1: Requirements Analysis and Testing Strategies

## 1.1 Range of Requirements

This food ordering system provides user authentication, role-based access control, and order management functionality. The requirements are categorized into functional, performance, security, and quality attributes as recommended by ISO/IEC/IEEE 29119-1.

### Functional Requirements

**FR1: User Registration and Authentication**
- Description: Users must register with email and password, then authenticate using JWT tokens
- Stakeholders: End users, system administrators
- Priority: High (critical for system access)

**FR2: Role-Based Access Control**
- Description: System distinguishes between Admin and User roles with different permissions
- Admin: Can view all orders, manage all users
- User: Can only view and manage their own orders
- Stakeholders: Administrators, regular users, security team
- Priority: High (security requirement)

**FR3: Order Placement**
- Description: Users can place orders containing Box1 or Box2 items
- Order must include: user ID, items (Box1/Box2), quantities
- System validates order completeness before acceptance
- Stakeholders: Users, restaurant managers
- Priority: High (core business function)

**FR4: Order Retrieval**
- Description: Users can retrieve their order history
- Admins can retrieve all orders in the system
- Stakeholders: Users, administrators, customer service
- Priority: Medium

**FR5: User Management**
- Description: Admins can view all registered users
- Users can view their own profile
- Stakeholders: Administrators, users
- Priority: Medium

### Performance Requirements

**PR1: API Response Time**
- Description: API endpoints should respond within 500ms under normal load
- Measurement: 95th percentile response time
- Stakeholders: Users, system administrators
- Priority: High
- Test approach: Use Artillery load testing tool

**PR2: Concurrent User Support**
- Description: System should handle at least 50 concurrent users without degradation
- Measurement: Throughput and error rate under concurrent load
- Stakeholders: System administrators, business stakeholders
- Priority: Medium
- Test approach: Artillery concurrent connection testing

### Security Requirements

**SR1: Password Encryption**
- Description: User passwords must be encrypted using Bcrypt before storage
- Never store passwords in plain text
- Stakeholders: Users, security team, compliance officers
- Priority: Critical
- Test approach: Code review + unit testing

**SR2: JWT Token Authentication**
- Description: All protected endpoints must validate JWT tokens
- Tokens should expire after 24 hours
- Invalid tokens should be rejected with 401 status
- Stakeholders: Users, security team
- Priority: Critical
- Test approach: Integration testing

**SR3: NoSQL Injection Prevention**
- Description: All database queries must sanitize user input
- Prevent MongoDB injection attacks
- Stakeholders: Security team, database administrators
- Priority: High
- Test approach: Security testing with malicious input

**SR4: Authorization Enforcement**
- Description: Users should only access their own resources
- Admins should have elevated privileges
- Stakeholders: Users, security team
- Priority: High
- Test approach: Integration testing with different user roles

### Quality Attributes (Qualitative Requirements)

**QR1: Maintainability**
- Description: Code should follow consistent naming conventions and structure
- Functions should be well-documented
- Priority: Medium
- Test approach: Code review, static analysis

**QR2: Error Handling**
- Description: System should gracefully handle errors with meaningful messages
- Return appropriate HTTP status codes
- Priority: Medium
- Test approach: Negative testing

---

## 1.2 Level of Requirements

### System-Level Testing

**End-to-End User Flows:**
- Complete registration → login → order placement → order retrieval flow
- Admin workflow: login → view all orders → view all users
- Test environment: Integration with MongoDB, JWT authentication

**Approach:**
- Use Supertest for HTTP endpoint testing
- Test complete API request-response cycles
- Verify database state changes after operations

### Integration-Level Testing

**Module Interactions:**
1. **Authentication Middleware + Route Handlers**
   - Test JWT verification integrates correctly with protected routes
   - Verify 401 responses for invalid tokens
   - Test role-based access control enforcement

2. **Database Layer + Business Logic**
   - Test Mongoose models correctly interact with MongoDB
   - Verify data validation before database operations
   - Test query sanitization

3. **Order Service + User Service**
   - Test order creation links to correct user
   - Verify authorization checks work across services

**Approach:**
- Jest integration tests with test database
- Mock external dependencies where appropriate
- Test error propagation between layers

### Unit-Level Testing

**Individual Functions:**
1. **Authentication Functions**
   - Password hashing (Bcrypt)
   - JWT token generation
   - JWT token verification
   - Password comparison

2. **Validation Functions**
   - Email format validation
   - Order data validation
   - Input sanitization

3. **Database Operations**
   - User model methods
   - Order model methods
   - Query builders

**Approach:**
- Jest unit tests with mocked dependencies
- Test pure functions in isolation
- Focus on edge cases and boundary conditions

---

## 1.3 Test Approach Selection using Category-Partition Method

### Application of Category-Partition Testing (CAT)

Following the systematic approach from Pezze & Young Ch.11, I apply CAT to the order placement endpoint as an exemplar.

#### Step 1: Identify Independently Testable Features

**Feature: Order Placement (POST /api/orders)**

**Parameters:**
- userId (from JWT token)
- orderItems (array of Box1/Box2)
- quantities (number for each item)

**Environment Elements:**
- Authentication state (valid token, invalid token, no token)
- User role (User, Admin)
- Database state (user exists, user doesn't exist)

#### Step 2: Identify Categories and Values

**Parameter: orderItems**

*Category: Item Type*
- Valid values: ["Box1"], ["Box2"], ["Box1", "Box2"]
- Boundary: Empty array [] [error]
- Invalid: ["Box3"] [error], ["InvalidItem"] [error]

*Category: Quantity*
- Valid: 1, 5, 10 (normal range)
- Boundary: 0 [error], 100 (upper limit)
- Invalid: -1 [error], "abc" [error], null [error]

**Environment: Authentication**

*Category: JWT Token*
- Valid token (authenticated user)
- Expired token [error]
- Malformed token [error]
- Missing token [error]

*Category: User Role*
- Regular User
- Admin

**Environment: Database State**

*Category: User Existence*
- User exists in database
- User doesn't exist [error]

#### Step 3: Apply Constraints

**Error Constraint:**
- If any parameter has [error] value, generate only 1 test case for that combination
- Example: If token is invalid, don't test all order combinations

**Single Constraint:**
- Test malformed token only once [single]
- Test missing token only once [single]

#### Resulting Test Cases (Sample)

Without constraints: 3 × 4 × 4 × 2 × 2 = 192 potential combinations

With constraints: Reduced to approximately 18 core test cases:

1. Valid token + Valid user + Box1 × 1 → Success
2. Valid token + Valid user + Box2 × 5 → Success
3. Valid token + Valid user + Both boxes → Success
4. Valid token + Valid user + Empty items → Error 400
5. Valid token + Valid user + Quantity 0 → Error 400
6. Valid token + Valid user + Negative quantity → Error 400
7. Valid token + User doesn't exist → Error 404
8. Expired token + Any order → Error 401 [single]
9. Malformed token + Any order → Error 401 [single]
10. Missing token + Any order → Error 401 [single]
... (additional boundary cases)

### Test Techniques Mapping

| Requirement Type | Primary Technique | Secondary Technique | Rationale |
|-----------------|-------------------|---------------------|-----------|
| FR1 (Authentication) | Integration Testing | Unit Testing | Need to test middleware flow and database interaction |
| FR2 (RBAC) | Integration Testing | Category-Partition | Test role combinations systematically |
| FR3 (Orders) | Category-Partition | Boundary Value Analysis | Systematic coverage of input combinations |
| PR1 (Performance) | Artillery Load Testing | - | Measure actual response times under load |
| PR2 (Concurrency) | Artillery Stress Testing | - | Verify system behavior under concurrent requests |
| SR1 (Encryption) | Unit Testing | Code Review | Verify Bcrypt usage and no plain text storage |
| SR2 (JWT) | Integration Testing | Boundary Testing | Test token validation across all endpoints |
| SR3 (Injection) | Security Testing | Input Fuzzing | Test with malicious MongoDB query operators |
| SR4 (Authorization) | Integration Testing | Equivalence Partitioning | Test different user role combinations |

---

## 1.4 Assessment of Testing Approach Appropriateness

### Strengths

**1. Systematic Coverage through CAT**
The Category-Partition method provides systematic coverage of input combinations for the order placement endpoint. This ensures we test representative cases from each equivalence class without exhaustive testing. The constraint mechanism reduces test cases from 192 to 18 while maintaining adequate coverage.

**2. Multi-Level Testing Strategy**
The three-level approach (unit, integration, system) aligns with ISO/IEC/IEEE 29119-2 testing levels. Unit tests verify individual functions (e.g., password hashing), integration tests verify module interactions (e.g., authentication middleware + routes), and system tests verify end-to-end flows.

**3. Performance Validation**
Using Artillery for performance testing provides quantitative measurements (p95 response time, throughput) rather than subjective assessments. This directly addresses PR1 and PR2 requirements with measurable criteria.

**4. Security-First Approach**
Dedicated security requirements (SR1-SR4) with specific testing techniques (injection testing, authorization testing) address common web application vulnerabilities. The emphasis on JWT validation and password encryption is appropriate for an authentication-based system.

### Weaknesses and Gaps

**1. Limited Concurrency Testing**
While PR2 specifies concurrent user support, the planned testing doesn't include thorough race condition or deadlock testing. For example:
- What happens if two users simultaneously place orders?
- Are MongoDB transactions properly handled?
- Could concurrent updates corrupt data?

*Impact:* Medium - Could miss subtle concurrency bugs
*Mitigation:* Would require dedicated concurrency testing framework and test scenarios

**2. Incomplete Error Recovery Testing**
The approach doesn't adequately address:
- Database connection failures
- Network timeouts
- Partial failures (e.g., order created but notification fails)

*Impact:* High - Production systems must handle infrastructure failures
*Mitigation:* Would need chaos engineering approach or failure injection testing

**3. No Load Soak Testing**
Performance testing (PR1, PR2) focuses on immediate response but doesn't test:
- Long-running stability (e.g., 24-hour continuous operation)
- Memory leaks under sustained load
- Database connection pool exhaustion

*Impact:* Medium - Could miss gradual degradation issues
*Mitigation:* Requires extended test environment availability

**4. Limited Security Testing Scope**
Security testing (SR3) mentions injection prevention but doesn't cover:
- Rate limiting / DDoS protection
- Session hijacking scenarios
- CORS policy validation
- Password strength requirements

*Impact:* High - Security gaps could be exploited
*Mitigation:* Would require penetration testing and security audit

**5. Boundary Cases in CAT**
While CAT identifies main categories, some edge cases may be missed:
- Extremely large order quantities (e.g., 10,000 items)
- Unicode characters in text fields
- Special characters that could break JSON parsing

*Impact:* Low - Unlikely but possible input scenarios
*Mitigation:* Fuzz testing with random input generation

### Justification of Trade-offs

Given the academic context and time constraints (~100 hours total for the coursework):

**Prioritization Decision:**
1. **Core functional correctness** (FR1-FR5) → Highest priority
2. **Basic security** (SR1-SR4) → High priority  
3. **Performance baselines** (PR1-PR2) → Medium priority
4. **Advanced scenarios** (concurrency, fault tolerance) → Deferred

**Rationale:**
The selected approach provides a solid foundation for demonstrating testing competency while acknowledging realistic limitations. The focus on CAT methodology and multi-level testing showcases understanding of systematic testing principles. The identified gaps demonstrate critical thinking about testing limitations rather than claiming comprehensive coverage.

In a production environment, the deferred items (especially concurrency and fault tolerance) would require dedicated effort. However, for demonstrating academic learning outcomes, the chosen approach balances breadth of techniques with depth of application.

### Alignment with ISO/IEC/IEEE 29119 Standards

The approach aligns with ISO 29119-2 in:
- Identifying test basis (requirements FR1-SR4)
- Defining test model (CAT categories and values)
- Specifying test completion criteria (coverage targets, performance thresholds)

The weaknesses identified (concurrency, fault tolerance) would be addressed in a full ISO 29119-compliant test plan but are consciously deferred given project scope constraints.

---

## References

- Pezzè, M., & Young, M. (Updated) Chapter 11: Combinatorial Testing
- ISO/IEC/IEEE 29119-1: Software Testing Concepts and Definitions
- ISO/IEC/IEEE 29119-2: Test Processes
- Course Tutorial LO1: Requirements Analysis (2025/6)