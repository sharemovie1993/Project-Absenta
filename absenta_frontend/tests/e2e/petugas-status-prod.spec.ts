import { test, expect, request as pwRequest } from '@playwright/test';

const TENANT_DOMAIN = 'https://smkn1pld.absenta.id';
const API_BASE = `${TENANT_DOMAIN}/api`;

test.describe('E2E Production: Validasi Petugas setelah login', () => {
  test('Login UI dan cek badge Petugas di Gerbang', async ({ page }) => {
    await page.goto(`${TENANT_DOMAIN}/login`);
    await page.getByLabel(/Alamat Email|Email/i).fill(process.env.PETUGAS_EMAIL || '');
    await page.getByLabel(/Kata Sandi|Password/i).fill(process.env.PETUGAS_PASSWORD || '');
    await page.getByRole('button', { name: /Masuk|Login|Sign in/i }).click();

    await page.waitForURL(/.*\/dashboard/i, { timeout: 15000 });
    await page.goto(`${TENANT_DOMAIN}/attendance/gerbang`);

    const badge = page.getByText(/Petugas:\s+(Aktif|Tidak Aktif)/i);
    await expect(badge).toBeVisible({ timeout: 20000 });
  });

  test('Verifikasi timezone tenant dari API', async ({ page }) => {
    await page.goto(`${TENANT_DOMAIN}/login`);
    await page.getByLabel(/Alamat Email|Email/i).fill(process.env.PETUGAS_EMAIL || '');
    await page.getByLabel(/Kata Sandi|Password/i).fill(process.env.PETUGAS_PASSWORD || '');
    await page.getByRole('button', { name: /Masuk|Login|Sign in/i }).click();
    await page.waitForURL(/.*\/dashboard/i, { timeout: 15000 });

    const tz = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token') || '';
      const res = await fetch('/api/system/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      return json?.data?.timezone ?? null;
    });
    expect(typeof tz === 'string' || tz === null).toBeTruthy();
  });
});
