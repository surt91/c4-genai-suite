import { randomUUID } from 'crypto';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, Locator, Page } from '@playwright/test';
import { config } from './config';

const INITIAL_ADMIN = { email: 'admin@example.com', password: 'secret' };

/**
 * Logs in via the API (faster than the login form) and opens the chat. `page.request` shares the cookies with the
 * page, so the page has the session as well. Use `loginViaUi` in tests about the login itself.
 */
export async function login(page: Page, user: { email: string; password: string } = INITIAL_ADMIN) {
  const response = await page.request.post(`${config.URL}/api/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(response.ok(), `login of ${user.email} via API failed: ${response.status()}`).toBeTruthy();
  await page.goto(`${config.URL}/chat`);
  await waitForConversation(page);
  await page.getByTestId('menu user').waitFor({ state: 'visible' });
}

/** Logs in with the login form. */
export async function loginViaUi(page: Page, user: { email: string; password: string } = INITIAL_ADMIN) {
  await page.goto(`${config.URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await waitForConversation(page);
  await page.getByTestId('menu user').waitFor({ state: 'visible' });
}

// After login (or when entering the chat area) the app redirects from /chat to a new conversation /chat/<id>
// asynchronously. Wait for it, otherwise the redirect could override a navigation the test started in the meantime.
// (global.setup.ts makes sure there is an assistant, which is required for the redirect.)
async function waitForConversation(page: Page) {
  await page.waitForURL(/\/chat\/[^/]+$/);
}

export async function goto(page: Page, relativePath: `/${string}` | '') {
  await page.goto(`${config.URL}${relativePath}`);
}

export async function enterAdminArea(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Admin' }).click();
  await page.waitForURL(/\/admin/);
}

export async function logout(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL(`${config.URL}/login`);
}

export async function hasMenuItem(page: Page, item: { name: string }) {
  await page.getByTestId('menu user').click();
  await page.waitForSelector('[role="menu"]');
  const locator = page.getByRole('menuitem', { name: item.name });
  return (await locator.count()) > 0;
}

export async function enterUserArea(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Chat' }).click();
  await waitForConversation(page);
  await page.getByRole('button', { name: 'New chat' }).waitFor({ state: 'visible' });
}

export async function newChat(page: Page) {
  await page.getByRole('button', { name: 'New chat' }).click();
  await page.waitForURL('**/chat/*');
  const welcomeText = page.getByText('How may I help you?');
  await welcomeText.waitFor();
}

export async function sendMessage(page: Page, configuration: { name: string }, content: { message: string }) {
  const chatItems = page.getByTestId('chat-item');
  const numberOfChatItems = await chatItems.count();
  await page.getByPlaceholder(`Message ${configuration.name}`).fill(content.message);
  await page.getByTestId('chat-submit-button').click();
  // wait until the answer is complete: there is a chat item for the question and the answer, and the UI does not show
  // the AI as writing (the loading dot) anymore
  await expect.poll(() => chatItems.count()).toBeGreaterThanOrEqual(numberOfChatItems + 2);
  await expect(page.locator('.animate-loading-dot')).toHaveCount(0);
}

export async function save(page: Page, expectDetached = true) {
  const button = page.getByRole('button', { name: 'Save' });
  await button.click();
  if (expectDetached) {
    await button.waitFor({ state: 'detached' });
  }
}

export async function createConfiguration(page: Page, configuration: { name: string; description: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('button', { name: 'Create assistant' }).click();

  await page.getByLabel(/^Name/).fill(configuration.name);
  if (configuration.description) {
    await page.getByLabel(/^Description/).fill(`Example for the ${configuration.description}`);
  }

  await save(page);
}

export async function disableConfiguration(page: Page, configuration: { name: string; description: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.locator('li').filter({ hasText: configuration.name }).getByTestId('more-actions').click();

  await page.click('button:has-text("Edit")');
  await page.locator('label').filter({ hasText: 'Enabled' }).locator('span').nth(2).click();
  await page.getByRole('button', { name: 'Save' }).click();
}

export async function deleteConfiguration(page: Page, configuration: { name: string; description: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.locator('li').filter({ hasText: configuration.name }).getByTestId('more-actions').click();

  await page.click('button:has-text("Delete")');
  const confirmButton = page.locator('button:has-text("Confirm")');
  await page.click('button:has-text("Confirm")');
  await confirmButton.waitFor({ state: 'detached' });
}

export async function clearMessages(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Clear conversations' }).click();
  const confirm = page.getByRole('button', { name: 'Confirm deletion' });
  await confirm.click();
  await confirm.waitFor({ state: 'detached' });
}

export async function editBucket(
  page: Page,
  bucket: { name: string; endpoint?: string; fileSizeLimits?: Record<string, number> },
) {
  await page.getByRole('link', { name: 'Files', exact: true }).click();

  await page.getByRole('link', { name: bucket.name }).locator('..').getByTestId('more-actions').click();
  await page.click('button:has-text("Edit")');

  if (bucket.endpoint) {
    await page.getByLabel(/^Endpoint/).fill(bucket.endpoint);
  }

  if (bucket.fileSizeLimits) {
    // first, remove all
    const elements = page.getByTestId(/^fileSizeLimitsDynamic.\d+.remove$/);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      await elements.nth(0).scrollIntoViewIfNeeded();
      await elements.nth(0).click();
    }
    await page.getByTestId('fileSizeLimitsGeneral.value').scrollIntoViewIfNeeded();

    if (bucket.fileSizeLimits.general != null) {
      await page.getByTestId('fileSizeLimitsGeneral.value').fill(bucket.fileSizeLimits.general.toFixed(1));
    }

    let i = 0;
    for (const [_, [k, v]] of Object.entries(bucket.fileSizeLimits).entries()) {
      if (k !== 'general') {
        await page.getByTestId(`fileSizeLimitsDynamic.add`).click();

        await page.getByTestId(`fileSizeLimitsDynamic.${i}.value`).scrollIntoViewIfNeeded();
        await page.getByTestId(`fileSizeLimitsDynamic.${i}.key`).fill(k);
        await page.getByTestId(`fileSizeLimitsDynamic.${i}.value`).fill(v.toFixed(1));
        ++i;
      }
    }
  }

  await page.getByRole('button', { name: 'Test' }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: /^Bucket is valid./ })
    .getByRole('button')
    .click();
  await save(page);
}

/**
 * Opens the admin page of the assistant and waits until it is shown. Otherwise the next actions could still be
 * performed on the previously shown page (e.g. "Add Extension" of another assistant).
 */
export async function openAssistant(page: Page, name: string | RegExp) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: name }).click();
  await expect(page.getByRole('heading', { level: 2, name, exact: typeof name === 'string' })).toBeVisible();
}

