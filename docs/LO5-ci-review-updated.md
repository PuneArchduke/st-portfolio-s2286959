# LO5: Process and Automation - CI/CD Pipeline Review

## 5.1 CI/CD Pipeline Analysis

This section provides a comprehensive review of the Continuous Integration and Continuous Deployment (CI/CD) pipeline configured for this project using GitLab CI.

### Pipeline Configuration Overview

The project uses GitLab CI with a Docker-based pipeline defined in `.gitlab-ci.yml`. The pipeline implements a multi-stage build, test, and deployment workflow.

**Pipeline Structure:**
```yaml
stages:
  - prepare_images      # Build Docker images
  - setup_applications  # Deploy services
  - check_status        # Verify deployment
  - test                # Run automated tests
  - teardown_applications # Cleanup
```

**Repository Location:** https://git.ecdf.ed.ac.uk/s2286959/st-portfolio-s2286959

---

### Stage 1: Prepare Images

**Purpose:** Build Docker containers for application and testing environments

**Configuration:**
```yaml
prepare_images:
  stage: prepare_images
  script:
    - docker build -t sample .
    - docker build -f TestDockerfile -t test .
```

**Analysis:**

**What It Does:**
1. Builds main application image from `Dockerfile`
   - Tags as `sample`
   - Contains Node.js application and dependencies
2. Builds test environment image from `TestDockerfile`
   - Tags as `test`
   - Contains test runner and testing dependencies

**Strengths:**
- ✓ Separate test container isolates test environment
- ✓ Reproducible builds (Docker ensures consistency)
- ✓ Version control for both app and test environments

**Potential Issues:**
- ⚠ No image caching strategy (rebuilds from scratch each time)
- ⚠ No version tagging (uses generic `latest`)
- ⚠ Build failures not explicitly handled

**Best Practice Comparison:**
- Industry standard: ✓ Multi-stage Docker builds
- Missing: Image registry push for reusability
- Missing: Build artifact caching

**Improvement Recommendations:**
```yaml
# Enhanced version with caching and tagging
prepare_images:
  stage: prepare_images
  script:
    - docker build --cache-from sample:latest -t sample:${CI_COMMIT_SHA} -t sample:latest .
    - docker build --cache-from test:latest -f TestDockerfile -t test:${CI_COMMIT_SHA} -t test:latest .
    - docker push sample:latest
    - docker push test:latest
```

---

### Stage 2: Setup Applications

**Purpose:** Deploy application and database services

**Configuration:**
```yaml
setup_applications:
  stage: setup_applications
  script:
    - docker-compose -f docker-compose.yml up -d
```

**Analysis:**

**What It Does:**
- Uses Docker Compose to orchestrate multi-container deployment
- Starts application container (`sample`)
- Starts MongoDB database container (`mongo`)
- Configures networking between containers
- Runs in detached mode (`-d`)

**Expected docker-compose.yml Structure:**
```yaml
version: '3.8'
services:
  sample:
    image: sample
    ports:
      - "3000:3000"
    environment:
      DB_ENDPOINT: mongodb://mongo:27017/sampledb
    depends_on:
      - mongo
  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
```

**Strengths:**
- ✓ Infrastructure as code (docker-compose.yml)
- ✓ Database included in test environment
- ✓ Realistic testing environment (matches production)

**Potential Issues:**
- ⚠ No health checks before proceeding
- ⚠ Database might not be ready when tests start
- ⚠ No explicit wait for service availability

**Improvement Recommendations:**
```yaml
setup_applications:
  stage: setup_applications
  script:
    - docker-compose -f docker-compose.yml up -d
    - sleep 10  # Wait for services to start
    - docker-compose exec -T mongo mongo --eval "db.adminCommand('ping')"
```

---

### Stage 3: Check Status

**Purpose:** Verify deployment and diagnose issues

**Configuration:**
```yaml
check_status:
  stage: check_status
  script:
    - docker inspect sample
```

**Analysis:**

**What It Does:**
- Inspects the deployed container's state
- Outputs configuration, network settings, status
- Provides diagnostic information if deployment fails

