import { BUILTIN_GROUP_DEFAULT, createUserViaApi } from '../utils/api';
import { expect, test } from '../utils/fixtures';
import { changePassword, login } from '../utils/helper';

test('User settings', async ({ page, adminApi }) => {
  // a user of our own, since the test changes the password
  const user = await createUserViaApi(adminApi, { userGroupIds: [BUILTIN_GROUP_DEFAULT], password: 'test-secret' });

  await test.step('new user should login', async () => {
    await login(page, user);
  });
  await test.step('new user should fail to change the password', async () => {
    await page.getByTestId('menu user').waitFor();
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Settings' }).waitFor();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Security' }).waitFor();
    await page.getByRole('tab', { name: 'Security' }).click();
    await changePassword(page, '123', 'new-secret');
    await expect(page.getByText('Failed to update password')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'close' }).first().click();
  });
  await test.step('new user should change the password', async () => {
    await changePassword(page, 'test-secret', 'new-secret');
    await expect(page.getByText('Password updated successfully')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'close' }).last().click();
    await page.getByTestId('user-profile-modal').locator('header').getByRole('button').click();
  });
  await test.step('new user should logout and login with the new password', async () => {
    await page.getByTestId('menu user').waitFor();
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).waitFor();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await login(page, { email: user.email, password: 'new-secret' });
  });
});