export async function addBucketToConfiguration(
  page: Page,
  configuration: { name: string },
  files: { bucketName: string; description: string },
) {
  await openAssistant(page, configuration.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files', exact: true }).click();
  await page.getByLabel('Description').fill(files.description);
  await selectOption(page, 'Bucket', files.bucketName);
  await page.getByLabel('Take').fill('5');
  await save(page);
}

export async function addUserArgsToConfiguration(page: Page, configuration: { name: string }) {
  await openAssistant(page, configuration.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page
    .locator('*')
    .filter({ hasText: /^DEV: User ArgsShows the current user argstool$/ })
    .nth(1)
    .click();
  await save(page);
}

export async function addMCPToConfiguration(
  page: Page,
  configuration: { name: string },
  mcp: { name: string; endpoint: string; transport?: 'sse' | 'streamableHttp'; allowedDomains?: string },
) {
  await openAssistant(page, configuration.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page
    .locator('*')
    .filter({ hasText: /^MCP ToolsMCP Server Integrationtool$/ })
    .nth(1)
    .click();
  await page.getByLabel('Server Name').fill(mcp.name);
  await page.getByLabel('Endpoint').fill(mcp.endpoint);
  if (mcp.transport) {
    await selectOption(page, 'Transport Protocol', mcp.transport);
  }
  if (mcp.allowedDomains) {
    await page.getByLabel('Allowed domains for pages to open').fill(mcp.allowedDomains);
  }

  const refreshSchemaButton = page.getByRole('button', { name: 'Refresh Schema' });
  await refreshSchemaButton.waitFor({ state: 'visible' });
  await refreshSchemaButton.click();

  await refreshSchemaButton.waitFor({ state: 'hidden' });

  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    await checkbox.check();
  }

  await save(page);
}

export async function disableUserArgsInConfiguration(page: Page, configuration: { name: string }) {
  await openAssistant(page, configuration.name);
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'DEV: User Args', exact: true }).click();
  await page.getByRole('checkbox').uncheck();

  await save(page);
}

