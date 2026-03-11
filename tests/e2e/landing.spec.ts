import { expect, test } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: /30 Days. 30 Minutes./i })).toBeVisible();
    
    // Check for description
    await expect(page.getByText(/Build your fitness habit/i)).toBeVisible();
    
    // Check for sign in button
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
  });

  test('should navigate to login page when clicking sign in', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /Sign In/i }).first().click();
    await expect(page).toHaveURL('/login');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /30 Days. 30 Minutes./i })).toBeVisible();
  });
});
