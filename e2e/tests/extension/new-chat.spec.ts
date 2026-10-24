import { expect, Page } from '@playwright/test';
import { createMockAssistantViaApi } from '../utils/api';
import { test } from '../utils/fixtures';
import { checkSelectedConfiguration, login, newChat, selectConfiguration, sendMessage, uniqueName } from '../utils/helper';

test('Chat workflow with Mock LLM', async ({ page, mockServerUrl, adminUser, adminApi }) => {
  const configuration = { name: uniqueName('Mock-LLM-Chat') };
  const secondAssistantName = uniqueName('Second Assistant');

  await test.step('setup', async () => {
    await createMockAssistantViaApi(adminApi, configuration.name, mockServerUrl);
    await createMockAssistantViaApi(adminApi, secondAssistantName, mockServerUrl);
    // The test asserts on the total number of conversations. This works because `adminUser` is a fresh user
    // without conversations.
    await login(page, adminUser);
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
    await newChat(page);
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

  await test.step('should restore a deleted chat with undo', async () => {
    const name = uniqueName('Undo');
    await duplicateActiveConversationByName(page, name);
    const item = page.getByTestId('conversation-item').filter({ hasText: name });
    await expect(item).toHaveCount(1);

    await item.getByRole('button', { name: 'menu' }).click();
    await page.locator('.mantine-Menu-dropdown').getByText('Delete').click();
    await expect(item).toHaveCount(0);

    const notification = page.getByRole('alert').filter({ hasText: `Chat "${name}" deleted` });
    await notification.getByRole('button', { name: 'Undo' }).click();
    await expect(item).toHaveCount(1);
    // the restored chat is opened
    await expect(page.getByTestId('conversation-header')).toContainText(name);
  });
});

/** Renames the first chat of the list (which has messages), so that the test can find it. */
async function duplicateActiveConversationByName(page: Page, name: string) {
  const first = page.getByTestId('conversation-item').first();
  await first.getByRole('button').first().click();
  await first.getByRole('button', { name: 'menu' }).click();
  await page.locator('.mantine-Menu-dropdown').getByText('Rename').click();
  await page.getByTestId('conversation-rename-input').fill(name);
  await page.getByTestId('conversation-rename-input').press('Enter');
}
