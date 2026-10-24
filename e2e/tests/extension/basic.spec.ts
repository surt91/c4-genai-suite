import { expect } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addBucketToConfiguration,
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createConfiguration,
  editBucket,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  globalUserBucketName,
  login,
  myFileCheckbox,
  newChat,
  openMyFiles,
  selectConfiguration,
  sendMessage,
  uniqueName,
  uploadFileWhileInChat,
} from '../utils/helper';

test('chat with file search', async ({ page, mockServerUrl, adminUser }) => {
  const configuration = { name: uniqueName('E2E-Test'), description: 'chat with file search' };
  const bucket = { name: globalUserBucketName() };
  await test.step('should login', async () => {
    await login(page, adminUser);
  });

  await test.step('should add Configuration', async () => {
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
  });

  await test.step('should add Mock LLM Extension', async () => {
    await addMockModelToConfiguration(page, configuration, {
      endpoint: mockServerUrl,
    });
  });

  await test.step('add prompt', async () => {
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

  await test.step('should render image', async () => {
    const imageUrl = 'fakeUrl';
    await sendMessage(page, configuration, {
      message: `Can you reply with this markdown and only this markdown?: ![Image](${imageUrl})`,
    });
    const image = page.getByRole('img', { name: 'Image' }).first();
    await expect(image).toHaveAttribute('src', imageUrl);
    await expect(image).toBeVisible();

    await expectA11yCompliant(page);
  });

  await test.step('should edit message', async () => {
    const chatItemLocator = page.getByTestId('chat-item');

    const chatItem = chatItemLocator.first();
    const itemText = await chatItem.textContent();
    expect(itemText).toBe('Wie sagt man auf Englisch Banane. Antworte ohne Großbuchstaben in einem Wort.');

    const editButton = chatItem.locator('button .tabler-icon-pencil');
    await chatItem.hover();
    await editButton.click();
    await chatItem.getByRole('textbox').fill('What is the capital of Germany?');
    await expectA11yCompliant(page);
    await chatItem.getByRole('button', { name: 'Send' }).click();

    await page.waitForSelector(`:has-text("Berlin")`);
    const newChatItemCount = await chatItemLocator.count();
    const newChatItemText = await chatItem.textContent();

    expect(newChatItemText).toBe('What is the capital of Germany?');
    expect(newChatItemCount).toBe(2);
  });

  await test.step('should show the shared user bucket', async () => {
    // there may only be one user bucket, it is shared by all tests and created in global.setup.ts
    await enterAdminArea(page);
    await page.getByRole('link', { name: 'Files' }).click();
    await expect(page.getByRole('link', { name: bucket.name })).toBeVisible();
  });

  await test.step('should add bucket to Configuration', async () => {
    await addBucketToConfiguration(page, configuration, {
      bucketName: bucket.name,
      description: 'Some files with keywords',
    });
  });

  await test.step('should edit file size limits', async () => {
    await editBucket(page, { name: bucket.name, fileSizeLimits: { general: 1, pptx: 0, md: 2 } });
  });

  await test.step('should reject large file', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
    await uploadFileWhileInChat(page, 'birthdays.pptx', true);
    await page
      .getByRole('alert')
      .filter({ hasText: /^Failed to upload file. 'birthdays.pptx': The file is larger than allowed for this file type./ })
      .click();
  });

  await test.step('should add file to user bucket while chat is open and utf-8 filename is used', async () => {
    await uploadFileWhileInChat(page, 'keyword_ä_ö_ß.MD');
  });

  await test.step('should reply with file content if asked', async () => {
    await selectConfiguration(page, configuration);
    await sendMessage(page, configuration, { message: 'give me the keyword' });
    await page.waitForSelector(`:has-text("gaibleE2E")`);
  });

  await test.step('should show sources used for the reply', async () => {
    const sourcesSection = page.locator('[data-testid="sources-section"]');
    await expect(sourcesSection).toBeVisible();
    const sourcesEntry = sourcesSection.getByRole('listitem').filter({ hasText: 'keyword_ä_ö_ß.MD' });
    await expect(sourcesEntry).toHaveCount(1);
    await expectA11yCompliant(page);
  });

  await test.step('should start new Chat and already uploaded file should not be checked', async () => {
    await page.getByRole('button', { name: 'New chat' }).click();
    await page.waitForSelector('[data-testid="sources-section"]', { state: 'detached' });
    await page.getByText('How may I help you?').waitFor();
    await selectConfiguration(page, configuration);
    await openMyFiles(page);
    const checkboxKeywordFile = myFileCheckbox(page, 'keyword_ä_ö_ß.MD');

    await expect(checkboxKeywordFile).toBeVisible();
    await expect(checkboxKeywordFile).not.toBeChecked();
  });

  await test.step('should upload a new file and this should be selected', async () => {
    await uploadFileWhileInChat(page, 'e2e-test.txt');
    const checkboxKeywordFile = myFileCheckbox(page, 'keyword_ä_ö_ß.MD');
    const checkboxNewFile = myFileCheckbox(page, 'e2e-test.txt');

    await expect(checkboxKeywordFile).not.toBeChecked();
    await expect(checkboxNewFile).toBeChecked();
    // the selected personal file is shown as a chip in the composer and counted at the button
    await expect(page.getByTestId('my-files-button')).toHaveText('My files (1)');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('file-chip').filter({ hasText: 'e2e-test.txt' })).toHaveAttribute('data-origin', 'personal');
  });

  await test.step('should answer how many uploaded files exist', async () => {
    await sendMessage(page, configuration, {
      message: 'how many files are selected, answer in format x files (e.g. 3 files)',
    });
    await page.waitForSelector(`:has-text("1 file")`);
  });

  await test.step('should reply with the content of the new uploaded file', async () => {
    await sendMessage(page, configuration, {
      message:
        'Search the file for the codeword "pudding". Display the content of every search result, regardless whether it contains the codeword.',
    });
    await page.waitForSelector(`:has-text("gaible-test")`);
  });

  await test.step('should preview the used sources', async () => {
    // the sources of the last answer (earlier answers may have sources as well)
    await page
      .getByTestId('sources-section')
      .last()
      .getByTestId('source-open')
      .filter({ hasText: 'e2e-test.txt' })
      .first()
      .click();
    await expect(page.getByTestId('inspector').locator('blockquote', { hasText: 'gaible-test' }).first()).toBeVisible();
    await expectA11yCompliant(page);
  });

  await test.step('should close the source preview panel', async () => {
    await page.getByTestId('inspector-close').click();
    await expect(page.getByTestId('inspector')).toBeHidden();
  });

  await test.step('should deselect all files', async () => {
    await openMyFiles(page);
    await page.getByRole('button', { name: 'Deselect all' }).click();

    await expect(myFileCheckbox(page, 'keyword_ä_ö_ß.MD')).not.toBeChecked();
    await expect(myFileCheckbox(page, 'e2e-test.txt')).not.toBeChecked();
    await page.keyboard.press('Escape');
  });

  await test.step('should reply questions about not selected files', async () => {
    await sendMessage(page, configuration, {
      message: 'Search the file for a codeword. Also how many files did you search?"',
    });
    await page.waitForSelector(`:has-text("0 files")`);
  });

  await test.step('should select all files', async () => {
    await openMyFiles(page);
    await page.getByRole('button', { name: 'Select all', exact: true }).click();

    await expect(myFileCheckbox(page, 'keyword_ä_ö_ß.MD')).toBeChecked();
    await expect(myFileCheckbox(page, 'e2e-test.txt')).toBeChecked();
    await page.keyboard.press('Escape');
  });

  await test.step('should reply questions about selected files', async () => {
    await sendMessage(page, configuration, {
      message:
        'Please search the user uploaded files for the keyword "pudding". Display the content of every search result, regardless whether it contains the keyword.',
    });
    await page.waitForSelector(`:has-text("gaibleE2E")`);
    await page.waitForSelector(`:has-text("gaible-test")`);
  });

  await test.step('should rename a personal file', async () => {
    const popover = await openMyFiles(page);
    await popover.getByTestId('my-files-manage').click();
    const modal = page.getByTestId('manage-files-modal');
    const row = modal.getByTestId('manage-files-row').filter({ hasText: 'e2e-test.txt' });
    await row.getByRole('button', { name: 'Rename: e2e-test.txt' }).click();
    const input = modal.getByRole('textbox', { name: 'New name of e2e-test.txt' });
    await input.fill('renamed-e2e-test.txt');
    await input.press('Enter');
    await expect(modal.getByTestId('manage-files-row').filter({ hasText: 'renamed-e2e-test.txt' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('file-chip').filter({ hasText: 'renamed-e2e-test.txt' })).toBeVisible();
  });
});
