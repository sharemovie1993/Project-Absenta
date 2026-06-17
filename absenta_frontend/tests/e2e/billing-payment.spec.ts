import { test, expect } from '@playwright/test';

const SUPERADMIN_EMAIL = 'superadmin@system.com';
const SUPERADMIN_PASSWORD = 'superadmin123';

test.describe('SUPERADMIN login and Billing/Payments navigation', () => {
  test('login and open Billing Payments page', async ({ page }) => {
    // Go to login page
    await page.goto('/login');

    // Fill credentials
    await page.getByLabel('Email').fill(SUPERADMIN_EMAIL);
    await page.getByLabel('Password').fill(SUPERADMIN_PASSWORD);

    // Submit login form
    await page.getByRole('button', { name: /Sign in|Login|Masuk/i }).click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Navigate directly to Billing Payments page
    await page.goto('/billing/payments');

    // Expect Payments page content to render
    await expect(page.getByText(/Payment Gateway|Manajemen Payment/i)).toBeVisible();

    // Optional: ensure sidebar navigation exists
    await expect(page.getByText(/Billing/i)).toBeVisible();
  });
});

