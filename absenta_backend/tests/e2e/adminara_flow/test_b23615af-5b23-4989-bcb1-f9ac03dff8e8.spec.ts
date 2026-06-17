
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('Test_2026-02-27', async ({ page, context }) => {
  
    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/auth/login');

    // Fill input field
    await page.fill('input[name="email"]', 'user.smkn1pld@gmail.com');

    // Fill input field
    await page.fill('input[name="password"]', 'H7rqVwKIX88V');

    // Click element
    await page.click('button[type="submit"]');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/dashboard');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscriptions');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscription');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscription/add');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscription/create');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscription');

    // Navigate to URL
    await page.goto('https://smkn1pld.adminara.id/subscription/packages');

    // Click element
    await page.click('text=Pilih Domain Ini >> nth=3');
});