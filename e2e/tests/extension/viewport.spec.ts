import { expect } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  expectElementInYRange,
  login,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';

test('Chat viewport scrolling', async ({ page, mockServerUrl, adminUser }) => {
  const configuration = { name: uniqueName('E2E-Test'), description: '' };

  await test.step('should login', async () => {
    await login(page, adminUser);
  });

  await test.step('should add mock assistant', async () => {
    configuration.description = `Example for the ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
    await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
  });

  await test.step('should reply to questions in the chat', async () => {
    await enterUserArea(page);
    await selectConfiguration(page, configuration);
    await sendMessage(page, configuration, {
      message: 'Wie sagt man auf Englisch Banane. Antworte ohne Großbuchstaben in einem Wort.',
    });
    const testoutput = await page.waitForSelector(`:has-text("banana")`);
    expect(testoutput).toBeDefined();
  });

  await test.step('should not show previous reply in viewport after sending question', async () => {
    await sendMessage(page, configuration, {
      message: 'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
    });
    const element = page.getByText(/^Wie sagt man auf Englisch Banane.+Friendly AI/);
    await expectElementInYRange(element, -200, 96);
  });

  await test.step('should show current question in viewport after sending question', async () => {
    const element = page.getByText(
      'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
    );
    await expectElementInYRange(element, 88, 180);
  });

  await test.step('should not scroll down when reply is too long for viewport', async () => {
    await expectElementInYRange(page.getByRole('cell', { name: 'a', exact: true }), 142, 500);
    await expectElementInYRange(page.getByRole('cell', { name: 'm', exact: true }), 500, 2000);
    await expectElementInYRange(page.getByRole('cell', { name: 'z', exact: true }), 700, 2000);
  });

  await test.step('should show auto-scroll button when reply is too long for viewport', async () => {
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await expect(autoScrollButton).toHaveCSS('opacity', '1');
  });

  await test.step('should hide auto-scroll button when scrolled to bottom', async () => {
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await autoScrollButton.click();
    await expect(autoScrollButton).toHaveCSS('opacity', '0');
  });

  await test.step('should show and allow clicking auto-scroll button when user scrolls up', async () => {
    const chatContainer = page.getByTestId('chat-history');
    // The button hides as soon as the (smooth) scrolling is close to the bottom. Wait until the scrolling has finished,
    // otherwise it would override our scrolling below.
    await expect.poll(() => chatContainer.evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight)).toBeLessThan(2);
    // the wheel event scrolls the element under the mouse
    await chatContainer.hover();
    await page.mouse.wheel(0, -800);
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await expect(autoScrollButton).toHaveCSS('opacity', '1');
    await autoScrollButton.click();
    await expect(autoScrollButton).toHaveCSS('opacity', '0');
  });

  await test.step('should stop showing auto-scroll button, if new chat is opened, while button was visible', async () => {
    await sendMessage(page, configuration, {
      message: 'Write a two-column table with the upper case letters from A to Z followed by a random short word in the rows.',
    });
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await expect(autoScrollButton).toHaveCSS('opacity', '1');
    // Start a new chat - with mock LLM server the backend creates real conversations
    await page.getByRole('button', { name: 'New chat' }).click();
    await expect(autoScrollButton).toHaveCSS('opacity', '0');
  });
});

test('Mobile navigation via the header', async ({ page, mockServerUrl, adminUser }) => {
  const configuration = { name: uniqueName('E2E-Mobile'), description: '' };

  await test.step('should login and add a mock assistant', async () => {
    await login(page, adminUser);
    configuration.description = `Example for the ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
    await enterUserArea(page);
    await selectConfiguration(page, configuration);
    await sendMessage(page, configuration, { message: 'What is the capital of Germany?' });
  });

  await test.step('should switch to the compact layout when the window gets small', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    // the chat list is a closed drawer now, the header shows a burger button
    await expect(page.getByRole('navigation', { name: 'conversations' })).toBeHidden();
    await expect(page.getByTestId('toggle-chat-list')).toBeVisible();
    await expect(page.getByTestId('header-new-chat')).toBeVisible();
  });

  await test.step('should open the chat list from the header and switch the chat', async () => {
    const chatUrl = page.url();
    await page.getByTestId('toggle-chat-list').click();
    const drawer = page.getByRole('navigation', { name: 'conversations' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'New chat' }).click();
    await expect(drawer).toBeHidden();
    await page.waitForURL((url) => url.href !== chatUrl);

    await page.getByTestId('toggle-chat-list').click();
    await drawer.getByTestId('conversation-item').first().getByRole('button').first().click();
    await expect(drawer).toBeHidden();
    await page.waitForURL(chatUrl);
    await expect(page.getByText('Berlin').first()).toBeVisible();
    await expectA11yCompliant(page);
  });

  await test.step('should show the details as a full screen drawer with a header button', async () => {
    await page.getByTestId('docs-icon').click();
    const inspector = page.getByTestId('inspector');
    await expect(inspector).toBeVisible();
    // hide the details and show them again from the header
    await page.keyboard.press('Control+.');
    await expect(inspector).toBeHidden();
    await page.getByTestId('toggle-inspector').click();
    await expect(inspector).toBeVisible();
    await inspector.getByTestId('inspector-close').click();
    await expect(inspector).toBeHidden();
    await expect(page.getByTestId('toggle-inspector')).toHaveCount(0);
  });

  await test.step('should show the chat settings as a bottom sheet', async () => {
    await page.getByTestId('chat-settings-button').click();
    const sheet = page.getByRole('dialog', { name: 'Chat settings' });
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});