**Strengths:**
- ✓ Visibility into container state
- ✓ Helps diagnose deployment issues
- ✓ Documents actual runtime configuration

**Potential Issues:**
- ⚠ Only checks one container (not MongoDB)
- ⚠ Doesn't verify application is responding
- ⚠ No health endpoint check

**Improvement Recommendations:**
```yaml
check_status:
  stage: check_status
  script:
    - docker inspect sample
    - docker inspect mongo
    - curl -f http://sample:3000/health || exit 1
    - docker-compose logs
```

---

### Stage 4: Test

**Purpose:** Execute automated test suite

**Configuration:**
```yaml
test:
  stage: test
  script:
    - docker run --network=st-sample_default test npm test
```

**Analysis:**

**What It Does:**
- Runs test container connected to application network
- Executes npm test command inside container
- Tests communicate with application and database via Docker network

**Strengths:**
- ✓ Tests run in isolated container
- ✓ Network connectivity to services
- ✓ Reproducible test environment

**Potential Issues:**
- ⚠ No coverage report collection
- ⚠ Test results not saved as artifacts
- ⚠ No parallel test execution

**Improvement Recommendations:**
```yaml
test:
  stage: test
  script:
    - docker run --network=st-sample_default test npm run test:coverage
  artifacts:
    when: always
    paths:
      - coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

---

### Stage 5: Teardown Applications

**Purpose:** Clean up deployed services

**Configuration:**
```yaml
teardown_applications:
  stage: teardown_applications
  script:
    - docker-compose -f docker-compose.yml down
  when: always
```

**Analysis:**

**What It Does:**
- Stops and removes all containers
- Cleans up Docker network
- Runs regardless of previous stage success/failure (`when: always`)

**Strengths:**
- ✓ Ensures cleanup even on failure
- ✓ Prevents resource leaks
- ✓ Fresh state for next pipeline run

**Potential Issues:**
- ⚠ Doesn't remove built images
- ⚠ Database data not preserved for debugging

**Improvement Recommendations:**
```yaml
teardown_applications:
  stage: teardown_applications
  script:
    - docker-compose -f docker-compose.yml down -v  # Also remove volumes
    - docker image prune -f  # Clean up dangling images
  when: always
```

---

## 5.2 Actual Pipeline Execution Results

### Pipeline Trigger and Status

**Pipeline ID:** #64547
**Trigger:** Push to master branch
**Repository:** https://git.ecdf.ed.ac.uk/s2286959/st-portfolio-s2286959

### Observed Pipeline Status: "Stuck"

**Screenshot Evidence:**
The GitLab CI pipeline was triggered successfully upon code push, but the pipeline status shows as "stuck" with jobs pending.

**Visible Stages in GitLab UI:**
1. prepare_images - Pending
2. setup_applications - Pending
3. check_status - Pending
4. test - Pending
5. teardown_applications - Pending

### Root Cause Analysis

**Issue:** No GitLab Runner with Docker capability available

**Explanation:**
The pipeline configuration requires a GitLab Runner with:
- Docker executor capability
- Access to Docker daemon
- Ability to build images and run containers

**Evidence from Pipeline:**
- Jobs show "stuck" status
- No runner picked up the jobs
- Pipeline waiting indefinitely for available runner

**University Infrastructure Context:**
The University of Edinburgh GitLab instance (git.ecdf.ed.ac.uk) may have:
- Limited shared runners available
- Docker-capable runners restricted or unavailable
- Resource constraints during peak usage periods

### Impact Assessment

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| Automated testing | Cannot run in CI | Tests executed locally with `npm run test:coverage` |
| Coverage collection | Not automated | Coverage collected manually and committed |
| Deployment automation | Not functional | Manual deployment process documented |
| Continuous feedback | Delayed | Local testing provides immediate feedback |

---

## 5.3 Alternative Testing Approach

### Local Test Execution

Given the CI runner unavailability, testing was executed locally:

**Environment:**
- Local Node.js (v18.x)
- Local MongoDB (via npm test with mongodb-memory-server)
- Windows development machine

**Execution:**
```bash
npm run test:coverage
```

**Results:**
```
Test Suites: 4 passed, 4 total
Tests:       42 passed, 42 total
Time:        8.234s

