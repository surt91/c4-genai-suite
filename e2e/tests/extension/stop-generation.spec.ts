import { expect } from '@playwright/test';
import { createMockAssistantViaApi } from '../utils/api';
import { test } from '../utils/fixtures';
import { login, newChat, selectConfiguration, sendMessage, uniqueName } from '../utils/helper';
import { getStreamState } from '../utils/mock-llm-server';

test('stop the generation of an answer', async ({ page, adminApi, adminUser, mockServerUrl }) => {
  const configuration = { name: uniqueName('Stop-Generation') };
  // the mock LLM answers "slow stream" messages slowly with "word0 word1 ..."
  const firstQuestion = `slow stream ${uniqueName('first')}`;
  const secondQuestion = `slow stream ${uniqueName('second')}`;

  const chatItems = page.getByTestId('chat-item');
  const input = page.getByPlaceholder(`Message ${configuration.name}`);
  const stopButton = page.getByRole('button', { name: 'Stop generating' });
  const sendButton = page.getByRole('button', { name: 'Send' });

  await test.step('setup', async () => {
    await createMockAssistantViaApi(adminApi, configuration.name, mockServerUrl);
    await login(page, adminUser);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('should stop the answer with the stop button', async () => {
    await input.fill(firstQuestion);
    await sendButton.click();

    const answer = chatItems.nth(1);
    await expect(answer).toContainText('word3');
    await stopButton.click();

    await expect(stopButton).toBeHidden();
    await expect(sendButton).toBeVisible();
    await expect(answer.getByTestId('chat-item-stopped')).toHaveText('Generation stopped');

    // the backend stopped the request to the LLM
    await expect.poll(() => getStreamState(firstQuestion)?.aborted).toBe(true);

    // the answer does not grow anymore. Shortly after stopping, the stored partial answer replaces the streamed one
    // (it may have a word more than shown before), so wait for that and compare the words only.
    const words = async () => (await answer.textContent())?.match(/word\d+/g) ?? [];
    await page.waitForTimeout(1_000);
    const partialAnswer = await words();
    await page.waitForTimeout(1_000);
    expect(await words()).toEqual(partialAnswer);
    expect(partialAnswer).not.toContain('word299');
  });

  await test.step('should answer a new message right after stopping', async () => {
    await sendMessage(page, configuration, { message: 'Wie sagt man auf Englisch Banane?' });
    await expect(chatItems.nth(3)).toContainText('banana');
    await expect(chatItems.nth(3).getByTestId('chat-item-stopped')).toHaveCount(0);
  });

  await test.step('should stop the answer with escape', async () => {
    await input.fill(secondQuestion);
    await input.press('Enter');

    await expect(chatItems.nth(5)).toContainText('word2');
    await input.press('Escape');

    await expect(chatItems.nth(5).getByTestId('chat-item-stopped')).toBeVisible();
    await expect.poll(() => getStreamState(secondQuestion)?.aborted).toBe(true);
  });

  await test.step('should keep the stopped answers after a reload', async () => {
    await page.reload();

    await expect(chatItems).toHaveCount(6);
    await expect(page.getByTestId('chat-item-stopped')).toHaveCount(2);
    await expect(chatItems.nth(1).getByTestId('chat-item-stopped')).toBeVisible();
    await expect(chatItems.nth(1)).toContainText('word3');
    await expect(chatItems.nth(5).getByTestId('chat-item-stopped')).toBeVisible();
  });
});
