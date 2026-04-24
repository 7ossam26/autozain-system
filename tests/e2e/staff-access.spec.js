import { expect, test } from '@playwright/test';
import { isolateBrowserRateLimit } from './helpers/auth.js';
import { resetE2EData } from './helpers/db.js';

const STAFF_ENTRY_LABEL = 'دخول الموظفين';
const CUSTOMER_BACK_LABEL = 'بتدور على عربية؟ ارجع وتواصل مع موظف';

test.describe('Staff access entry points', () => {
  test('public navigation exposes staff entry and unauthenticated users land on login', async ({ page, isMobile }) => {
    await isolateBrowserRateLimit(page);
    await page.goto('/');

    if (isMobile) {
      await page.getByRole('button', { name: 'القائمة' }).click();
      const mobileMenu = page.locator('header nav').last();
      const mobileStaffEntry = mobileMenu.getByRole('link', { name: STAFF_ENTRY_LABEL });
      await expect(mobileStaffEntry).toBeVisible();
      await expect(mobileStaffEntry).toHaveAttribute('href', /\/dashboard$/);
      await mobileStaffEntry.click();
    } else {
      const headerStaffEntry = page.getByRole('banner').getByRole('link', { name: STAFF_ENTRY_LABEL });
      await expect(headerStaffEntry).toBeVisible();
      await expect(headerStaffEntry).toHaveAttribute('href', /\/dashboard$/);
      await headerStaffEntry.click();
    }

    await expect(page).toHaveURL(/\/dashboard\/login$/);
    const customerBackLink = page.getByRole('link', { name: CUSTOMER_BACK_LABEL });
    await expect(customerBackLink).toBeVisible();
    await expect(customerBackLink).toHaveAttribute('href', '/');

    await customerBackLink.click();
    await expect(page).toHaveURL('/');
  });

  test('footer exposes a low-emphasis staff entry', async ({ page }) => {
    await page.goto('/');

    const footerStaffEntry = page.getByRole('contentinfo').getByRole('link', { name: STAFF_ENTRY_LABEL });
    await expect(footerStaffEntry).toBeVisible();
    await expect(footerStaffEntry).toHaveAttribute('href', /\/dashboard$/);
  });

  test('authenticated users who reach login are sent to the dashboard', async ({ page }) => {
    await isolateBrowserRateLimit(page);
    await resetE2EData();

    await page.goto('http://localhost:5173/dashboard/login');
    await page.locator('input[autocomplete="username"]').fill('superadmin');
    await page.locator('input[autocomplete="current-password"]').fill('246810@Ad');
    await page.getByRole('button', { name: 'دخول' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('http://localhost:5173/dashboard/login');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
