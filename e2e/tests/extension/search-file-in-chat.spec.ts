import { expect } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addFilesInChatExtensionToConfiguration,
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createConfiguration,
  deleteFirstFileFromPaperclip,
  duplicateActiveConversation,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  globalConversationBucketName,
  login,
  newChat,
  openAssistant,
  selectConfiguration,
  sendMessage,
  uniqueName,
  uploadFileWithPaperclip,
} from '../utils/helper';

test('files in chat', async ({ page, mockServerUrl, adminUser }) => {
  let originalConversationWithChatWithFiles: string | null;
  const conversationFilesBucket = globalConversationBucketName();

  const configuration = { name: '', description: '' };

  await test.step('should login', async () => {
    await login(page, adminUser);
  });

  await test.step('add assistant', async () => {
    configuration.name = uniqueName('E2E-Test-Other');
    configuration.description = `Description for ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
    await addSystemPromptToConfiguration(page, configuration, { text: 'Your are a helpful assistant.' });
    // the conversation bucket is shared by all tests and created in global.setup.ts (with a general size limit of 10 MB)
  });

  await test.step('should add files in chat extension to Configuration', async () => {
    await addFilesInChatExtensionToConfiguration(page, configuration, {
      bucketName: conversationFilesBucket,
    });
  });

  await test.step('should show current bucket value when editing extension', async () => {
    await openAssistant(page, configuration.name);
    await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();

    const bucketInput = page.getByRole('combobox', { name: 'Bucket' });
    await expect(bucketInput).toHaveValue(conversationFilesBucket);

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('should start chat in new configuration', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('should upload test file and reply to questions in the chat with file content', async () => {
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message: 'Welche Geburtstage stehen in der Datei?',
    });
    const output = await page.waitForSelector(`:has-text("Düsentrieb")`);
    expect(output).toBeDefined();

    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await page.getByTestId('sources-section').getByTestId('source-open').filter({ hasText: 'birthdays.pdf' }).click();
    const inspector = page.getByTestId('inspector');
    await expect(inspector.getByTestId('inspector-title')).toHaveText('birthdays.pdf');
    await expect(
      inspector.getByText('BirthdaySheet Daniel Düsentrieb Quack 02/07/2714 01/02/3456 Page 2', { exact: false }).first(),
    ).toBeVisible();
  });

  await test.step('should put the help on top of the source and go back to it', async () => {
    const inspector = page.getByTestId('inspector');
    await page.getByTestId('docs-icon').click();
    await expect(inspector.getByTestId('inspector-title')).toHaveText('Help');
    await inspector.getByTestId('inspector-back').click();
    await expect(inspector.getByTestId('inspector-title')).toHaveText('birthdays.pdf');
    await expect(inspector.getByTestId('inspector-back')).toHaveCount(0);
    await expectA11yCompliant(page);
  });

  await test.step('should show pdf representation of file referenced in source', async () => {
    await page.getByTestId('inspector-source-tabs').getByText('Document').click();
    await expect(page.locator('.pdf-viewport')).toBeVisible();
    await expect(page.locator('.pdf-viewport').getByText('Daisy Duck')).toBeVisible();
  });

  await test.step('should close the inspector', async () => {
    await page.getByTestId('inspector-close').click();
    await expect(page.getByTestId('inspector')).toBeHidden();
  });

  await test.step('should duplicate a conversation that includes a file uploaded with files in chat extension', async () => {
    originalConversationWithChatWithFiles = uniqueName('unq');

    await duplicateActiveConversation(page, originalConversationWithChatWithFiles);
    const duplicatedName = `${originalConversationWithChatWithFiles} (2)`;
    const duplicatedConversation = page.getByTestId('conversation-item').filter({ hasText: duplicatedName });

    await expect(duplicatedConversation).toBeVisible();
    // exactly one copy must be created
    await expect(
      page.getByTestId('conversation-item').filter({ hasText: `${originalConversationWithChatWithFiles} (3)` }),
    ).toHaveCount(0);
  });

  await test.step('should navigate to duplicated conversation with chat with files extension', async () => {
    const duplicatedConversationLocator = page.getByTestId('conversation-item').filter({
      hasText: `${originalConversationWithChatWithFiles} (2)`,
    });

    await expect(duplicatedConversationLocator, 'Duplicated conversation link should be visible').toBeVisible({
      timeout: 15000,
    });
    await duplicatedConversationLocator.click();
    const fileChip = page.getByTestId('file-chip');
    await expect(fileChip).toBeVisible({ timeout: 3000 });
    const fileName = await fileChip.getByText('birthdays.pdf').textContent();
    expect(fileName).toBeDefined();
  });

  await test.step('should delete the file from the duplicated conversation with chat with files extension', async () => {
    await page.getByTestId('file-chip-uploaded').getByRole('button').click();
    await sendMessage(page, configuration, {
      message:
        'Welche Dateien kannst du sehen? Antworte nur mit dem Namen der Datei. Wenn du keine Datei siehst, antworte nur mit "Keine Datei gefunden".',
    });

    const answer = await page.waitForSelector(`:has-text("Keine Datei gefunden")`, { state: 'visible' });
    expect(answer).toBeDefined();
  });

  await test.step('should navigate to original conversation with chat with files and updated file should exists', async () => {
    expect(originalConversationWithChatWithFiles).not.toBeNull();

    const originalConversationLocator = page
      .getByTestId('conversation-item')
      .filter({ hasText: new RegExp(`^${originalConversationWithChatWithFiles}$`) })
      .first();

    await expect(originalConversationLocator, 'Original conversation link should be visible').toBeVisible({
      timeout: 15000,
    });

    await originalConversationLocator.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // check file chip
    const fileChip = page.getByTestId('file-chip');
    await expect(fileChip).toBeVisible({ timeout: 3000 });
    const fileName = await fileChip.getByText('birthdays.pdf').textContent();
    expect(fileName).toBeDefined();

    await sendMessage(page, configuration, {
      message:
        'Welche Dateien kannst du sehen? Antworte nur mit dem Namen der Datei. Wenn du keine Datei siehst, antworte nur mit "Keine Datei gefunden".',
    });

    const answer = await page.waitForSelector(`:has-text("birthdays.pdf")`, { state: 'visible' });
    expect(answer).toBeDefined();
    await sendMessage(page, configuration, {
      message:
        'Lies die hochgeladene Datei und sag mir, wie viele Seiten das hochgeladene Dokument hat. Antworte nur mit der Zahl.',
    });
    const output = await page.waitForSelector(`:has-text("2")`);
    expect(output).toBeDefined();
  });

  await test.step('should start a new chat, upload files and retrieve content', async () => {
    await enterAdminArea(page);
    await enterUserArea(page);
    await newChat(page);
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message:
        'For each uploaded file, describe its content. For the PDF, provide a summary of its content. Present your response as a table with one column: "Content".',
    });
    const table = await page.waitForSelector('table', { timeout: 30000, state: 'visible' });
    expect(table).toBeDefined();
  });

  await test.step('should duplicate a conversation that includes a file uploaded with chat with files extension', async () => {
    const originalConversationWithTwoFiles = uniqueName('ChatWithTwoFilesDuplicationTest');

    await duplicateActiveConversation(page, originalConversationWithTwoFiles);
    const duplicatedName = `${originalConversationWithTwoFiles} (2)`;
    const duplicatedConversation = page.getByTestId('conversation-item').filter({ hasText: duplicatedName });
    await expect(duplicatedConversation).toBeVisible();

    const fileChips = page.getByTestId('file-chip');
    await expect(fileChips.first()).toContainText('birthdays.pdf');
  });

  await test.step('should duplicate a conversation that includes a file uploaded with chat with files extension, delete the original file and show sources in the duplicated conversation', async () => {
    await newChat(page);
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message: 'Hello.',
    });
    await page.waitForSelector('[data-testid="chat-item"]:nth-of-type(2)');

    const originalConversationName = uniqueName('SDup');

    await duplicateActiveConversation(page, originalConversationName);

    const originalConversation = page
      .getByTestId('conversation-item')
      .filter({ hasText: new RegExp(`^${originalConversationName}$`) });
    await originalConversation.click();
    await deleteFirstFileFromPaperclip(page);

    const duplicatedName = `${originalConversationName} (2)`;
    const duplicatedConversation = page.getByTestId('conversation-item').filter({ hasText: duplicatedName });
    await expect(duplicatedConversation).toBeVisible();

    const originalUrl = page.url();
    await duplicatedConversation.click();
    // wait until the duplicated conversation (which still has the file) is loaded
    await page.waitForURL((url) => url.href !== originalUrl);
    await expect(page.getByTestId('file-chip')).toContainText('birthdays.pdf');

    await sendMessage(page, configuration, {
      message: 'Welche Geburtstage stehen in der Datei?',
    });

    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await page.getByTestId('sources-section').getByTestId('source-open').filter({ hasText: 'birthdays.pdf' }).click();
    await expect(
      page
        .getByTestId('inspector')
        .getByText('BirthdaySheet Daniel Düsentrieb Quack 02/07/2714 01/02/3456 Page 2', { exact: false })
        .first(),
    ).toBeVisible();
  });
});
