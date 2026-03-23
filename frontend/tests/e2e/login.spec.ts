import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('should show login form and login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();

    await page.fill('input[type="email"]', 'admin@meetandseat.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  });
});
