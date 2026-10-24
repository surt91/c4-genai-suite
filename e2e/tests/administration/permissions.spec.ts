import { BUILTIN_GROUP_DEFAULT, createUserViaApi } from '../utils/api';
import { expect, test } from '../utils/fixtures';
import { enterAdminArea, hasMenuItem, login, loginViaUi } from '../utils/helper';

test.describe('User permissions', () => {
  test('admin user should see the admin item only in the chat section', async ({ page, adminUser }) => {
    await login(page, adminUser);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(true);

    await page.keyboard.press('Escape');
    await enterAdminArea(page);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });

  test('user with group default should not see admin section', async ({ page, adminApi }) => {
    const user = await createUserViaApi(adminApi, { prefix: 'e2e-default-user', userGroupIds: [BUILTIN_GROUP_DEFAULT] });

    // the login form is only used here and in userSettings.spec.ts, the other tests log in via the API
    await loginViaUi(page, user);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });
});
