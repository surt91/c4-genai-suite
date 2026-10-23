import { faker } from '@faker-js/faker';
import { expect, test } from '../utils/fixtures';
import {
  createUser,
  enterAdminArea,
  enterUserArea,
  hasMenuItem,
  login,
  logout,
  navigateToUserAdministration,
  uniqueName,
} from '../utils/helper';

test.describe('User permissions', () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser);
    await enterAdminArea(page);
  });

  test('admin user should see admin item in chat section', async ({ page }) => {
    await enterUserArea(page);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(true);
  });

  test('admin user should not see admin item in admin section', async ({ page }) => {
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });

  test('newly created user with group default should not see admin section', async ({ page }) => {
    const name = uniqueName(faker.person.fullName());
    const user = {
      name,
      email: `${name.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}@example.com`,
      password: faker.internet.password({ length: 12 }),
    };

    await navigateToUserAdministration(page);
    await createUser(page, user);
    await logout(page);
    await login(page, user);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });
});
