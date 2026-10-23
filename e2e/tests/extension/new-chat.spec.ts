import { expect } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addMockModelToConfiguration,
  checkSelectedConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';

test('Chat workflow with Mock LLM', async ({ page, mockServerUrl, adminUser }) => {
  const configuration = { name: '', description: '' };
  const secondAssistantName = uniqueName('Second Assistant');

  await test.step('should login', async () => {
    await login(page, adminUser);
  });

  await test.step('add assistant', async () => {
    await enterAdminArea(page);
    configuration.name = uniqueName('Mock-LLM-Chat');
    configuration.description = `Description for ${configuration.name}`;
    await createConfiguration(page, configuration);
    await createConfiguration(page, { ...configuration, name: secondAssistantName });
  });

  await test.step('add model', async () => {
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
    await addMockModelToConfiguration(page, { ...configuration, name: secondAssistantName }, { endpoint: mockServerUrl });
  });

  await test.step('switch to chat', async () => {
    // The test asserts on the total number of conversations. This works because `adminUser` is a fresh user
    // without conversations.
    await enterUserArea(page);
  });

  await test.step('should start chat in new configuration', async () => {
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('should create a reference conversation', async () => {
    await selectConfiguration(page, configuration);

    const userMessageContent = 'Hi!';
    await sendMessage(page, configuration, { message: userMessageContent });

    const conversationItems = page.getByTestId('conversation-item');
    await expect(conversationItems.first()).toBeAttached({ timeout: 10000 });
    await expect(conversationItems).toHaveCount(1);
  });

  await test.step('should not create conversations before first query', async () => {
    await page.getByRole('button', { name: 'New chat' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('conversation-item')).toHaveCount(1);
  });

  await test.step('should not create multiple empty conversations via multiple clicks on the new chat button', async () => {
    await newChat(page);
    const firstChatUrl = page.url();
    await newChat(page);
    const secondChatUrl = page.url();
    expect(secondChatUrl).toBe(firstChatUrl);
    await expect(page.getByTestId('conversation-item')).toHaveCount(1);
  });

  await test.step('should keep selected assistant in new chat when a conversation is deleted', async () => {
    await newChat(page);
    const assistant = { name: secondAssistantName };
    await selectConfiguration(page, assistant);
    await sendMessage(page, assistant, {
      message: 'Answer as short as possible: What is the answer to life, the universe and everything?',
    });
    // there is already a chat in the history, wait for the second chat to appear and click the newest one
    await page.locator('svg.tabler-icon-dots').nth(1).waitFor();
    await page.locator('svg.tabler-icon-dots').nth(0).click();
    const dropdown = page.locator('.mantine-Menu-dropdown');
    await expect(dropdown).toBeVisible();
    await dropdown.locator('text=Delete').click();
    const welcomeText = page.getByText('How may I help you?');
    await welcomeText.waitFor();
    await checkSelectedConfiguration(page, assistant);
  });
});
