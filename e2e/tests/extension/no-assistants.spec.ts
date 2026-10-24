import { Page } from '@playwright/test';
import { BUILTIN_GROUP_DEFAULT, createUserViaApi, TestUser } from '../utils/api';
import { config } from '../utils/config';
import { expect, test } from '../utils/fixtures';

/**
 * The empty state of a fresh installation without any assistant. The setup project creates a default assistant that
 * every user can see (and deleting it would break the other tests running in parallel), so this test answers the
 * request for the assistants of the chat with an empty list in its own browser page only.
 */
async function loginWithoutAssistants(page: Page, user: TestUser) {
  await page.route('**/api/configurations?enabled=true', (route) => route.fulfill({ json: { items: [] } }));
  await page.goto(`${config.URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
  // without an assistant, the chat is not redirected to a new conversation
  await page.waitForURL(/\/chat\/?$/);
}

test.describe('Chat without assistants', () => {
  test('admins are guided to create the first assistant', async ({ page, adminUser }) => {
    await loginWithoutAssistants(page, adminUser);

    const emptyState = page.getByTestId('no-assistants');
    await expect(emptyState.getByRole('heading', { name: 'No assistant available yet' })).toBeVisible();
    await expect(emptyState.getByRole('link', { name: 'Read the quickstart' })).toHaveAttribute('href', /#quickstart$/);

    await emptyState.getByRole('link', { name: 'Create your first assistant' }).click();
    await page.waitForURL(/\/admin\/assistants\/?$/);
  });

  test('other users are asked to contact an administrator', async ({ page, adminApi }) => {
    const user = await createUserViaApi(adminApi, { prefix: 'e2e-no-assistants', userGroupIds: [BUILTIN_GROUP_DEFAULT] });
    await loginWithoutAssistants(page, user);

    const emptyState = page.getByTestId('no-assistants');
    await expect(emptyState.getByText('Please contact an administrator.')).toBeVisible();
    await expect(emptyState.getByRole('link', { name: 'Create your first assistant' })).toHaveCount(0);
  });
});
