/**
 * Creates the screenshots of docs/ux/chat-overhaul.md ("after" state). Not part of the test suite, run it with
 *
 *   TEST_DIR=./screenshots npx playwright test --project=chromium
 *
 * against the compose stack (see e2e/README.md). The images are written to docs/ux/img/after-*.png.
 */
import path from 'path';
import { Page } from '@playwright/test';
import { expect, test } from '../tests/utils/fixtures';
import {
  addBucketToConfiguration,
  addFilesInChatExtensionToConfiguration,
  addMCPToConfiguration,
  addMockModelToConfiguration,
  addUserArgsToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  globalConversationBucketName,
  globalUserBucketName,
  login,
  newChat,
  openChatSettings,
  openMyFiles,
  selectConfiguration,
  sendMessage,
  uniqueName,
  uploadFileWhileInChat,
  uploadFileWithPaperclip,
} from '../tests/utils/helper';

const IMG = path.join(__dirname, '..', '..', 'docs', 'ux', 'img');

async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(IMG, `after-${name}.png`) });
}

async function send(page: Page, configuration: { name: string }, message: string) {
  await page.getByPlaceholder(`Message ${configuration.name}`).fill(message);
  await page.getByTestId('chat-submit-button').click();
}

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(300_000);

test('screenshots of the chat', async ({ page, mockServerUrl, adminUser, testMcpServer }) => {
  const configuration = { name: 'Calendar Assistant', description: 'Books rooms and answers questions about files' };
  configuration.name = uniqueName('Assistant');

  await login(page, adminUser);
  await enterAdminArea(page);
  await createConfiguration(page, configuration);
  await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
  await addFilesInChatExtensionToConfiguration(page, configuration, { bucketName: globalConversationBucketName() });
  await addBucketToConfiguration(page, configuration, { bucketName: globalUserBucketName(), description: 'personal files' });
  await addUserArgsToConfiguration(page, configuration);
  await addMCPToConfiguration(page, configuration, {
    name: 'Calendar',
    endpoint: testMcpServer.url,
    transport: 'streamableHttp',
  });

  await enterUserArea(page);
  await newChat(page);
  await selectConfiguration(page, configuration);
  await shot(page, '01-empty-chat');

  // personal files in the composer
  await uploadFileWhileInChat(page, 'e2e-test.txt');
  await shot(page, '09-my-files-popover');
  await page.keyboard.press('Escape');

  // chat settings
  await openChatSettings(page);
  await shot(page, '08-chat-settings-popover');
  await page.keyboard.press('Escape');

  // sources and the inspector
  await uploadFileWithPaperclip(page, 'birthdays.pdf');
  await sendMessage(page, configuration, { message: 'Welche Geburtstage stehen in der Datei?' });
  await page.getByTestId('source-quote-toggle').first().click();
  await shot(page, '02-conversation-sources');
  await page.getByTestId('source-open').first().click();
  await expect(page.getByTestId('inspector-passages')).toBeVisible();
  await shot(page, '11-inspector-source');
  await page.getByTestId('inspector-source-tabs').getByText('Document').click();
  await expect(page.locator('.pdf-viewport canvas').first()).toBeVisible();
  await shot(page, '12-inspector-pdf');
  await page.getByTestId('inspector-close').click();

  // a form of a tool and a page to open
  await send(page, configuration, 'Please book the meeting room for us');
  await expect(page.getByTestId('chat-card-form')).toHaveAttribute('data-status', 'waiting');
  await shot(page, '15-form-card');
  await page.getByTestId('chat-card-form').getByLabel('Title').fill('Team meeting');
  await page.getByTestId('chat-card-form').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);

  await send(page, configuration, 'Please log me in at the calendar');
  await expect(page.getByTestId('chat-card-url')).toHaveAttribute('data-status', 'waiting');
  await shot(page, '19-url-card');
  await page.getByTestId('chat-card-url').getByRole('button', { name: 'Decline' }).click();
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);

  await send(page, configuration, 'Please trigger a tool failure');
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);
  await shot(page, '16-tool-error');
  await page.getByTestId('tool-card').filter({ hasText: 'failing_tool' }).getByRole('button', { name: /details/i }).click();
  await shot(page, '20-inspector-tool');
  await page.getByTestId('inspector-close').click();

  // undo of a deleted chat
  await page.getByTestId('conversation-item').first().getByRole('button', { name: 'menu' }).click();
  await page.locator('.mantine-Menu-dropdown').getByText('Delete').click();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await shot(page, '04-delete-undo');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('chat-card-url')).toBeVisible();

  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, '17-mobile-chat');
  await page.getByTestId('toggle-chat-list').click();
  await expect(page.getByRole('navigation', { name: 'conversations' })).toBeVisible();
  await shot(page, '18-mobile-chat-list');
  await page.keyboard.press('Escape');
  await page.getByTestId('my-files-button').click();
  await shot(page, '21-mobile-bottom-sheet');
  await page.keyboard.press('Escape');
  await openMyFiles(page).catch(() => {});
});
