# Test Suite Documentation

This project includes comprehensive unit tests and end-to-end (E2E) tests.

## Test Structure

```
tests/
├── setup.ts                 # Test setup and global mocks
├── unit/                    # Unit tests
│   └── activities.test.ts   # Activity logic tests
└── e2e/                     # E2E tests with Playwright
    ├── landing.spec.ts      # Landing page tests
    ├── auth.spec.ts         # Authentication flow tests
    ├── api.spec.ts          # API endpoint tests
    └── dashboard.spec.ts    # Dashboard tests
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI mode (recommended for development)
pnpm test:e2e:ui

# Run E2E tests in debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e tests/e2e/auth.spec.ts
```

### Run All Tests

```bash
pnpm test:all
```

## Test Coverage

### Unit Tests Cover:
- Activity validation logic (30-minute threshold)
- Daily activity aggregation
- Streak calculation algorithms
- Date grouping and calculations

### E2E Tests Cover:
- **Landing Page**: Display, navigation, responsiveness
- **Authentication**:
  - Login form validation
  - Signup form with optional username
  - OTP input flow (6-digit code)
  - Navigation between login/signup
- **API Endpoints**:
  - Strava OAuth redirect
  - Authentication requirements
  - Input validation
- **Dashboard**:
  - Redirect when unauthenticated
  - (Authenticated tests are skipped - require test user setup)

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Environment: jsdom (for React component testing)
- Setup file: `tests/setup.ts`
- Coverage provider: v8
- Path aliases configured

### Playwright Configuration (`playwright.config.ts`)
- Browser: Chromium (desktop)
- Base URL: `http://localhost:3000`
- Auto-starts dev server
- Screenshots on failure
- Trace on first retry

## Environment Setup

Tests use environment variables from `.env.local`. For CI/CD, ensure these are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

## Writing New Tests

### Unit Tests Example
```typescript
import { describe, it, expect } from 'vitest'

describe('Feature Name', () => {
  it('should do something', () => {
    const result = someFunction()
    expect(result).toBe(expected)
  })
})
```

### E2E Tests Example
```typescript
import { test, expect } from '@playwright/test'

test('should perform action', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Something')).toBeVisible()
})
```

## Mocking Supabase

For unit tests, Supabase client is mocked in `tests/setup.ts`. For E2E tests with authentication:

```typescript
// Mock Supabase API response
await page.route('**/auth/v1/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ /* mock data */ }),
  })
})
```

## CI/CD Integration

Add to your CI workflow:

```yaml
- name: Run tests
  run: |
    pnpm install
    pnpm test:coverage
    pnpm test:e2e
```

## Debugging

### Unit Tests
- Use `test.only()` to run a single test
- Use `console.log()` for debugging
- Check coverage reports in `coverage/` directory

### E2E Tests
- Use `pnpm test:e2e:ui` for visual debugging
- Use `pnpm test:e2e:debug` for step-by-step debugging
- Check screenshots in `test-results/` directory
- View trace files with `npx playwright show-trace trace.zip`

## Known Limitations

1. **Authentication**: Full authentication flow tests are skipped because they require:
   - A test Supabase project
   - Test user credentials
   - Email OTP verification bypass

2. **API Mocking**: Some tests mock external APIs (Strava, Supabase) to avoid real API calls

3. **Database**: Tests don't modify the actual database. Integration tests would require a test database.

## Future Improvements

- [ ] Add integration tests with test database
- [ ] Set up test user authentication helper
- [ ] Add visual regression testing
- [ ] Add API response validation tests
- [ ] Add performance testing
- [ ] Add accessibility testing with axe-core