export async function addWholeFileExtensionToConfiguration(
  page: Page,
  configuration: { name: string },
  wholeFilesConfig: { bucketName: string },
) {
  await openAssistant(page, configuration.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Complete Files', exact: true }).click();
  await selectOption(page, 'Bucket', wholeFilesConfig.bucketName);

  await save(page);
}

export async function addVisionFileExtensionToConfiguration(page: Page, configuration: { name: string }, matchName?: RegExp) {
  const name = matchName ?? configuration.name;
  await openAssistant(page, name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Files Vision', exact: true }).click();

  await save(page);
}

export async function addFilesInChatExtensionToConfiguration(
  page: Page,
  configuration: { name: string },
  filesInChatConfig: { bucketName: string },
) {
  await openAssistant(page, configuration.name);
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();
  await selectOption(page, 'Bucket', filesInChatConfig.bucketName);
  await page.getByRole('checkbox').first().check();

  await save(page);
}

export async function deactivateFileInChatExtensionToConfiguration(page: Page, configuration: { name: string }) {
  await openAssistant(page, configuration.name);
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();
  await page
    .locator('div')
    .filter({ hasText: /^Enabled$/ })
    .getByRole('checkbox')
    .uncheck();

  await save(page);
}

/** Opens the chat settings (the settings of the assistant and the options of the extensions) in the composer. */
export async function openChatSettings(page: Page) {
  const popover = page.getByTestId('chat-settings-popover');
  // the state of the button, the popover may still be visible while it closes
  const button = page.getByTestId('chat-settings-button');
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    await button.click();
  }
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toBeVisible();
  return popover;
}

/** Applies the chat settings and waits until the popover is closed. */
export async function applyChatSettings(page: Page) {
  const popover = page.getByTestId('chat-settings-popover');
  // close the dropdowns of the inputs (e.g. a date picker), which may cover the buttons
  await popover.getByText('Chat settings', { exact: true }).click();
  await popover.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(popover).toBeHidden();
}

export async function resetFilter(page: Page) {
  await openChatSettings(page);
  await page.getByRole('button', { name: 'Reset all' }).click();
  await applyChatSettings(page);
}

export async function setFilter(
  page: Page,
  filter: { date: string; string: string; multiSelect: string[]; singleSelect: string; dateFrom: string; dateUntil: string },
) {
  await openChatSettings(page);
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill(filter.date);
  await page.getByRole('textbox', { name: 'String', exact: true }).fill(filter.string);

  await resetOptions(page);
  await selectMultipleOptions(page, 'Multi Select', filter.multiSelect);
  await selectOption(page, 'Single Select', filter.singleSelect);
  await page.getByRole('textbox', { name: 'Date (from)', exact: true }).fill(filter.dateFrom);
  await page.getByRole('textbox', { name: 'Date (until)', exact: true }).fill(filter.dateUntil);
  await applyChatSettings(page);
}

export async function wait(timeout: number) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function addMockModelToConfiguration(
  page: Page,
  configuration: { name: string },
  mockServer: { endpoint: string; modelName?: string },
) {
  await openAssistant(page, configuration.name);

  await page.getByRole('button', { name: 'Add Extension' }).click();

  await page.getByLabel('Create Extension').getByRole('heading', { name: 'OpenAI compatible' }).click();

  await page.getByLabel('API Key').fill('mock-api-key');
  await page.getByLabel('Endpoint').fill(mockServer.endpoint);
  await page.getByLabel('Model Name').fill(mockServer.modelName ?? 'mock-gpt-4');

  await save(page);
}

export async function configureAssistantByUser(page: Page, config: { values: { label: string; value: number | string }[] }) {
  const popover = await openChatSettings(page);

  for (const entry of config.values) {
    await popover.getByLabel(entry.label).fill(String(entry.value));
  }
  await applyChatSettings(page);
}

export async function addSystemPromptToConfiguration(
  page: Page,
  configuration: { name: string },
  prompt: { title?: string; text: string; configurable?: boolean },
) {
  await openAssistant(page, configuration.name);

  await page.getByRole('button', { name: 'Add Extension' }).click();

  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Other' }).click();

  await page.getByRole('heading', { name: 'Prompt', exact: true }).click();
  await page.getByLabel('Title').fill(prompt.title ?? 'systemprompt');
  await page.getByLabel('Text').fill(prompt.text);

  if (prompt.configurable) {
    await selectMultipleOptions(page, 'Configurable', ['Text']);
  }

  await save(page);
}

/** The assistant of the chat is shown in the header of the conversation. */
export async function checkSelectedConfiguration(page: Page, configuration: { name: string }) {
  await expect(page.getByTestId('assistant-picker')).toHaveText(configuration.name);
}

/** Selects the assistant of the chat with the picker in the header. */
export async function selectConfiguration(page: Page, configuration: { name: string }) {
  const picker = page.getByTestId('assistant-picker');
  const option = page.getByTestId('assistant-picker-dropdown').getByRole('option', { name: configuration.name, exact: true });
  // While a chat is loading, the app focuses the message input, which may close the list again. So retry.
  await expect(async () => {
    if ((await picker.textContent()) === configuration.name) {
      return;
    }
    if ((await picker.getAttribute('aria-expanded')) !== 'true') {
      await picker.click();
    }
    await option.click({ timeout: 2_000 });
    await expect(picker).toHaveText(configuration.name, { timeout: 2_000 });
  }).toPass();
  await expect(picker).toHaveText(configuration.name);
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
}

export async function navigateToUserAdministration(page: Page) {
  await page.getByRole('link', { name: 'Users' }).waitFor();
  await page.getByRole('link', { name: 'Users' }).click();
  await page.waitForURL(`${config.URL}/admin/users`);
}

export async function navigateToUserGroupAdministration(page: Page) {
  await page.getByRole('link', { name: 'Groups' }).waitFor();
  await page.getByRole('link', { name: 'Groups' }).click();
  await page.waitForURL(`${config.URL}/admin/user-groups`);
}

export async function navigateToThemeAdministration(page: Page) {
  await page.getByRole('link', { name: 'Theme' }).waitFor();
  await page.getByRole('link', { name: 'Theme' }).click();
  await page.waitForURL(`${config.URL}/admin/theme`);
}

export async function createUser(page: Page, user: { email: string; name: string; password?: string }) {
  await navigateToUserAdministration(page);
  // wait until the list is rendered
  await page.getByRole('table').locator('tbody tr').first().waitFor();

  await page.getByRole('button', { name: 'Create User' }).click();
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  if (user.password != null) {
    await page.locator('#password').fill(user.password);
    await page.locator('#passwordConfirm').fill(user.password);
  }

  await page.getByRole('button', { name: 'Save' }).click();

  const createUserModal = page.getByRole('heading', { name: 'Create User' });
  await createUserModal.waitFor({ state: 'detached' });

  // other tests create users concurrently, so only check for our own user and not for the number of rows
  const newUser = page.getByRole('table').getByRole('row').filter({ hasText: user.email });
  await expect(newUser).toHaveCount(1);
}

/** Filters the (paginated) user list by name (the search only matches names) and returns the row of the user. */
export async function searchUser(page: Page, user: { name: string; email: string }) {
  await page.getByPlaceholder('Search', { exact: true }).fill(user.name);
  await page.getByPlaceholder('Search', { exact: true }).press('Enter');
  // wait until the search result is shown
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  const row = page.getByRole('table').getByRole('row').filter({ hasText: user.email });
  await expect(row).toHaveCount(1);
  return row;
}

/** Opens the popover "My files" (personal files) of the composer. */
export async function openMyFiles(page: Page) {
  const popover = page.getByTestId('my-files-popover');
  // the state of the button, the popover may still be visible while it closes
  const button = page.getByTestId('my-files-button');
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    await button.click();
  }
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toBeVisible();
  return popover;
}

