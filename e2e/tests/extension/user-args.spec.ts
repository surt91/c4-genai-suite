import { expect } from '@playwright/test';
import { addExtensionViaApi, createMockAssistantViaApi } from '../utils/api';
import { test } from '../utils/fixtures';
import {
  disableUserArgsInConfiguration,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  login,
  newChat,
  resetFilter,
  selectConfiguration,
  sendMessage,
  setFilter,
  uniqueName,
} from '../utils/helper';

type TUserArgs = {
  dateUserArgument: string;
  stringUserArgument: string;
  multiSelectUserArgument: string[];
  singleSelectUserArgument: string;
  dateRangeUserArgument: {
    from: string;
    until: string;
  };
};

test('user args', async ({ page, mockServerUrl, adminUser, adminApi }) => {
  const configuration = { name: uniqueName('E2E-Test-User-Args') };
  const filter = {
    string: 'Test-String',
    date: '2024-03-12',
    dateFrom: '2025-01-01',
    dateUntil: '2025-12-31',
    singleSelect: 'value2',
    multiSelect: ['value3', 'value4', 'value5'],
  };

  await test.step('setup', async () => {
    const assistant = await createMockAssistantViaApi(adminApi, configuration.name, mockServerUrl);
    await addExtensionViaApi(adminApi, assistant, 'user-args-test', {});
    await login(page, adminUser);
    await newChat(page);
  });

  await test.step('set filter', async () => {
    await selectConfiguration(page, configuration);

    await setFilter(page, filter);

    const dateSelector = await page.waitForSelector(`:has-text("Date: ${filter.date}")`);
    expect(dateSelector).toBeDefined();

    const stringSelector = await page.waitForSelector(`:has-text("String: ${filter.string}")`);
    expect(stringSelector).toBeDefined();

    const multiSelector = await page.waitForSelector(`:has-text("Multi Select: ${filter.multiSelect.join(', ')}")`);
    expect(multiSelector).toBeDefined();

    const singleSelector = await page.waitForSelector(`:has-text("Single Select: ${filter.singleSelect}")`);
    expect(singleSelector).toBeDefined();

    const dateRangeSelector = await page.waitForSelector(
      `:has-text("Date Range: (from: ${filter.dateFrom}, until: ${filter.dateUntil})")`,
    );
    expect(dateRangeSelector).toBeDefined();

    await expectA11yCompliant(page);
  });

  await test.step('send prompt', async () => {
    await sendMessage(page, configuration, { message: 'Give me the user arguments by executing a tool' });

    const markdownResponse = page.getByTestId('chat-item-debug').last();
    await markdownResponse.waitFor();

    const textContent = await markdownResponse.textContent();
    const result = JSON.parse(textContent || '') as TUserArgs;

    expect({
      dateUserArgument: filter.date,
      dateRangeUserArgument: {
        from: filter.dateFrom,
        until: filter.dateUntil,
      },
      singleSelectUserArgument: filter.singleSelect,
      multiSelectUserArgument: filter.multiSelect,
      stringUserArgument: filter.string,
    }).toStrictEqual(result);
  });

  await test.step('reset filter', async () => {
    await resetFilter(page);

    const dateSelector = await page.$(`:text-matches("Date:.*", "i")`);
    expect(dateSelector).toBeDefined();

    const stringSelector = await page.$(`:text-matches("String:.*", "i")`);
    expect(stringSelector).toBeDefined();

    const multiSelector = await page.waitForSelector(`:has-text("Multi Select: value2, value3")`);
    expect(multiSelector).toBeDefined();

    const singleSelector = await page.waitForSelector(`:has-text("Single Select: value4")`);
    expect(singleSelector).toBeDefined();

    const dateRangeSelector = await page.$(`:text-matches("Date Range:.*", "i")`);
    expect(dateRangeSelector).toBeDefined();
  });

  await test.step('send prompt after reset', async () => {
    await sendMessage(page, configuration, { message: 'Give me the user arguments by executing a tool' });

    const markdownResponse = page.getByTestId('chat-item-debug').last();
    await markdownResponse.waitFor();

    const textContent = await markdownResponse.textContent();
    const result = JSON.parse(textContent || '') as TUserArgs;

    expect({
      dateRangeUserArgument: { from: '', until: '' },
      dateUserArgument: '',
      singleSelectUserArgument: 'value4',
      multiSelectUserArgument: ['value2', 'value3'],
      stringUserArgument: '',
    }).toStrictEqual(result);
  });

  await test.step('hide filter if extension is deactivated', async () => {
    await enterAdminArea(page);
    await disableUserArgsInConfiguration(page, configuration);

    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);

    const filterButton = await page.$('button:has-text("Filter")');
    expect(filterButton).toBeNull();
    const filterChip = await page.$(`:text-matches("Date:.*", "i")`);
    expect(filterChip).toBeNull();
  });
});
