import { config } from '../utils/config';
import { test } from '../utils/fixtures';
import { expectA11yCompliant, login } from '../utils/helper';

test('accessibility', async ({ page, adminUser }) => {
  await test.step('login page accessible', async () => {
    await page.goto(`${config.URL}/login`);
    await page.getByRole('button', { name: 'Login' }).waitFor();
    await expectA11yCompliant(page);
  });

  await test.step('main page accessible', async () => {
    await login(page, adminUser);
    await expectA11yCompliant(page);
  });
});