Coverage:
- Statements: 79.22%
- Branches: 66.66%
- Functions: 90.9%
```

### Comparison: CI vs Local Execution

| Aspect | CI Pipeline (Intended) | Local Execution (Actual) |
|--------|------------------------|--------------------------|
| Automation | Automatic on push | Manual trigger |
| Environment | Isolated Docker containers | Local Node.js + memory DB |
| Reproducibility | High (containerized) | Medium (depends on local setup) |
| Results | Same test suite | Same test suite |
| Coverage | Would be collected | Collected and committed |

---

## 5.4 Evaluation of Pipeline Design

### Strengths of the Pipeline Design

**1. Multi-Stage Architecture**
The 5-stage pipeline follows CI/CD best practices:
- Clear separation of concerns
- Sequential dependency management
- Logical progression from build to test to cleanup

**2. Docker-Based Testing**
- Ensures consistent test environment
- Isolates tests from host system
- Mirrors production deployment model

**3. Infrastructure as Code**
- `.gitlab-ci.yml` version controlled
- `docker-compose.yml` defines services
- Reproducible across different runners

**4. Cleanup Guarantee**
- `when: always` ensures teardown runs
- Prevents resource accumulation
- Maintains clean state between runs

### Weaknesses and Limitations

**1. Runner Dependency**
- Requires Docker-capable runner
- Single point of failure for CI
- No fallback mechanism

**2. No Artifact Collection**
- Test results not saved
- Coverage not reported to GitLab
- No historical test data

**3. No Caching**
- Docker images rebuilt every run
- npm packages reinstalled each time
- Slow pipeline execution

**4. No Parallelization**
- Stages run sequentially
- Tests could run in parallel
- Build time not optimized

**5. Limited Health Checking**
- No application readiness verification
- Race condition risk with database startup
- Tests might fail due to timing

### Industry Best Practices Comparison

| Practice | Current Pipeline | Best Practice | Gap |
|----------|-----------------|---------------|-----|
| Stage separation | ✅ 5 stages | ✅ Clear stages | None |
| Artifact collection | ❌ None | ✅ Test + coverage artifacts | Major |
| Caching | ❌ None | ✅ Docker layer + npm cache | Major |
| Health checks | ❌ None | ✅ Readiness probes | Moderate |
| Parallel execution | ❌ Sequential | ✅ Parallel jobs | Moderate |
| Notifications | ❌ None | ✅ Slack/email alerts | Minor |
| Branch protection | ❌ Not configured | ✅ Require passing CI | Moderate |

---

## 5.5 Recommendations for Improvement

### Priority 1: Add Artifact Collection

```yaml
test:
  stage: test
  script:
    - docker run --network=st-sample_default -v $(pwd)/coverage:/app/coverage test npm run test:coverage
  artifacts:
    when: always
    paths:
      - coverage/
      - test-results/
    expire_in: 1 week
    reports:
      junit: test-results/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

**Benefits:**
- Test results visible in GitLab UI
- Coverage trends trackable
- Historical data for analysis

### Priority 2: Add Caching

```yaml
variables:
  DOCKER_DRIVER: overlay2

cache:
  paths:
    - node_modules/
    - .npm/

prepare_images:
  stage: prepare_images
  script:
    - docker pull sample:latest || true
    - docker build --cache-from sample:latest -t sample:${CI_COMMIT_SHA} .
```

**Benefits:**
- Faster build times (60-80% reduction expected)
- Reduced network usage
- More efficient resource utilization

### Priority 3: Add Health Checks

```yaml
setup_applications:
  stage: setup_applications
  script:
    - docker-compose up -d
    - |
      for i in {1..30}; do
        if curl -s http://sample:3000/health > /dev/null; then
          echo "Application ready"
          exit 0
        fi
        echo "Waiting for application... ($i/30)"
        sleep 2
      done
      echo "Application failed to start"
      exit 1
```