/** The checkbox of a personal file in the popover "My files". */
export function myFileCheckbox(page: Page, filename: string) {
  return page.getByTestId('my-files-popover').getByRole('checkbox', { name: `Select ${filename}`, exact: true });
}

/** Uploads a personal file in the popover "My files". The popover stays open. */
export async function uploadFileWhileInChat(page: Page, filename: string, mayFail: boolean = false) {
  const popover = await openMyFiles(page);
  // Yes, this seems strange at first, but ...
  // - if we ran `page.waitForEvent('filechooser')` after clicking, we
  //   would miss the event caused by the click.
  // - if we would `await` the file chooser event right away, execution
  //   would get stuck before we could click anything to trigger the event.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await popover.getByText('Drag and drop files here, or click to select files.').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, `files/${filename}`));

  if (!mayFail) {
    // the file is listed with a checkbox once the upload is complete
    await expect(myFileCheckbox(page, filename)).toBeVisible({ timeout: 60_000 });
  }
}

export async function uploadFileWithPaperclip(page: Page, filename: string, mayFail: boolean = false) {
  // Yes, this seems strange at first, but ...
  // - if we ran `page.waitForEvent('filechooser')` after clicking, we
  //   would miss the event caused by the click.
  // - if we would `await` the file chooser event right away, execution
  //   would get stuck before we could click anything to trigger the event.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('label[for="file-upload"]').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, `files/${filename}`));

  if (!mayFail) {
    await expect(page.getByTestId('file-chip-uploaded').filter({ hasText: filename }).first()).toBeVisible();
  }
}

