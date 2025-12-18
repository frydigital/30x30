import { test, expect } from '@playwright/test';

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

  test('should display leaderboard section', async ({ page }) => {
    await page.goto('/');
    
    // Check for leaderboard heading
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
  });

  test('should navigate to login page when clicking sign in', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /Sign In/i }).first().click();
    await expect(page).toHaveURL('/login');
  });

  test('should display "How it works" section with 3 steps', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /Connect Strava/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Stay Active/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Track Progress/i })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /30 Days. 30 Minutes./i })).toBeVisible();
  });
});