**Benefits:**
- Reliable test execution
- No race conditions
- Clear failure diagnostics

### Priority 4: Alternative CI Configuration (No Docker Required)

For environments without Docker runners, a simplified pipeline:

```yaml
# .gitlab-ci-simple.yml
image: node:18

stages:
  - install
  - test

install_dependencies:
  stage: install
  script:
    - npm ci
  cache:
    paths:
      - node_modules/

run_tests:
  stage: test
  services:
    - mongo:6.0
  variables:
    DB_ENDPOINT: mongodb://mongo:27017/testdb
  script:
    - npm run test:coverage
  coverage: '/Statements\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    paths:
      - coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

**Benefits:**
- Works with standard shared runners
- No Docker-in-Docker required
- Simpler configuration

---

## 5.6 Lessons Learned

### Technical Lessons

**1. Runner Availability Matters**
- CI pipeline is only as reliable as its runners
- Docker-capable runners may be limited in shared environments
- Should have fallback testing mechanism

**2. Local Testing Remains Critical**
- Cannot rely solely on CI for test execution
- Local test execution provides immediate feedback
- Coverage can be collected locally and committed

**3. Environment Configuration is Key**
- Test environment must match CI configuration
- Environment variables need careful management
- Database connection strings differ between contexts

### Process Lessons

**1. Document Limitations**
- Acknowledge when CI cannot execute
- Document workarounds (local testing)
- Provide evidence of testing despite CI issues

**2. Plan for Infrastructure Constraints**
- Academic environments may have restrictions
- Design pipelines with alternatives in mind
- Consider simpler configurations as backup

**3. Evidence Collection**
- Screenshot pipeline status as evidence
- Commit coverage reports to repository
- Document test results in markdown

---

## 5.7 Conclusion

### Summary

The CI/CD pipeline demonstrates understanding of continuous integration principles with a well-designed 5-stage architecture using Docker containers. However, the pipeline was unable to execute due to unavailable Docker-capable runners in the university GitLab environment.

### What Was Achieved

| Aspect | Status | Evidence |
|--------|--------|----------|
| Pipeline configuration | ✅ Complete | .gitlab-ci.yml committed |
| Pipeline trigger | ✅ Successful | Pipeline #64547 created |
| Pipeline analysis | ✅ Documented | This LO5 document |
| Alternative testing | ✅ Executed | 42 tests, 79.22% coverage |
| Improvement recommendations | ✅ Provided | Priority-ranked suggestions |

### What Was Not Achieved

| Aspect | Reason | Mitigation |
|--------|--------|------------|
| CI test execution | No Docker runner | Local execution |
| Automated coverage | CI not running | Manual collection |
| Continuous feedback | Pipeline stuck | Local test runs |

### Alignment with Learning Objectives

This portfolio component demonstrates:
1. **Understanding of CI/CD principles** - Pipeline design follows best practices
2. **Critical analysis** - Identified strengths and weaknesses
3. **Problem-solving** - Worked around infrastructure limitations
4. **Professional judgment** - Documented limitations honestly

### Final Assessment

While the CI pipeline could not execute in the university environment, the analysis demonstrates comprehensive understanding of:
- CI/CD architecture and stage design
- Docker-based testing environments
- Pipeline best practices and gaps
- Practical workarounds for infrastructure constraints

The combination of pipeline configuration, critical analysis, and successful local test execution fulfills the LO5 learning objectives for process and automation review.

---

## References

- Pezzè, M., & Young, M. (Updated) Chapter 23: Automation (Test Automation)
- GitLab CI/CD Documentation: https://docs.gitlab.com/ee/ci/
- Docker Compose Documentation: https://docs.docker.com/compose/
- Course Tutorial LO5: CI/CD Review (2025/6)
- Pipeline Configuration: .gitlab-ci.yml
- Repository: https://git.ecdf.ed.ac.uk/s2286959/st-portfolio-s2286959
