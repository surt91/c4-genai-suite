import { expect, test } from '../utils/fixtures';
import { enterAdminArea, login, uniqueName } from '../utils/helper';

test('Documentation on Admin page', async ({ page, adminUser }) => {
  const assistantName = uniqueName('Fake Assistant');

  await test.step('should login', async () => {
    await login(page, adminUser);
  });

  await test.step('should show the help of the chat in the inspector', async () => {
    await page.getByTestId('docs-icon').click();
    const inspector = page.getByTestId('inspector');
    await expect(inspector.getByTestId('inspector-title')).toHaveText('Help');
    await expect(inspector.getByRole('heading', { name: 'Using the Chat' })).toBeVisible();
    // there is only one side panel: the help is not shown as an own panel
    await expect(page.getByTestId('close-icon')).toBeHidden();
    await inspector.getByTestId('inspector-close').click();
    await expect(inspector).toBeHidden();
    await expect(page.getByTestId('docs-icon')).toBeVisible();
  });

  await test.step('should show documentation on button click in admin area', async () => {
    await enterAdminArea(page);
    await page.getByTestId('docs-icon').click();
    await page.getByRole('heading', { name: 'Documentation' }).click();
    await page.getByRole('heading', { name: 'The Admin Dashboard' }).click();
    await page.getByText('The "Dashboard" page offers a').click();
  });

  await test.step('should navigate to different app route and docs via docs link', async () => {
    await page.locator('ol').getByRole('link', { name: 'Assistants' }).click();
    await page.getByRole('heading', { name: 'Do I need one or many' }).click();
  });

  await test.step('should have a working close button', async () => {
    await page.getByTestId('close-icon').click();
    await page.getByTestId('docs-icon').click();
  });

  await test.step('should have documentation for Groups', async () => {
    await page.getByRole('link', { name: 'Groups', exact: true }).click();
    await page.getByRole('heading', { name: 'The Groups Page' }).click();
  });

  await test.step('should have documentation for Users', async () => {
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await page.getByRole('heading', { name: 'The Users Page' }).click();
  });

  await test.step('should have documentation for Files', async () => {
    await page.getByRole('link', { name: 'Files', exact: true }).click();
    await page.getByRole('heading', { name: 'List of File-Management-Tools' }).click();
  });

  await test.step('should have documentation for Theme', async () => {
    await page.getByRole('link', { name: 'Theme', exact: true }).click();
    await page.getByRole('cell', { name: 'Custom links that are' }).click();
  });

  await test.step('should have documentation for Dashboard', async () => {
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('heading', { name: 'How To Get Started with Gaible' }).click();
  });

  await test.step('should have documentation for Assistants', async () => {
    await page.getByTestId('sidebar-admin').getByRole('link', { name: 'Assistants', exact: true }).click();
    await page.getByRole('heading', { name: 'The Assistants Page' }).click();
    await page.getByRole('heading', { name: 'Custom Extensions' }).click();
  });

  await test.step('should still show documentation when an Assistant is selected', async () => {
    // create Fake Assistant for test
    await page.getByRole('button', { name: 'Create assistant' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill(assistantName);
    await page.getByRole('textbox', { name: 'Description' }).fill('Test');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('link', { name: assistantName }).click();
    await page.getByRole('heading', { name: 'The Assistants Page' }).click();
  });

  await test.step('should not show documentation on login page', async () => {
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page.getByTestId('docs-icon')).toBeHidden();
    await expect(page.getByTestId('close-icon')).toBeHidden();
  });
});
