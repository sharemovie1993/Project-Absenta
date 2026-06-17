import { test, expect } from '@playwright/test';

const BACKEND_BASE = 'http://localhost:3000/api';
const GURU_EMAIL = 'guru1@testschool.edu';
const GURU_PASSWORD = 'password123';
const TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';

test.describe('Validasi status Petugas setelah login', () => {
  test('badge Petugas di Gerbang ter-update setelah login', async ({ page, request }) => {
    const loginRes = await request.post(`${BACKEND_BASE}/auth/login`, {
      data: { email: GURU_EMAIL, password: GURU_PASSWORD, tenant_id: TENANT_ID },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson?.data?.token;
    expect(token).toBeTruthy();

    await page.goto('about:blank');
    await page.evaluate(([t, tenant]) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('tenant_id', tenant);
    }, [token, TENANT_ID]);

    await page.goto('/attendance/gerbang');

    const badge = page.getByText(/Petugas:\s+(Aktif|Tidak Aktif)/i);
    await expect(badge).toBeVisible({ timeout: 15000 });
  });
});
