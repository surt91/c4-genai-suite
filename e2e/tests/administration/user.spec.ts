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

  test('should set user group to default when creating a new user', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();

    const allPills = page.locator('.mantine-MultiSelect-pill');
    await expect(allPills).toHaveCount(1);
    const defaultPill = allPills.getByText('Default');
    await expect(defaultPill).toBeVisible();
  });

  test('should alert when username and email is empty', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Name is a required field' })).toBeDefined();
    expect(page.getByRole('alert', { name: 'Email is a required field' })).toBeDefined();
  });

  test('should alert when password and confirm password do not match', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();
    await page.getByLabel('Password', { exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill('abc');
    await page.getByLabel('Confirm Password').click();
    await page.getByLabel('Confirm Password').fill('abd');
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Passwords do not match.' })).toBeDefined();
  });
});
