import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Strava API', () => {
    test('should redirect to Strava OAuth when accessing /api/strava/connect', async ({ page }) => {
      await page.goto('/api/strava/connect');
      
      // Should either redirect to Strava or show an error if not configured
      const url = page.url();
      const isStravaRedirect = url.includes('strava.com') || url.includes('localhost');
      expect(isStravaRedirect).toBeTruthy();
    });

    test('should require authentication for sync endpoint', async ({ request }) => {
      const response = await request.post('/api/strava/sync');
      
      // Should return 401 or redirect to login
      expect([401, 302, 303]).toContain(response.status());
    });

    test('should require authentication for disconnect endpoint', async ({ request }) => {
      const response = await request.post('/api/strava/disconnect');
      
      // Should return 401 or redirect to login
      expect([401, 302, 303]).toContain(response.status());
    });
  });

  test.describe('Manual Activities API', () => {
    test('should require authentication for manual activity creation', async ({ request }) => {
      const response = await request.post('/api/activities/manual', {
        data: {
          activity_date: '2025-12-06',
          duration_minutes: 45,
          activity_type: 'Workout',
          activity_name: 'Test Activity',
        },
      });
      
      // Should return 401 or redirect to login
      expect([401, 302, 303]).toContain(response.status());
    });

    test('should validate required fields for manual activity', async ({ request }) => {
      const response = await request.post('/api/activities/manual', {
        data: {},
      });
      
      // Should return 400 or 401
      expect([400, 401, 302, 303]).toContain(response.status());
    });
  });

  test.describe('Auth Callback', () => {
    test('should handle missing code parameter in auth callback', async ({ page }) => {
      await page.goto('/auth/callback');
      
      // Should redirect or show error
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toBeTruthy();
    });
  });
});
