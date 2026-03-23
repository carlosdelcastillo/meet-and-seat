import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@meetandseat.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should display resources and allow creating booking', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();

    // Click the "New booking" button
    await page.click('button:has-text("Nueva reserva"), button:has-text("New booking")');

    // Should show the booking form modal
    await expect(page.locator('.modal')).toBeVisible();
  });
});
