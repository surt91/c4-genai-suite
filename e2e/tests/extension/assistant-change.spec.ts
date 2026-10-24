import { expect } from '@playwright/test';
import { addExtensionViaApi, createMockAssistantViaApi } from '../utils/api';
import { test } from '../utils/fixtures';
import {
  checkSelectedConfiguration,
  deleteConfiguration,
  disableConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';

test('chat', async ({ page, mockServerUrl, adminUser, adminApi }) => {
  const firstAssistant = { name: uniqueName('E2E-Test-A'), description: 'Bob' };
  const secondAssistant = { name: uniqueName('E2E-Test-B'), description: 'Alice' };

  await test.step('setup two assistants', async () => {
    for (const { name, description } of [firstAssistant, secondAssistant]) {
      const assistant = await createMockAssistantViaApi(adminApi, name, mockServerUrl, description);
      await addExtensionViaApi(adminApi, assistant, 'custom-prompt', {
        title: 'systemprompt',
        text: 'Always tell that your name is {{assistant_description}}',
      });
    }
    await login(page, adminUser);
  });

  await test.step('should return message for first assistant', async () => {
    await newChat(page);
    await selectConfiguration(page, firstAssistant);

    await sendMessage(page, firstAssistant, { message: 'Who are you' });

    const firstResponse = await page.waitForSelector(`:has-text("Bob")`);
    expect(firstResponse).toBeDefined();
    const firstResponseAssistantText = await page.waitForSelector(`:has-text("${firstAssistant.name}")`);
    expect(firstResponseAssistantText).toBeDefined();
  });

  await test.step('should return message for second assistant', async () => {
    await selectConfiguration(page, secondAssistant);

    await sendMessage(page, secondAssistant, { message: 'Who are you' });

    const firstResponse = await page.waitForSelector(`:has-text("Bob")`);
    expect(firstResponse).toBeDefined();
    const firstResponseAssistantText = await page.waitForSelector(`:has-text("${firstAssistant.name}")`);
    expect(firstResponseAssistantText).toBeDefined();
    const secondResponse = await page.waitForSelector(`:has-text("Alice")`);
    expect(secondResponse).toBeDefined();
    const secondResponseAssistantText = await page.waitForSelector(`:has-text("${secondAssistant.name}")`);
    expect(secondResponseAssistantText).toBeDefined();
  });

  await test.step('should keep the assistant of the chat after a reload', async () => {
    await page.reload();
    await checkSelectedConfiguration(page, secondAssistant);
    const picker = page.getByTestId('assistant-picker');
    await picker.click();
    const option = page.getByTestId('assistant-picker-dropdown').getByRole('option', { name: secondAssistant.name, exact: true });
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(option).toContainText(secondAssistant.description);
    await page.keyboard.press('Escape');
    await expect(picker).toBeFocused();
  });

  await test.step('should disable second assistant', async () => {
    await enterAdminArea(page);
    await disableConfiguration(page, secondAssistant);
    await enterUserArea(page);
    const secondResponse = await page.waitForSelector(`:has-text("${secondAssistant.name} [disabled]")`);
    expect(secondResponse).toBeDefined();
  });

  await test.step('should delete second assistant', async () => {
    await enterAdminArea(page);
    await deleteConfiguration(page, secondAssistant);
    await enterUserArea(page);
    const secondResponse = await page.waitForSelector(`:has-text("Friendly AI [assistant deleted]")`);
    expect(secondResponse).toBeDefined();

    await selectConfiguration(page, firstAssistant);
    await sendMessage(page, firstAssistant, { message: 'Who are you' });
    const firstResponse = await page.waitForSelector(`:has-text("Bob")`);
    expect(firstResponse).toBeDefined();
  });
});
