import { test, expect } from '@playwright/test';

// Debug test: open invoice page and click "Buat Invoice" to capture console/page errors
test('debug buka modal invoice tidak menghilang tiba-tiba', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', msg => {
    const txt = `[console:${msg.type()}] ${msg.text()}`;
    logs.push(txt);
    console.log(txt);
  });

  page.on('pageerror', err => {
    const txt = `[pageerror] ${err.message}`;
    logs.push(txt);
    console.error(txt);
  });

  // Navigate to login and sign in as SUPERADMIN (reusing known selectors)
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email').fill('superadmin@system.com');
  await page.getByLabel('Password').fill('superadmin123');
  // tenant_id optional; if present, select first option safely
  const tenantSelect = page.locator('select[name="tenant_id"]');
  if (await tenantSelect.isVisible()) {
    await tenantSelect.selectOption({ index: 0 }).catch(() => {});
  }
  await page.getByRole('button', { name: /masuk/i }).click();

  // Go to invoice list
  await page.goto('http://localhost:5173/invoice');
  await expect(page.getByRole('heading', { name: /manajemen invoice/i })).toBeVisible();

  // Click header button "Buat Invoice"
  await page.getByRole('button', { name: /buat invoice/i }).click();

  // Wait for modal to be visible and remain
  const modalTitle = page.getByRole('heading', { name: /buat invoice baru/i });
  await expect(modalTitle).toBeVisible({ timeout: 5000 });

  // Small wait to see if it disappears
  await page.waitForTimeout(1500);

  // Assert modal still visible
  const stillVisible = await modalTitle.isVisible();
  expect(stillVisible).toBeTruthy();

  // Log out captured logs for inspection in test output
  console.log('Captured logs count:', logs.length);
});
