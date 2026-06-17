import { test, expect } from '@playwright/test';

// This test verifies that /invoice/dashboard renders and collects runtime error logs
test('Invoice dashboard renders and error logs are collected', async ({ page }) => {
  // Navigate to login using baseURL from config
  await page.goto('/login');

  // Fill superadmin credentials (tenant_id empty is allowed)
  await page.fill('#tenant_id', '');
  await page.fill('#email', 'superadmin@system.com');
  await page.fill('#password', 'superadmin123');
  await page.getByRole('button', { name: 'Masuk' }).click();

  // After login, go straight to invoice dashboard
  await page.goto('/invoice/dashboard');

  // Ensure key UI elements render (non-blank)
  await expect(page.getByRole('button', { name: 'Buat Invoice' })).toBeVisible({ timeout: 15000 });

  // Capture global error logs from the window
  const winLogs = await page.evaluate(() => (window as any).__APP_ERROR_LOGS__ || []);
  const lsLogsRaw = await page.evaluate(() => localStorage.getItem('app_error_logs'));
  const lsLogs = (() => { try { return JSON.parse(lsLogsRaw || '[]'); } catch { return []; } })();

  console.log('Invoice Dashboard Error Logs (window):', JSON.stringify(winLogs));
  console.log('Invoice Dashboard Error Logs (localStorage):', JSON.stringify(lsLogs));

  // Optional: assert page is not blank by checking body has content height
  const bodyRect = await page.evaluate(() => document.body.getBoundingClientRect());
  expect(bodyRect.height).toBeGreaterThan(0);
});
