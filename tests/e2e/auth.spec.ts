import { test, expect } from '@playwright/test';

test.describe('Authentication Flow - OTP', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByRole('heading', { name: /30x30 Challenge/i })).toBeVisible();
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Send Verification Code/i })).toBeVisible();
    });

    test('should show validation for empty email', async ({ page }) => {
      await page.goto('/login');
      
      const submitButton = page.getByRole('button', { name: /Send Verification Code/i });
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when email is entered', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel(/Email/i).fill('test@example.com');
      const submitButton = page.getByRole('button', { name: /Send Verification Code/i });
      await expect(submitButton).toBeEnabled();
    });

    test('should show OTP input after submitting email', async ({ page }) => {
      await page.goto('/login');
      
      // Mock the API response to avoid actual email sending
      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      
      await page.getByLabel(/Email/i).fill('test@example.com');
      await page.getByRole('button', { name: /Send Verification Code/i }).click();
      
      // Should show OTP input
      await expect(page.getByText(/Check your email!/i)).toBeVisible();
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByRole('link', { name: /Create an account/i }).click();
      await expect(page).toHaveURL('/signup');
    });
  });

  test.describe('Signup Page', () => {
    test('should display signup form with username field', async ({ page }) => {
      await page.goto('/signup');
      
      await expect(page.getByRole('heading', { name: /Join 30x30 Challenge/i })).toBeVisible();
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
    });

    test('should allow optional username', async ({ page }) => {
      await page.goto('/signup');
      
      // Mock the API response
      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      
      // Should work without username
      await page.getByLabel(/Email/i).fill('newuser@example.com');
      await page.getByRole('button', { name: /Create Account/i }).click();
      
      await expect(page.getByText(/Check your email!/i)).toBeVisible();
    });

    test('should show OTP input after submitting', async ({ page }) => {
      await page.goto('/signup');
      
      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/Email/i).fill('test@example.com');
      await page.getByRole('button', { name: /Create Account/i }).click();
      
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/signup');
      
      await page.getByRole('link', { name: /Sign in instead/i }).click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('OTP Input', () => {
    test('should accept 6-digit code in login', async ({ page }) => {
      await page.goto('/login');
      
      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      
      await page.getByLabel(/Email/i).fill('test@example.com');
      await page.getByRole('button', { name: /Send Verification Code/i }).click();
      
      // Wait for OTP input to appear
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
      
      // Verify button should be disabled initially
      const verifyButton = page.getByRole('button', { name: /Verify & Sign In/i });
      await expect(verifyButton).toBeDisabled();
    });

    test('should allow going back to email input', async ({ page }) => {
      await page.goto('/login');
      
      await page.route('**/auth/v1/otp*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      
      await page.getByLabel(/Email/i).fill('test@example.com');
      await page.getByRole('button', { name: /Send Verification Code/i }).click();
      
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
      
      // Click "Use a different email"
      await page.getByRole('button', { name: /Use a different email/i }).click();
      
      // Should be back to email input
      await expect(page.getByLabel(/Email/i)).toBeVisible();
    });
  });
});
