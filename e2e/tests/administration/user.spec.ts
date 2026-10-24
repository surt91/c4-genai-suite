import { BUILTIN_GROUP_DEFAULT, createUserViaApi } from '../utils/api';
import { expect, test } from '../utils/fixtures';
import { createUser, enterAdminArea, login, navigateToUserAdministration, searchUser, uniqueName } from '../utils/helper';

test.describe('User management', () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser);
    await enterAdminArea(page);
  });

  test('should create a user', async ({ page }) => {
    const name = uniqueName('e2e-created-user');
    await navigateToUserAdministration(page);
    await createUser(page, { email: `${name}@example.com`, name });
  });

  test('should edit the user details', async ({ page, adminApi }) => {
    // edit a user of our own, other tests use other users concurrently
    const user = await createUserViaApi(adminApi, { userGroupIds: [BUILTIN_GROUP_DEFAULT] });
    const newName = uniqueName('e2e-edited-user');
    const newEmail = `${newName}@example.com`;
    await navigateToUserAdministration(page);

    const row = await searchUser(page, user);
    await row.locator('td').first().click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(newName);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(newEmail);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('cell', { name: newName, exact: true })).toHaveText(newName);
    await expect(page.getByRole('cell', { name: newEmail, exact: true })).toHaveText(newEmail);
  });

  test('should delete a user', async ({ page, adminApi }) => {
    const user = await createUserViaApi(adminApi, { userGroupIds: [BUILTIN_GROUP_DEFAULT] });
    await navigateToUserAdministration(page);

    const row = await searchUser(page, user);
    await row.click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const updateUserModal = page.getByRole('heading', { name: 'Update User' });
    await updateUserModal.waitFor({ state: 'detached' });

    await expect(page.getByRole('table').getByRole('row').filter({ hasText: user.email })).toHaveCount(0);
  });
});
