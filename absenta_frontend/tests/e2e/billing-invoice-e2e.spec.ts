import { test, expect } from '@playwright/test';

// E2E: Login hingga membuat invoice baru
test('Login SUPERADMIN dan buat invoice baru berhasil', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'superadmin@system.com');
  await page.fill('input[name="password"]', 'superadmin123');
  // SUPERADMIN boleh kosongkan tenant_id
  const tenantField = page.locator('input[name="tenant_id"]');
  if (await tenantField.count()) {
    await tenantField.fill('');
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Navigasi ke daftar invoice
  await page.goto('/invoice/list');

  // Pastikan halaman manajemen invoice tampil
  await expect(page.getByText('Manajemen Invoice')).toBeVisible();

  // Buka modal pembuatan invoice
  await page.getByRole('button', { name: 'Buat Invoice' }).click();
  await expect(page.getByText('Buat Invoice Baru')).toBeVisible();

  // Pilih Tenant (gunakan nama label untuk aksesibilitas)
  const tenantSelect = page.getByRole('combobox', { name: 'Tenant *' });
  // Pilih opsi pertama selain placeholder
  const firstOptionValue = await tenantSelect.locator('option:not([value=""])').first().getAttribute('value');
  if (firstOptionValue) {
    await tenantSelect.selectOption(firstOptionValue);
  }

  // Ambil nomor invoice yang di-generate otomatis untuk verifikasi setelah submit
  const invoiceNumberInput = page.getByRole('textbox', { name: 'Nomor Invoice *' });
  const generatedInvoiceNumber = await invoiceNumberInput.inputValue();

  // Isi deskripsi dan jumlah
  await page.getByRole('textbox', { name: 'Deskripsi *' }).fill('Invoice E2E Playwright - Debug Flow');
  await page.getByRole('spinbutton', { name: 'Jumlah *' }).fill('1000000');

  // Submit
  await page.getByRole('button', { name: 'Buat Invoice' }).click();

  // Verifikasi pesan sukses muncul
  await expect(page.getByText('Invoice created successfully')).toBeVisible();

  // Pastikan invoice baru muncul di tabel (berdasarkan nomor invoice)
  await expect(page.getByText(generatedInvoiceNumber)).toBeVisible();
});
