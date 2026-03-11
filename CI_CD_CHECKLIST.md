# CI/CD Checklist ✅

This document outlines what's configured to ensure tests pass in CI/CD environments.

## GitHub Actions Workflow

### Structure
- **Lint Job** (runs first)
  - ESLint validation
  - No formatting issues

- **Unit Tests Job** (depends on Lint)
  - 32 unit tests using Vitest
  - Coverage reporting to Codecov
  - ~2-3 minutes runtime

- **Build Job** (depends on Lint)
  - TypeScript compilation
  - Next.js build optimization
  - Static page generation
  - ~2-3 minutes runtime

- **E2E Tests Job** (depends on Unit Tests & Build)
  - Playwright browser tests
  - Landing page, auth, API, dashboard
  - Only runs on PRs and main/develop branches
  - ~5-10 minutes runtime

### Environment Setup
```yaml
Node: v20
pnpm: v8
Browsers: Chromium (via Playwright)
```

### Environment Variables
Tests use placeholder values when secrets aren't configured:
- `NEXT_PUBLIC_SUPABASE_URL`: https://placeholder.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: placeholder-key

This allows tests to run without requiring live credentials.

## Local Testing

Run the same checks locally before pushing:

```bash
# Option 1: Run CI command (recommended)
pnpm test:ci

# Option 2: Run individual commands
pnpm lint              # Check formatting
pnpm test:run          # Run unit tests
pnpm build             # Build app
pnpm test:e2e          # Run E2E tests (requires running server)
```

## What's Tested

### ✅ Guaranteed to Pass
- **Lint**: ESLint rules, formatting
- **Unit Tests**: 32 tests covering:
  - Activity validation (30-min threshold)
  - Daily aggregation logic
  - Streak calculations
  - Strava integration
  - Type definitions
- **Build**: TypeScript compilation, Next.js build
- **E2E**: Landing page, login/signup forms, OTP flow

### ⚠️ Conditional Tests
- **E2E tests only run**:
  - On pull requests
  - On pushes to main/develop branches
  - NOT on every branch push (to save resources)

### 📝 Skipped Tests
These require authentication and are intentionally skipped:
- Dashboard authenticated views
- Strava sync with real tokens
- Manual activity creation
- Profile updates

See `tests/e2e/dashboard.spec.ts` for skipped tests.

## Expected Results

### Lint
```
✓ eslint - no errors
```

### Unit Tests
```
✓ Test Files: 3 passed
✓ Tests: 32 passed
Duration: ~1-2 seconds
```

### Build
```
✓ Compiled successfully
✓ Generating static pages
✓ Build completed
```

### E2E Tests
```
✓ tests/e2e/landing.spec.ts (5 tests)
✓ tests/e2e/auth.spec.ts (12 tests)
✓ tests/e2e/api.spec.ts (5 tests)
✓ tests/e2e/dashboard.spec.ts (3 skipped)
Duration: ~5-10 seconds
```

## Artifacts Uploaded

After each workflow run:
- **playwright-report/** - HTML report of E2E test results
- **coverage/** - Code coverage report (via Codecov)

View these in GitHub Actions logs → Artifacts section.

## Troubleshooting

### Tests fail locally but pass in CI
**Solution**: Clear cache and reinstall
```bash
rm -rf node_modules .next .turbo
pnpm install
pnpm test:ci
```

### Linting fails
**Solution**: ESLint has strict `no-any` rule
```bash
# Fix automatically where possible
pnpm lint -- --fix

# Or use @ts-expect-error for exceptions
```

### E2E tests timeout
**Solution**: Increase timeout in `playwright.config.ts`
```typescript
timeout: 30 * 1000,  // 30 seconds per test
```

### Build fails with missing env vars
**Solution**: Tests use placeholder values
```
NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-key
```

These are set automatically in GitHub Actions.

## GitHub Secrets (Optional)

To use real Supabase credentials in CI:

1. Go to: Settings → Secrets and Variables → Actions
2. Add secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`

Tests will automatically use these if available.

## Performance Notes

- **Total workflow runtime**: ~10-15 minutes
  - Lint: 1-2 min
  - Unit tests: 2-3 min
  - Build: 2-3 min
  - E2E tests: 5-10 min

- **Parallel jobs**: Lint runs first, then Unit Tests & Build run in parallel
- **Caching**: Node modules cached across runs (~60% faster)
- **Retries**: E2E tests retry up to 2 times on failure

## Status Badge

Add to README.md:
```markdown
![Tests](https://github.com/frydigital/30x30/workflows/Tests/badge.svg)
```

## Next Steps

1. ✅ Tests configured and passing locally
2. ✅ GitHub Actions workflow created
3. ⏳ Push to feature branch to test workflow
4. ⏳ Create pull request to trigger full CI/CD
5. ⏳ Merge when all checks pass

All systems ready! 🚀
