import { expect } from '@playwright/test';
import { createMockAssistantViaApi } from '../utils/api';
import { config } from '../utils/config';
import { test } from '../utils/fixtures';
import {
  addMCPToConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';

test('mcp', async ({ page, mockServerUrl, adminUser, adminApi }) => {
  const configuration = { name: uniqueName('E2E-Test-MCP') };

  await test.step('setup', async () => {
    await createMockAssistantViaApi(adminApi, configuration.name, mockServerUrl);
    await login(page, adminUser);
    await enterAdminArea(page);
  });

  await test.step('add mcp extension', async () => {
    await addMCPToConfiguration(page, configuration, { name: 'MCP Fetch', endpoint: config.MCP_SERVER_ENDPOINT });
  });

  await test.step('create new chat', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('send prompt', async () => {
    await sendMessage(page, configuration, {
      message: 'When was the building built according to this Wikipedia page: https://de.wikipedia.org/wiki/Amtsgericht_Ohligs',
    });
    const tool = await page.waitForSelector(`:has-text("MCP Fetch: fetch")`);
    expect(tool).toBeDefined();
    const result = await page.waitForSelector(`:has-text("1895")`);
    expect(result).toBeDefined();
  });
});
