import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurationDto, ExtensionUserInfoDto } from 'src/api';
import { toast } from 'src/lib/notifications';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { ChatSettings } from './ChatSettings';

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => ({}),
}));

vi.mock('src/lib/notifications', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn(), success: vi.fn(), warn: vi.fn() }),
  notify: vi.fn(),
}));

const extension = {
  id: 3,
  name: 'search',
  title: 'Search',
  userArguments: { language: { type: 'string', title: 'Language' } },
} as unknown as ExtensionUserInfoDto;

const configuration = { id: 1, name: 'Assistant', extensions: [extension] } as unknown as ConfigurationDto;

describe('ChatSettings', () => {
  it('shows nothing when there are no settings', () => {
    render(
      <ChatSettings
        configuration={{ ...configuration, extensions: [] }}
        extensionsWithFilter={[]}
        defaultValues={{}}
        onUpdateContext={vi.fn()}
        chips={[]}
      />,
    );

    expect(screen.queryByTestId('chat-settings-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-settings-chip')).not.toBeInTheDocument();
  });

  it('reports when the options cannot be saved and stays open', async () => {
    const onUpdateContext = vi.fn().mockRejectedValue(new Error('Bad Request'));

    render(
      <ChatSettings
        configuration={configuration}
        extensionsWithFilter={[extension]}
        defaultValues={{ 3: { language: '' } }}
        onUpdateContext={onUpdateContext}
        chips={[]}
      />,
    );

    fireEvent.click(screen.getByTestId('chat-settings-button'));
    fireEvent.change(await screen.findByLabelText('Language'), { target: { value: 'de' } });
    fireEvent.click(screen.getByRole('button', { name: texts.chat.chatSettings.apply, hidden: true }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(onUpdateContext).toHaveBeenCalledWith({ 3: { language: 'de' } });
    expect(screen.getByRole('button', { name: texts.chat.chatSettings.apply, hidden: true })).toBeInTheDocument();
  });
});
