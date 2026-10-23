import { faker } from '@faker-js/faker';
import { expect, test } from '../utils/fixtures';
import { enterAdminArea, login, navigateToUserGroupAdministration, uniqueName } from '../utils/helper';

test('Audit Log', async ({ page, adminUser }) => {
  // the audit log is global, other tests add entries concurrently: only look at entries of our own entities
  const configName = uniqueName('Audit Config');
  const configDescription = faker.commerce.productDescription();
  const groupName = uniqueName('Audit Group');
  const updatedGroupName = uniqueName('Audit Group Renamed');

  await test.step('should login', async () => {
    await login(page, adminUser);
    await enterAdminArea(page);
  });

  await test.step('should display audit log page', async () => {
    await page.getByRole('link', { name: 'Audit Log' }).click();
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  await test.step('should show audit entries when configuration is created', async () => {
    // Create a configuration
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page.getByRole('button', { name: 'Create assistant' }).click();
    await page.getByLabel('Name').fill(configName);
    await page.getByLabel('Description').fill(configDescription);
    await page.getByRole('button', { name: 'Save' }).click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Create Configuration' });
    await createConfigurationModal.waitFor({ state: 'detached' });

    // Check audit log
    // the audit log entry is written before the create request returns
    await page.getByRole('link', { name: 'Audit Log' }).click();

    // Find the row with our configuration
    const configRow = page.getByRole('table').getByRole('row').filter({ hasText: configName });
    await expect(configRow).toBeVisible();

    // Check badges
    await expect(configRow.getByText('Assistant')).toBeVisible();
    await expect(configRow.getByText('Create')).toBeVisible();
  });

  await test.step('should filter audit log by assistant', async () => {
    const assistantFilterSelect = page.getByPlaceholder('Filter by Assistant');
    await assistantFilterSelect.click();
    await page.getByRole('option', { name: configName }).click();

    // All visible rows should be related to this configuration
    const configRows = page.getByRole('table').getByRole('row').filter({ hasText: configName });
    await expect(configRows.first()).toBeVisible();
  });

  await test.step('should show audit log details modal with snapshot', async () => {
    const configRow = page.getByRole('table').getByRole('row').filter({ hasText: configName }).first();
    await configRow.click();

    // Modal should appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Change Details')).toBeVisible();

    // Check modal content
    await expect(modal.getByText('Assistant')).toBeVisible();
    await expect(modal.getByText('Create', { exact: true })).toBeVisible();
    await expect(modal.getByText(configName)).toBeVisible();

    // For create action, should show "Entity was created" message
    await expect(modal.getByText('Entity was created.')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  await test.step('should show user who performed the action', async () => {
    const configRow = page.getByRole('table').getByRole('row').filter({ hasText: configName }).first();

    // The user column should have content (either username or userId)
    const userCell = configRow.locator('td').nth(4); // User is the 5th column
    const userText = await userCell.textContent();
    expect(userText).toBeTruthy();
    expect(userText?.trim()).not.toBe('');
  });

  await test.step('should show audit entries when user group is created and updated', async () => {
    // Create a user group
    await navigateToUserGroupAdministration(page);
    await page.getByRole('button', { name: 'Create User Group' }).click();
    await page.getByLabel('Name').fill(groupName);
    await page.getByRole('button', { name: 'Save' }).click();

    const createUserGroupModal = page.getByRole('heading', { name: 'Create User Group' });
    await createUserGroupModal.waitFor({ state: 'detached' });

    // Update the user group
    const userGroup = page.getByRole('table').getByRole('row').filter({ hasText: groupName });
    await userGroup.click();
    await page.getByLabel('Name').fill(updatedGroupName);
    await page.getByRole('button', { name: 'Save' }).click();

    const updateUserGroupModal = page.getByRole('heading', { name: 'Update User Group' });
    await updateUserGroupModal.waitFor({ state: 'detached' });

    // Check audit log
    await page.getByRole('link', { name: 'Audit Log' }).click();

    // Should have both create and update entries
    const createRow = page.getByRole('table').getByRole('row').filter({ hasText: groupName }).filter({ hasText: 'Create' });
    const updateRow = page
      .getByRole('table')
      .getByRole('row')
      .filter({ hasText: updatedGroupName })
      .filter({ hasText: 'Update' });

    await expect(createRow).toBeVisible();
    await expect(updateRow).toBeVisible();

    // Check badges
    await expect(createRow.getByText('User Group')).toBeVisible();
    await expect(updateRow.getByText('User Group')).toBeVisible();
  });

  await test.step('should show diff when viewing updated entity', async () => {
    // Find the update entry and click it
    const updateRow = page
      .getByRole('table')
      .getByRole('row')
      .filter({ hasText: updatedGroupName })
      .filter({ hasText: 'Update' });
    await updateRow.first().click();

    // Modal should show diff
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Should have jsondiffpatch diff view
    await expect(modal.locator('.jsondiffpatch-delta').getByText(updatedGroupName)).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  await test.step('should filter audit log by entity type', async () => {
    // Get the entity type filter dropdown
    const entityTypeSelect = page.locator('.mantine-Select-input').last();

    // Filter by User Group
    await entityTypeSelect.click();
    await page.getByRole('option', { name: 'User Group' }).click();

    // All visible rows should have User Group badge (retried until the filtered list is loaded),
    // at least our own user group entries must be there
    const allRows = page.getByRole('table').locator('tbody tr');
    await expect(allRows.filter({ hasNotText: 'User Group' })).toHaveCount(0);
    await expect(allRows.filter({ hasText: 'User Group' }).first()).toBeVisible();
  });

  await test.step('should paginate audit log entries', async () => {
    // Navigate to audit log without filters
    await page.getByRole('link', { name: 'Audit Log' }).click();

    // Check if pagination controls exist (they should if there are enough entries)
    const paginationNext = page.getByRole('button', { name: 'Next' }).or(page.getByLabel('Next'));
    const paginationPrev = page.getByRole('button', { name: 'Previous' }).or(page.getByLabel('Previous'));

    // If pagination exists, test it
    if ((await paginationNext.count()) > 0) {
      const tableBody = page.getByRole('table').locator('tbody');
      await tableBody.locator('tr').first().waitFor();
      const firstPageContent = (await tableBody.textContent()) ?? '';

      // Go to next page: content should be different
      await paginationNext.click();
      await expect(tableBody).not.toHaveText(firstPageContent);
      const secondPageContent = (await tableBody.textContent()) ?? '';

      // Go back: other tests may have added entries in the meantime, so the first page is not necessarily identical
      await paginationPrev.click();
      await expect(tableBody).not.toHaveText(secondPageContent);
    }
  });

  await test.step('should show timestamp in readable format', async () => {
    // Get first row's timestamp
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const timestampCell = firstRow.locator('td').last(); // Timestamp is the last column
    const timestamp = await timestampCell.textContent();

    // Should be a readable date format (e.g., "Jan 15, 2026, 10:30 AM")
    expect(timestamp).toBeTruthy();
    expect(timestamp).toMatch(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/); // Matches "Jan 15, 2026" pattern
  });

  await test.step('should truncate long entity IDs', async () => {
    // Get first row's entity ID
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const entityIdCell = firstRow.locator('td').nth(1); // Entity ID is the 2nd column
    const entityIdText = await entityIdCell.textContent();

    // If the ID is long, it should be truncated with ellipsis
    // UUIDs are 36 chars, so they should be truncated
    if (entityIdText && entityIdText.includes('…')) {
      expect(entityIdText.length).toBeLessThan(20); // Should be truncated
    }

    // The title attribute should have the full ID
    const titleAttr = await entityIdCell.getAttribute('title');
    if (titleAttr) {
      expect(titleAttr.length).toBeGreaterThanOrEqual(entityIdText!.replace('…', '').length);
    }
  });
});
