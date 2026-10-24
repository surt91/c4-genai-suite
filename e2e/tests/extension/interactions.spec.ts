import { APIRequestContext, Page } from '@playwright/test';
import { addExtensionViaApi, createMockAssistantViaApi, TestUser } from '../utils/api';
import { expect, test } from '../utils/fixtures';
import { expectA11yCompliant, login, newChat, selectConfiguration, uniqueName } from '../utils/helper';
import { TEST_MCP_FAILURE, TEST_MCP_TOOLS } from '../utils/test-mcp-server';

/** Creates an assistant with the mock LLM and the test MCP server, logs in and starts a chat with the assistant. */
async function setUp(
  page: Page,
  adminApi: APIRequestContext,
  user: TestUser,
  options: { mockServerUrl: string; mcpUrl: string; serverName: string; allowedDomains?: string },
) {
  const configuration = { name: uniqueName('E2E-Interactions') };
  const assistant = await createMockAssistantViaApi(adminApi, configuration.name, options.mockServerUrl);
  // the form of the MCP extension is tested in mcp-server.spec.ts
  await addExtensionViaApi(adminApi, assistant, 'mcp', {
    serverName: options.serverName,
    endpoint: options.mcpUrl,
    transport: 'streamableHttp',
    allowedDomains: options.allowedDomains,
    schema: Object.fromEntries(Object.values(TEST_MCP_TOOLS).map((tool) => [tool, { enabled: true }])),
  });
  await login(page, user);
  await newChat(page);
  await selectConfiguration(page, configuration);
  return configuration;
}

/** Sends a message without waiting for the answer (it waits for the user). */
async function send(page: Page, configuration: { name: string }, message: string) {
  await page.getByPlaceholder(`Message ${configuration.name}`).fill(message);
  await page.getByTestId('chat-submit-button').click();
}

async function waitForAnswer(page: Page) {
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);
}

test('confirms a form of a tool inline and keeps the result', async ({
  page,
  mockServerUrl,
  adminUser,
  adminApi,
  testMcpServer,
}) => {
  const serverName = uniqueName('Calendar');
  let configuration = { name: '' };

  await test.step('set up', async () => {
    configuration = await setUp(page, adminApi, adminUser, { mockServerUrl, mcpUrl: testMcpServer.url, serverName });
  });

  const card = page.getByTestId('chat-card-form');

  await test.step('shows the form as a card with who asks, waiting for the user', async () => {
    await send(page, configuration, 'Please book the meeting room for us');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-status', 'waiting');
    await expect(card).toContainText(`${serverName} asks`);
    await expect(card).toContainText('Book the meeting room Galaxy?');
    await expect(card).toContainText(/Expires in \d+:\d{2}/);
    // the composer points to the waiting request
    await expect(page.getByTestId('composer-waiting-hint')).toBeVisible();
    await expectA11yCompliant(page);
  });

  await test.step('confirms the form', async () => {
    await card.getByLabel('Title').fill('Team meeting');
    await card.getByRole('button', { name: 'Confirm' }).click();
    await waitForAnswer(page);
    await expect(page.getByText('Booked: Team meeting').first()).toBeVisible();
    await expect(card).toHaveAttribute('data-status', 'accepted');
    await expect(card.getByTestId('chat-card-result')).toHaveText('Confirmed: title: Team meeting');
    await expect(page.getByTestId('composer-waiting-hint')).toBeHidden();
  });

  await test.step('keeps the result after a reload', async () => {
    await page.reload();
    await expect(card).toHaveAttribute('data-status', 'accepted');
    await expect(card.getByTestId('chat-card-result')).toHaveText('Confirmed: title: Team meeting');
  });

  await test.step('declines a form', async () => {
    await send(page, configuration, 'Please book the meeting room again');
    const second = page.getByTestId('chat-card-form').last();
    await expect(second).toHaveAttribute('data-status', 'waiting');
    await second.getByRole('button', { name: 'Decline' }).click();
    await waitForAnswer(page);
    await expect(second).toHaveAttribute('data-status', 'declined');
    await expect(page.getByText('Booking decline').first()).toBeVisible();
  });
});

