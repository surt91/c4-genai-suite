import { expect, test } from '@playwright/test';
import { config } from './utils/config';

test.describe('Login Page', () => {
  test('is up and running', async ({ page }) => {
    await page.goto(`${config.URL}/login`);
    const textElem = page.getByText('Welcome to Gaible');
    await expect(textElem).toBeVisible();
  });

  test('is showing username and password option', async ({ page }) => {
    await page.goto(`${config.URL}/login`);
    const textElem = page.getByText('Login', { exact: true });
    await expect(textElem).toBeVisible();
  });
});
