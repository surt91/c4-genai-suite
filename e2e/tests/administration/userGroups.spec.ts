import { createUserGroupViaApi } from '../utils/api';
import { expect, test } from '../utils/fixtures';
import { enterAdminArea, login, navigateToUserGroupAdministration, uniqueName } from '../utils/helper';

test.describe('User group management', () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser);
    await enterAdminArea(page);
  });

  test('should create a user group', async ({ page }) => {
    const groupName = uniqueName('Group');
    await navigateToUserGroupAdministration(page);

    const adminCell = page.getByRole('cell', { name: 'Default', exact: true });
    await adminCell.waitFor();

    await page.getByRole('button', { name: 'Create User Group' }).click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(groupName);
    await page.getByRole('button', { name: 'Save' }).click();

    const createUserGroupModal = page.getByRole('heading', { name: 'Create User Group' });
    await createUserGroupModal.waitFor({ state: 'detached' });

    // other tests create groups concurrently, so only check for our own group and not for the number of rows
    const newGroup = page.getByRole('table').getByRole('row').filter({ hasText: groupName });
    await expect(newGroup).toHaveCount(1);
  });

  test('should edit the user group detail', async ({ page, adminApi }) => {
    const group = await createUserGroupViaApi(adminApi, uniqueName('Group'));
    const newGroupName = uniqueName('Group Renamed');
    await navigateToUserGroupAdministration(page);

    await page.getByRole('table').getByRole('row').filter({ hasText: group.name }).click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(newGroupName);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('cell', { name: newGroupName })).toHaveText(newGroupName);
    await expect(page.getByRole('cell', { name: group.name, exact: true })).toHaveCount(0);
  });

  test('should delete a user group', async ({ page, adminApi }) => {
    const group = await createUserGroupViaApi(adminApi, uniqueName('Group'));
    await navigateToUserGroupAdministration(page);

    const userGroupToBeDeleted = page.getByRole('table').getByRole('row').filter({ hasText: group.name });
    await userGroupToBeDeleted.click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const updateUserGroupModal = page.getByRole('heading', { name: 'Update User Group' });
    await updateUserGroupModal.waitFor({ state: 'detached' });

    await expect(userGroupToBeDeleted).toHaveCount(0);
  });
});
