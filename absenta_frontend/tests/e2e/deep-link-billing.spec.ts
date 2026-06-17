import { test, expect } from '@playwright/test';

// Uji deep-link langsung ke halaman Billing tanpa proxy salah arah
test('Deep-link ke /billing/billings tidak Unauthorized', async ({ page }) => {
  // Login sebagai SUPERADMIN
  await page.goto('/login');
  await page.fill('input[name="email"]', 'superadmin@example.com');
  await page.fill('input[name="password"]', 'password123');
  // Beberapa login form juga memiliki tenant_id
  const tenantField = page.locator('input[name="tenant_id"]');
  if (await tenantField.count()) {
    await tenantField.fill('default-tenant');
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Langsung buka deep-link ke halaman billing
  await page.goto('/billing/billings');

  // Verifikasi konten halaman billing tampil normal (bukan JSON Unauthorized)
  // Cek beberapa kemungkinan teks judul/subtitle yang ada di layout
  const possibleTexts = [
    'Manajemen Billing',
    'Billing Management',
    'Daftar Tagihan',
    'Ringkasan lengkap aktivitas billing dan keuangan',
  ];

  let found = false;
  for (const txt of possibleTexts) {
    if (await page.getByText(txt).count()) {
      found = true;
      break;
    }
  }

  expect(found).toBeTruthy();
});