test('asks for the consent before opening a page of a tool', async ({
  page,
  mockServerUrl,
  adminUser,
  adminApi,
  testMcpServer,
}) => {
  const serverName = uniqueName('Calendar');
  let configuration = { name: '' };

  await test.step('set up', async () => {
    configuration = await setUp(page, adminApi, adminUser, { mockServerUrl, mcpUrl: testMcpServer.url, serverName });
  });

  const card = page.getByTestId('chat-card-url');
  const popups: Page[] = [];
  page.on('popup', (popup) => popups.push(popup));

  await test.step('shows the domain and a warning, but does not open the page by itself', async () => {
    await send(page, configuration, 'Please log me in at the calendar');
    await expect(card).toHaveAttribute('data-status', 'waiting');
    await expect(card).toContainText(`${serverName} wants you to open a page`);
    await expect(card.getByTestId('chat-card-domain')).toHaveText('localhost');
    await expect(card).toContainText('This page does not belong to');
    await expectA11yCompliant(page);
    expect(popups).toHaveLength(0);
  });

  await test.step('shows the full address on demand', async () => {
    await card.getByRole('button', { name: 'Show full address' }).click();
    await expect(card).toContainText(`${testMcpServer.loginUrl}/`);
  });

  await test.step('opens the page in a new tab and waits for the completion', async () => {
    const popupPromise = page.waitForEvent('popup');
    await card.getByRole('button', { name: 'Open in new tab' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    // the page reports the completion to the server, which notifies the chat
    await expect(popup.getByRole('heading', { name: /Logged in/ })).toBeVisible();
    await popup.close();

    await expect(card).toHaveAttribute('data-status', 'completed');
    await waitForAnswer(page);
    await expect(page.getByText('Logged in at the calendar service').first()).toBeVisible();
  });

  await test.step('keeps the result after a reload, without the query of the address', async () => {
    await page.reload();
    await expect(card).toHaveAttribute('data-status', 'completed');
    await expect(card).toContainText('localhost');
    await expect(page.getByText('e2e-secret')).toHaveCount(0);
  });

  await test.step('declines to open a page', async () => {
    await send(page, configuration, 'Please log me in at the calendar again');
    const second = page.getByTestId('chat-card-url').last();
    await expect(second).toHaveAttribute('data-status', 'waiting');
    await second.getByRole('button', { name: 'Decline' }).click();
    await waitForAnswer(page);
    await expect(second).toHaveAttribute('data-status', 'declined');
    expect(popups).toHaveLength(1);
  });
});

test('blocks pages of domains that are not allowed', async ({ page, mockServerUrl, adminUser, adminApi, testMcpServer }) => {
  let configuration = { name: '' };

  await test.step('set up with an allowlist', async () => {
    configuration = await setUp(page, adminApi, adminUser, {
      mockServerUrl,
      mcpUrl: testMcpServer.url,
      serverName: uniqueName('Calendar'),
      allowedDomains: 'calendar.example.com',
    });
  });

  await test.step('does not show the address', async () => {
    await send(page, configuration, 'Please log me in at the calendar');
    const card = page.getByTestId('chat-card-url');
    await expect(card).toHaveAttribute('data-status', 'blocked');
    await expect(card).toContainText('The page was blocked');
    await expect(card.getByRole('button', { name: 'Open in new tab' })).toHaveCount(0);
    await waitForAnswer(page);
  });
});

test('marks failed tools as errors and shows the details', async ({
  page,
  mockServerUrl,
  adminUser,
  adminApi,
  testMcpServer,
}) => {
  const serverName = uniqueName('Calendar');
  let configuration = { name: '' };

  await test.step('set up', async () => {
    configuration = await setUp(page, adminApi, adminUser, { mockServerUrl, mcpUrl: testMcpServer.url, serverName });
  });

  const toolCard = page.getByTestId('tool-card').filter({ hasText: `${serverName}: failing_tool` });

  await test.step('shows the failed tool as error', async () => {
    await send(page, configuration, 'Please trigger a tool failure');
    await waitForAnswer(page);
    await expect(toolCard).toHaveAttribute('data-status', 'error');
    await expect(toolCard).toContainText(TEST_MCP_FAILURE);
    // the debug output is shown, too
    await expect(page.getByTestId('chat-item-debug').last()).toBeVisible();
  });

  await test.step('shows the details in the inspector', async () => {
    await toolCard.getByRole('button', { name: /details/i }).click();
    const inspector = page.getByTestId('inspector');
    await expect(inspector.getByTestId('inspector-title')).toHaveText(`${serverName}: failing_tool`);
    await expect(inspector.getByTestId('inspector-tool')).toContainText(TEST_MCP_FAILURE);
    await inspector.getByTestId('inspector-close').click();
    await expect(inspector).toBeHidden();
  });

  await test.step('keeps the error after a reload', async () => {
    await page.reload();
    await expect(toolCard).toHaveAttribute('data-status', 'error');
    await expect(toolCard).toContainText(TEST_MCP_FAILURE);
  });
});
