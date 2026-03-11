import { test, expect } from '@playwright/test';

test.describe('Dashboard (Unauthenticated)', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Dashboard UI Elements', () => {
  test.skip('should display profile section when authenticated', async ({ page }) => {
    // This test would require actual authentication
    // In a real scenario, you'd set up a test user and authenticate
    
    await page.goto('/dashboard');
    
    // Mock authentication state
    // await authenticateTestUser(page);
    
    await expect(page.getByText(/Profile/i)).toBeVisible();
  });

  test.skip('should display activity calendar', async ({ page }) => {
    // Would require authentication
    await page.goto('/dashboard');
    
    await expect(page.getByText(/Activity Calendar/i)).toBeVisible();
  });

  test.skip('should display Strava connection section', async ({ page }) => {
    // Would require authentication
    await page.goto('/dashboard');
    
    await expect(page.getByText(/Strava/i)).toBeVisible();
  });
});
