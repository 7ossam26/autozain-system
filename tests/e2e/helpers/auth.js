import { expect } from '@playwright/test';

export function uniqueForwardedFor() {
  return `10.240.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
}

export async function isolateBrowserRateLimit(page) {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': uniqueForwardedFor() });
}

export async function loginViaApi(page, username, password) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: { username, password },
    headers: { 'X-Forwarded-For': uniqueForwardedFor() },
  });
  expect(response.status()).toBe(200);
}

export async function loginAsSuperadmin(page) {
  await loginViaApi(page, 'superadmin', '246810@Ad');
}

export async function updateSetting(page, key, value) {
  const response = await page.request.put(`/api/v1/settings/${key}`, {
    data: { value },
  });
  expect(response.status()).toBe(200);
}