export async function deleteFirstFileFromPaperclip(page: Page) {
  const fileChip = page.getByTestId('file-chip').first();
  await fileChip.locator('button').click();
}

export async function navigateToConfigurationAdministration(page: Page) {
  await page.getByTestId('menu user').waitFor();
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Admin' }).waitFor();
  await page.getByRole('menuitem', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Assistants' }).waitFor();
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.waitForURL(`${config.URL}/admin/assistants`);
}

async function resetOptions(page: Page) {
  const removeButton = page
    .locator('div')
    .filter({ hasText: /^Multi Selectvalue.*$/ })
    .locator('button');
  while (true) {
    const count = await removeButton.count();
    if (count === 0) {
      return;
    }

    await removeButton.first().click();
  }
}

export async function duplicateActiveConversation(page: Page, renameBeforeDuplicationTo?: string) {
  if (renameBeforeDuplicationTo) {
    await page.getByTestId('active-conversation-item-more-actions').click();
    const dropdown = page.locator('.mantine-Menu-dropdown');
    await expect(dropdown).toBeVisible();
    await dropdown.locator('text=Rename').click();
    await page.getByTestId('conversation-rename-input').fill(renameBeforeDuplicationTo);
    await page.getByTestId('conversation-rename-input').press('Enter');
    const renamedConversation = page.getByText(renameBeforeDuplicationTo).first();
    await expect(renamedConversation).toBeVisible();
  }

  await page.getByTestId('active-conversation-item-more-actions').click();
  const dropdown = page.locator('.mantine-Menu-dropdown');
  await expect(dropdown).toBeVisible();
  await dropdown.locator('text=Duplicate').click();
  // .first(): the notification of an earlier duplication may still be visible; the tests check the number of copies
  await expect(page.getByText('Conversation duplicated successfully').first()).toBeVisible();
}

export async function selectOption(page: Page, name: string, value: string | RegExp) {
  await page.getByRole('combobox', { name: name }).click();
  if (typeof value === 'string') {
    await page.getByRole('option', { name: value, exact: true }).click();
  } else {
    await page.getByRole('option', { name: value }).click();
  }
}

export async function selectMultipleOptions(page: Page, name: string, values: string[]) {
  // TODO: there needs to be a better way
  const input = page.getByLabel(name).locator('xpath=ancestor::*[contains(@class, "mantine-MultiSelect-input")]').first();
  await input.click();
  for (const value of values) {
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  await input.click();
}

export async function expectElementInYRange(element: Locator, min: number, max: number) {
  // retry until scrolling/rendering has settled instead of sleeping a fixed time before the check
  await expect(async () => {
    const box = await element.boundingBox();
    const highestPointY = box && box.y;
    const lowestPointY = box && box.y + box.height;
    expect(highestPointY).toBeGreaterThan(min);
    expect(lowestPointY).toBeLessThan(max);
  }).toPass({ timeout: 10_000 });
}

export async function changePassword(page: Page, currentPassword: string, newPassword: string) {
  await page.getByRole('textbox', { name: 'Current Password', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Current Password', exact: true }).fill(currentPassword);
  await page.getByRole('textbox', { name: 'Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(newPassword);
  await page.getByRole('textbox', { name: 'Confirm Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Confirm Password', exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Update Password' }).click({ timeout: 3000 });
}

// Unique names allow tests to run in parallel and repeatedly against the same database. The suffix has a fixed
// length, so that one name is never a prefix of another one (many locators match on substrings).
export function uniqueName(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function globalUserBucketName(): string {
  return 'E2E-User-Bucket';
}

export function globalConversationBucketName(): string {
  return 'E2E-Conversation-Bucket';
}

export async function expectA11yCompliant(page: Page) {
  // Wait for (finite) CSS animations/transitions to finish, so axe does not see intermediate styles.
  await page
    .waitForFunction(
      () => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {});

  // Tooltips are transient: move the mouse away so that hover tooltips disappear (they share the portal node of
  // Mantine with other content).
  await page.mouse.move(0, 0);
  await expect(page.locator('.mantine-Tooltip-tooltip'))
    .toHaveCount(0, { timeout: 2_000 })
    .catch(() => {});

  // Exclude open Mantine tooltips from the axe scan: they render into <body> outside any landmark,
  // which violates the "region" rule. Tooltips are transient supplementary content and do not
  // need landmark containment per WCAG best practices.
  const accessibilityScanResults = await new AxeBuilder({ page }).exclude('.mantine-Tooltip-tooltip').analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
}
