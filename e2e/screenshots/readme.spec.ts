/**
 * Creates the screenshots of the README (docs/img/*.png). Not part of the test suite. Run it against a fresh compose
 * stack with real embeddings (e.g. `docker compose --profile ollama up`, see e2e/README.md for the environment):
 *
 *   TEST_DIR=./screenshots npx playwright test readme --project=chromium --no-deps
 *
 * The answers come from the mock LLM, extended by the responses below. Shrink the images afterwards, e.g. with
 * `magick <file> -strip -dither None -colors 256 PNG8:<file> && optipng -o5 <file>`.
 */
import path from 'path';
import { Page } from '@playwright/test';
import { ensureAssistantViaApi, INITIAL_ADMIN, newAdminApiContext } from '../tests/utils/api';
import { config } from '../tests/utils/config';
import { expect, test } from '../tests/utils/fixtures';
import {
  addBucketToConfiguration,
  addFilesInChatExtensionToConfiguration,
  addMCPToConfiguration,
  addMockModelToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  openAssistant,
  save,
  selectConfiguration,
  sendMessage,
  uploadFileWhileInChat,
  uploadFileWithPaperclip,
} from '../tests/utils/helper';
import { addMockResponses } from '../tests/utils/mock-llm-server';

const IMG = path.join(__dirname, '..', '..', 'docs', 'img');

async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(IMG, `${name}.png`) });
}

async function send(page: Page, assistant: { name: string }, message: string) {
  await page.getByPlaceholder(`Message ${assistant.name}`).fill(message);
  await page.getByTestId('chat-submit-button').click();
  await page.waitForTimeout(1000);
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0, { timeout: 60_000 });
}

const BIRTHDAYS = `*birthdays.pdf* lists three birthdays:

| Name | Birthday |
|---|---|
| Darkwing Duck | March 14, 1892 |
| Daisy Duck | February 7, 1228 |
| Daniel Düsentrieb | January 2, 3456 |

The next one is **Daisy Duck's** on February 7.`;

addMockResponses(
  { match: /birthday/i, matchSystem: /Summarize the following content/i, response: 'Birthdays in the sheet' },
  { match: /onboarding/i, matchSystem: /Summarize the following content/i, response: 'Onboarding checklist' },
  { match: /release notes/i, matchSystem: /Summarize the following content/i, response: 'Release notes draft' },
  { match: /meeting room/i, matchSystem: /Summarize the following content/i, response: 'Meeting room booking' },
  {
    match: /onboarding/i,
    response: `Here is a short onboarding checklist for new team members:

1. **Accounts** – laptop, email, chat and the code repository
2. **People** – a buddy for the first weeks and a meeting with every team
3. **Product** – a demo, the architecture overview and the roadmap
4. **First task** – a small, well-defined issue with a review by the buddy`,
  },
  { match: /release notes/i, response: 'Sure! Which changes should the release notes cover?' },
  {
    match: /birthdays.*file/i,
    toolCall: { namePattern: /files/i, arguments: { query: 'birthday' }, transformResult: () => BIRTHDAYS },
  },
);

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(300_000);

test('screenshots of the README', async ({ page, mockServerUrl, testMcpServer }) => {
  // a user with a real name and the buckets for personal files and chat attachments
  const api = await newAdminApiContext(INITIAL_ADMIN);
  const user = { name: 'Alex Morgan', email: 'alex.morgan@example.com', password: 'test-secret' };
  // may already exist from a previous run
  await api.post('/api/users', { data: { ...user, userGroupIds: ['admin'] } });
  const { items } = (await (await api.get('/api/buckets')).json()) as { items: { name: string; type: string }[] };
  const bucket = async (name: string, type: 'user' | 'conversation') => {
    const existing = items.find((x) => x.type === type);
    if (existing) {
      return existing.name;
    }
    const response = await api.post('/api/buckets', {
      data: {
        name,
        endpoint: config.REIS_ENDPOINT,
        indexName: '',
        isDefault: false,
        perUserQuota: 20,
        allowedFileNameExtensions: [],
        type,
        fileSizeLimits: { general: 10 },
      },
    });
    expect(response.ok()).toBeTruthy();
    return name;
  };
  const userBucket = await bucket('Personal files', 'user');
  const conversationBucket = await bucket('Chat attachments', 'conversation');
  // the chat page needs an assistant to open a conversation after the login
  await ensureAssistantViaApi(api, 'Local Llama');
  await api.dispose();

  const assistant = { name: 'Team Assistant', description: 'everyday work of a team: files, calendar and quick questions' };
  await login(page, user);
  await enterAdminArea(page);
  await createConfiguration(page, assistant);
  await addMockModelToConfiguration(page, assistant, { endpoint: mockServerUrl, modelName: 'gpt-5-mini' });
  await addFilesInChatExtensionToConfiguration(page, assistant, { bucketName: conversationBucket });
  await addMCPToConfiguration(page, assistant, { name: 'Calendar', endpoint: testMcpServer.url, transport: 'streamableHttp' });
  await openAssistant(page, assistant.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Calculator', exact: true }).click();
  await save(page);
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await shot(page, 'admin-assistant');
  // personal files (incompatible with "Search Files in Chat" in the admin view, so added after the screenshot)
  await addBucketToConfiguration(page, assistant, { bucketName: userBucket, description: 'personal files of the user' });

  // a few chats for the chat list
  await enterUserArea(page);
  await newChat(page);
  await selectConfiguration(page, assistant);
  await send(page, assistant, 'Draft the release notes for version 2.4');
  await newChat(page);
  await send(page, assistant, 'Write a short onboarding checklist for new team members');

  // personal files
  await newChat(page);
  await uploadFileWhileInChat(page, 'e2e-test.txt');
  await uploadFileWhileInChat(page, 'birthdays.pptx');
  await shot(page, 'my-files');
  await page.keyboard.press('Escape');

  // sources and the inspector
  await uploadFileWithPaperclip(page, 'birthdays.pdf');
  await sendMessage(page, assistant, { message: 'Which birthdays are in the attached file?' });
  await page.getByTestId('source-open').first().click();
  await expect(page.getByTestId('inspector-passages')).toBeVisible();
  await shot(page, 'chat-sources');
  await page.getByTestId('inspector-source-tabs').getByText('Document').click();
  await expect(page.locator('.pdf-viewport canvas').first()).toBeVisible();
  await shot(page, 'inspector-pdf');
  await page.getByTestId('inspector-close').click();

  // a form of an MCP tool
  await newChat(page);
  await page.getByPlaceholder(`Message ${assistant.name}`).fill('Please book the meeting room for our team meeting');
  await page.getByTestId('chat-submit-button').click();
  await expect(page.getByTestId('chat-card-form')).toHaveAttribute('data-status', 'waiting');
  await page.getByTestId('chat-card-form').getByLabel('Title').fill('Team meeting');
  await shot(page, 'form-card');
  await page.getByTestId('chat-card-form').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);

  // mobile
  await page.getByTestId('conversation-item').filter({ hasText: 'Birthdays' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, 'mobile');
});
