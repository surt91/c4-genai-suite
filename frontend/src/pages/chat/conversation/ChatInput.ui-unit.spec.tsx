import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurationDto, FileDto } from 'src/api';
import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
import { useConversationFiles } from 'src/hooks/api/files';
import { render } from 'src/pages/admin/test-utils';
import { ChatInput } from './ChatInput';

vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

vi.mock('src/hooks/api/extensions', () => ({
  useConversationBucketAvailabilities: vi.fn(),
}));

vi.mock('src/hooks/api/files', () => ({
  useConversationFiles: vi.fn(),
}));

vi.mocked(useConversationBucketAvailabilities)
  // @ts-expect-error we just mock the needed fields of the query
  .mockImplementation(() => ({
    data: {
      extensions: [
        {
          extensionId: 0,
          title: 'Files in Chat',
          maxFiles: 10,
          fileNameExtensions: [],
        },
        {
          extensionId: 1,
          title: 'Files Vision',
          maxFiles: 2,
          fileNameExtensions: ['.png'],
        },
      ],
    },
    refetch: vi.fn(),
  }));

describe('ChatInput', () => {
  const mockConversationFiles = (files: FileDto[]) =>
    vi
      .mocked(useConversationFiles)
      // @ts-expect-error we just mock the needed fields of the query
      .mockImplementation(() => ({
        data: files,
        refetch: vi.fn(),
      }));
  it('should allow file upload in empty conversation', () => {
    mockConversationFiles([]);

    render(<ChatInput chatId={0} submitMessage={() => {}} />);

    expect(getFileInputButton()).not.toBeDisabled();
    assertFilesInChatExtensionErrorMessageVisible(false);
    assertFilesVisionExtensionErrorMessageVisible(false);
  });
  it('should show max files warning for files vision and allow uploading other files', () => {
    mockConversationFiles([
      {
        id: 0,
        fileName: 'image-1.png',
        fileSize: 10,
        mimeType: 'image/png',
        uploadedAt: new Date(),
      },
      {
        id: 1,
        fileName: 'image-2.png',
        fileSize: 10,
        mimeType: 'image/png',
        uploadedAt: new Date(),
      },
      {
        id: 2,
        fileName: 'texfile.txt',
        fileSize: 10,
        mimeType: 'text/plain',
        uploadedAt: new Date(),
      },
    ]);

    render(<ChatInput chatId={0} submitMessage={() => {}} />);

    expect(getFileInputButton()).not.toBeDisabled();
    assertFilesInChatExtensionErrorMessageVisible(false);
    assertFilesVisionExtensionErrorMessageVisible(true);
  });
  it('should show max files warning for both extensions', () => {
    mockConversationFiles([
      {
        id: 0,
        fileName: 'image-1.png',
        fileSize: 10,
        mimeType: 'image/png',
        uploadedAt: new Date(),
      },
      {
        id: 1,
        fileName: 'image-2.png',
        fileSize: 10,
        mimeType: 'image/png',
        uploadedAt: new Date(),
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        id: index + 2,
        fileName: `textfile-${index + 1}.txt`,
        fileSize: 10,
        mimeType: 'text/plain',
        uploadedAt: new Date(),
      })),
    ]);
    render(<ChatInput chatId={0} submitMessage={() => {}} />);

    expect(getFileInputButton()).toBeDisabled();
    assertFilesInChatExtensionErrorMessageVisible(true);
    assertFilesVisionExtensionErrorMessageVisible(true);
  });

  it('should prefill text input with suggestion, when clicking on a suggestion', async () => {
    mockConversationFiles([]);
    const mockOnSubmit = vi.fn();
    const chatInputConfiguration: ConfigurationDto = {
      description: '',
      enabled: false,
      id: 0,
      name: '',
      userGroupIds: [],
      chatSuggestions: [
        {
          title: 'Suggestion Title',
          subtitle: 'Suggestion Subtitle',
          text: 'This is a suggestion',
        },
      ],
    };

    render(<ChatInput chatId={0} submitMessage={mockOnSubmit} configuration={chatInputConfiguration} isEmpty={true} />);

    const suggestionButton = screen.getByText('Suggestion Title');

    suggestionButton.click();

    const textInput = await screen.findByRole('textbox');
    expect(textInput).toHaveValue('This is a suggestion');
  });

  it('should show a stop button instead of the send button while the answer is generated', () => {
    mockConversationFiles([]);
    const stopMessage = vi.fn();

    render(<ChatInput chatId={0} submitMessage={() => {}} isDisabled isAiWriting stopMessage={stopMessage} />);

    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    screen.getByRole('button', { name: 'Stop generating' }).click();

    expect(stopMessage).toHaveBeenCalledOnce();
  });

  it('should stop the generation with escape', () => {
    mockConversationFiles([]);
    const stopMessage = vi.fn();

    render(<ChatInput chatId={0} submitMessage={() => {}} isDisabled isAiWriting stopMessage={stopMessage} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(stopMessage).toHaveBeenCalledOnce();
  });

  it('should show the send button when no answer is generated', () => {
    mockConversationFiles([]);
    const stopMessage = vi.fn();

    render(<ChatInput chatId={0} submitMessage={() => {}} stopMessage={stopMessage} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop generating' })).toBeNull();
    expect(stopMessage).not.toHaveBeenCalled();
  });

  it('should send with enter, but not while composing with an input method or without text', () => {
    mockConversationFiles([]);
    const submitMessage = vi.fn();

    render(<ChatInput chatId={0} submitMessage={submitMessage} />);
    const textbox = screen.getByRole('textbox');

    fireEvent.change(textbox, { target: { value: '   ' } });
    fireEvent.keyDown(textbox, { key: 'Enter' });
    fireEvent.change(textbox, { target: { value: 'こんにちは' } });
    fireEvent.keyDown(textbox, { key: 'Enter', isComposing: true });
    expect(submitMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(textbox, { key: 'Enter' });
    expect(submitMessage).toHaveBeenCalledExactlyOnceWith('こんにちは', []);
  });
});

const assertFilesInChatExtensionErrorMessageVisible = (visible: boolean) => {
  const message = screen.queryByText('You have reached the maximum upload limit of 10 files for the Files in Chat extension.');
  if (visible) {
    expect(message).toBeVisible();
  } else {
    expect(message).toBeNull();
  }
};
const assertFilesVisionExtensionErrorMessageVisible = (visible: boolean) => {
  const message = screen.queryByText('You have reached the maximum upload limit of 2 files for the Files Vision extension.');
  if (visible) {
    expect(message).toBeVisible();
  } else {
    expect(message).toBeNull();
  }
};
const getFileInputButton = () => screen.getByTestId('file-upload');
