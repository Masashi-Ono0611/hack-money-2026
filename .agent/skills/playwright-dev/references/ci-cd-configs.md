# CI/CD Configuration Examples

Comprehensive CI/CD configuration examples for running Playwright tests in various continuous integration environments.

## Table of Contents

- [GitHub Actions](#github-actions)
  - [Basic Setup](#basic-setup)
  - [Parallel Execution](#parallel-execution)
  - [Sharding](#sharding)
  - [Multiple Browsers](#multiple-browsers)
  - [Caching](#caching)
  - [Artifact Upload](#artifact-upload)
- [GitLab CI](#gitlab-ci)
  - [Basic Setup](#gitlab-basic-setup)
  - [Parallel Jobs](#gitlab-parallel-jobs)
  - [Caching Dependencies](#gitlab-caching)
  - [Artifacts](#gitlab-artifacts)
- [CircleCI](#circleci)
  - [Basic Configuration](#circleci-basic)
  - [Parallelism](#circleci-parallelism)
  - [Caching](#circleci-caching)
- [Azure Pipelines](#azure-pipelines)
  - [Basic Pipeline](#azure-basic)
  - [Matrix Strategy](#azure-matrix)
  - [Caching](#azure-caching)

---

## GitHub Actions

### Basic Setup

```yaml
name: Playwright Tests
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Parallel Execution

```yaml
name: Playwright Tests (Parallel)
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.shardIndex }}_${{ matrix.shardTotal }}
          path: playwright-report/
          retention-days: 30
```

### Sharding

```yaml
name: Playwright Tests (Advanced Sharding)
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}/8
        env:
          CI: true

      - name: Upload blob report to GitHub Actions Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download blob reports from GitHub Actions Artifacts
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into HTML Report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report--attempt-${{ github.run_attempt }}
          path: playwright-report
          retention-days: 14
```

### Multiple Browsers

```yaml
name: Playwright Tests (Multi-Browser)
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run Playwright tests on ${{ matrix.browser }}
        run: npx playwright test --project=${{ matrix.browser }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
```

### Caching

```yaml
name: Playwright Tests (With Caching)
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Cache Playwright Browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install Playwright System Dependencies
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Artifact Upload

```yaml
name: Playwright Tests (Complete Artifacts)
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test
        continue-on-error: true

      - name: Upload HTML Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 30

      - name: Upload Traces
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/**/*.zip
          retention-days: 30
```

---

## GitLab CI

### GitLab Basic Setup

```yaml
image: mcr.microsoft.com/playwright:v1.40.0-focal

stages:
  - test

playwright-tests:
  stage: test
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

### GitLab Parallel Jobs

```yaml
image: mcr.microsoft.com/playwright:v1.40.0-focal

stages:
  - test
  - merge

.playwright-base:
  stage: test
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - blob-report/
    expire_in: 1 day
  parallel: 4

playwright-tests:
  extends: .playwright-base

merge-reports:
  stage: merge
  needs:
    - playwright-tests
  script:
    - npm ci
    - npx playwright merge-reports --reporter html ./blob-report
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

### GitLab Caching

```yaml
image: mcr.microsoft.com/playwright:v1.40.0-focal

cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
    - ~/.cache/ms-playwright/

stages:
  - test

playwright-tests:
  stage: test
  before_script:
    - npm ci
  script:
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 1 week
```

### GitLab Artifacts

```yaml
image: mcr.microsoft.com/playwright:v1.40.0-focal

stages:
  - test

playwright-tests:
  stage: test
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    name: "playwright-results-$CI_COMMIT_REF_SLUG"
    paths:
      - playwright-report/
      - test-results/
    reports:
      junit: test-results/junit.xml
    expire_in: 30 days
```

---

## CircleCI

### CircleCI Basic

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  test:
    docker:
      - image: mcr.microsoft.com/playwright:v1.40.0-focal
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Run Playwright tests
          command: npx playwright test
      - store_artifacts:
          path: playwright-report
      - store_test_results:
          path: test-results

workflows:
  test-workflow:
    jobs:
      - test
```

### CircleCI Parallelism

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  test:
    docker:
      - image: mcr.microsoft.com/playwright:v1.40.0-focal
    parallelism: 4
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Run Playwright tests
          command: |
            SHARD="$((${CIRCLE_NODE_INDEX}+1))"
            npx playwright test --shard=${SHARD}/${CIRCLE_NODE_TOTAL}
      - store_artifacts:
          path: playwright-report
      - store_test_results:
          path: test-results

workflows:
  test-workflow:
    jobs:
      - test
```

### CircleCI Caching

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  test:
    docker:
      - image: mcr.microsoft.com/playwright:v1.40.0-focal
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-dependencies-{{ checksum "package-lock.json" }}
            - v1-dependencies-
      - run:
          name: Install dependencies
          command: npm ci
      - save_cache:
          paths:
            - node_modules
            - ~/.cache/ms-playwright
          key: v1-dependencies-{{ checksum "package-lock.json" }}
      - run:
          name: Run Playwright tests
          command: npx playwright test
      - store_artifacts:
          path: playwright-report
          destination: playwright-report
      - store_test_results:
          path: test-results

workflows:
  test-workflow:
    jobs:
      - test
```

---

## Azure Pipelines

### Azure Basic

```yaml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps
    displayName: 'Install Playwright browsers'

  - script: npx playwright test
    displayName: 'Run Playwright tests'

  - task: PublishTestResults@2
    displayName: 'Publish test results'
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/junit.xml'
      failTaskOnFailedTests: true
    condition: succeededOrFailed()

  - task: PublishPipelineArtifact@1
    displayName: 'Publish HTML report'
    inputs:
      targetPath: playwright-report
      artifact: 'playwright-report'
      publishLocation: 'pipeline'
    condition: succeededOrFailed()
```

### Azure Matrix

```yaml
trigger:
  - main

strategy:
  matrix:
    chromium:
      browserType: 'chromium'
    firefox:
      browserType: 'firefox'
    webkit:
      browserType: 'webkit'

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps $(browserType)
    displayName: 'Install Playwright browsers'

  - script: npx playwright test --project=$(browserType)
    displayName: 'Run Playwright tests on $(browserType)'

  - task: PublishPipelineArtifact@1
    displayName: 'Publish report for $(browserType)'
    inputs:
      targetPath: playwright-report
      artifact: 'playwright-report-$(browserType)'
      publishLocation: 'pipeline'
    condition: succeededOrFailed()
```

### Azure Caching

```yaml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - task: Cache@2
    inputs:
      key: 'npm | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        npm | "$(Agent.OS)"
      path: node_modules
    displayName: 'Cache node_modules'

  - task: Cache@2
    inputs:
      key: 'playwright | "$(Agent.OS)" | package-lock.json'
      restoreKeys: |
        playwright | "$(Agent.OS)"
      path: $(HOME)/.cache/ms-playwright
    displayName: 'Cache Playwright browsers'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps
    displayName: 'Install Playwright browsers'

  - script: npx playwright test
    displayName: 'Run Playwright tests'

  - task: PublishTestResults@2
    displayName: 'Publish test results'
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/junit.xml'
    condition: succeededOrFailed()

  - task: PublishPipelineArtifact@1
    displayName: 'Publish HTML report'
    inputs:
      targetPath: playwright-report
      artifact: 'playwright-report'
      publishLocation: 'pipeline'
    condition: succeededOrFailed()
```

---

## Best Practices

### General CI/CD Tips

1. **Use Official Docker Images**: Use `mcr.microsoft.com/playwright` images for consistent environments
2. **Cache Wisely**: Cache `node_modules` and Playwright browsers to speed up builds
3. **Parallelize Tests**: Use sharding for faster test execution
4. **Upload Artifacts Conditionally**: Always upload reports, but only upload traces on failure
5. **Set Timeouts**: Configure reasonable timeouts to prevent hung jobs
6. **Use Retry Logic**: Configure retries for flaky tests in playwright.config.ts
7. **Environment Variables**: Use CI environment variables to adjust test behavior
8. **Merge Reports**: When sharding, merge blob reports for a unified HTML report

### Security Considerations

- Store sensitive data in CI secrets/variables
- Use `${{ secrets.SECRET_NAME }}` in GitHub Actions
- Use masked variables in GitLab CI
- Never commit credentials to configuration files

### Performance Optimization

- Use `--workers=1` or `--workers=2` on CI to avoid resource contention
- Install only required browsers with `--with-deps chromium`
- Use `--reporter=blob` for sharded runs, then merge
- Consider Docker layer caching for faster image builds
