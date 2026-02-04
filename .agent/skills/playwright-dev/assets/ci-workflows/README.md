# Playwright CI/CD Workflow Templates

Production-ready CI/CD workflow templates for running Playwright tests with parallelization and reporting.

## Available Templates

### 1. GitHub Actions (`github-actions.yml`)

**Features:**

- Test execution with 3-way sharding for parallel runs
- Blob report generation and merging
- HTML report upload as artifacts
- Optional GitHub Pages deployment for reports
- Automatic browser installation

**Setup:**

```bash
# Copy to your repository
mkdir -p .github/workflows
cp github-actions.yml .github/workflows/playwright.yml
```

**Configuration:**

- Adjust `shardTotal` in the matrix to change parallelization (default: 3)
- Enable GitHub Pages in repository settings for report deployment
- Modify retention days for artifacts as needed

---

### 2. GitLab CI (`gitlab-ci.yml`)

**Features:**

- Parallel test execution (3 jobs by default)
- Docker image: `mcr.microsoft.com/playwright:v1.49.0-jammy`
- Caching for node_modules and Playwright browsers
- Manual deployment to GitLab Pages
- Browser-specific test jobs (optional)
- Nightly test scheduling support

**Setup:**

```bash
# Copy to your repository root
cp gitlab-ci.yml .gitlab-ci.yml
```

**Configuration:**

- Change `parallel: 3` to adjust the number of shards
- Update Playwright Docker image version as needed
- Uncomment browser-specific jobs if needed
- Set up GitLab Pages in repository settings

---

### 3. Azure Pipelines (`azure-pipelines.yml`)

**Features:**

- Multi-stage pipeline (Test → Merge → Deploy)
- Parallel test execution with sharding
- JUnit test results integration
- Optional Azure Blob Storage deployment
- Optional Azure Static Web Apps deployment
- Browser-specific test templates (commented)

**Setup:**

```bash
# Copy to your repository root
cp assets/ci-workflows/azure-pipelines.yml azure-pipelines.yml
```

**Configuration:**

- Adjust `strategy.parallel` for different parallelization
- Configure Azure Blob Storage or Static Web Apps deployment
- Set up environment variables in Azure DevOps
- Create service connections for Azure deployments

---

## Common Configuration

### Adjusting Parallelization

**GitHub Actions:**

```yaml
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4, 5] # 5 shards
    shardTotal: [5]
```

**GitLab CI:**

```yaml
test:
  parallel: 5 # 5 parallel jobs
```

**Azure Pipelines:**

```yaml
strategy:
  parallel: 5 # 5 parallel jobs
```

### Playwright Configuration

Ensure your `playwright.config.ts` has blob reporter configured:

```typescript
export default defineConfig({
  reporter: [
    ["blob"], // Required for CI sharding
    ["html", { open: "never" }],
  ],
  // ...
});
```

### Browser Installation

All templates include automatic browser installation. For specific browsers only:

```bash
# Install specific browsers
npx playwright install chromium firefox
npx playwright install --with-deps chromium
```

---

## Troubleshooting

### GitHub Actions

**Issue:** Blob reports not merging

- Ensure all shards complete (check artifacts)
- Verify blob-report directory exists after test runs

**Issue:** GitHub Pages not deploying

- Enable GitHub Pages in repository settings
- Check required permissions are granted to workflow

### GitLab CI

**Issue:** Docker image pull failures

- Use a local registry mirror
- Pin to a specific Playwright version

**Issue:** Cache not working

- Verify cache key matches your package manager
- Check runner storage availability

### Azure Pipelines

**Issue:** Artifacts not downloading

- Verify artifact names match between stages
- Check artifact retention policy

**Issue:** Test results not appearing

- Ensure JUnit XML files are generated
- Verify test results path pattern

---

## Best Practices

1. **Version Control:** Pin Playwright version in package.json
2. **Retries:** Configure test retries in playwright.config.ts
3. **Timeouts:** Set appropriate job timeouts (default: 60 minutes)
4. **Artifacts:** Keep blob reports short-lived (1 day), HTML reports longer (14-30 days)
5. **Caching:** Cache node_modules and Playwright browsers
6. **Notifications:** Set up failure notifications in CI platform
7. **Scheduled Runs:** Run full test suite nightly on main branch

---

## Advanced Features

### Running Specific Browsers

Add environment variables to run specific browser projects:

**GitHub Actions:**

```yaml
- run: npx playwright test --project=chromium
```

**GitLab CI:**

```yaml
script:
  - npx playwright test --project=$TEST_BROWSER
```

**Azure Pipelines:**

```yaml
- script: npx playwright test --project=$(BROWSER)
```

### Test Reporting Services

Integrate with third-party reporting:

```bash
# Playwright Cloud (preview)
npx playwright test --reporter=blob,@playwright/test-reporter-cloud

# Currents (currents.dev)
npx playwright test --reporter=blob,@currents/playwright

# Argos (argos-ci.com)
npx playwright test --reporter=blob,@argos-ci/playwright
```

---

## Resources

- [Playwright CI Documentation](https://playwright.dev/docs/ci)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
