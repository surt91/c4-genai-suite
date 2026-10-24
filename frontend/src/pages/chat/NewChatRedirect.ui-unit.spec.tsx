import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationDto, ProfileDto } from 'src/api';
import { ProfileContext } from 'src/hooks';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { NewChatRedirect } from './NewChatRedirect';
import { useStateOfEnabledAssistants, useStateOfSelectedAssistant } from './state/listOfAssistants';

const mutate = vi.fn();

vi.mock('./state/listOfChats', () => ({
  useMutateNewChat: () => ({ mutate }),
}));

vi.mock('src/pages/chat/state/listOfAssistants', () => ({
  useStateOfSelectedAssistant: vi.fn(),
  useStateOfEnabledAssistants: vi.fn(),
}));

const admin: ProfileDto = { id: '1', name: 'Admin', email: 'admin@example.com', isAdmin: true };
const user: ProfileDto = { ...admin, isAdmin: false };

function renderRedirect(profile: ProfileDto, hasNoAssistants: boolean) {
  return render(
    <ProfileContext.Provider value={profile}>
      <NewChatRedirect hasNoAssistants={hasNoAssistants} />
    </ProfileContext.Provider>,
  );
}

describe('NewChatRedirect', () => {
  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useStateOfEnabledAssistants).mockReturnValue([]);
    vi.mocked(useStateOfSelectedAssistant).mockReturnValue(undefined as unknown as ConfigurationDto);
  });

  it('shows admins how to create the first assistant', () => {
    renderRedirect(admin, true);

    expect(screen.getByRole('heading', { name: texts.chat.noAssistants.title })).toBeInTheDocument();
    expect(screen.getByText(texts.chat.noAssistants.adminText)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.chat.noAssistants.createAssistant })).toHaveAttribute(
      'href',
      '/admin/assistants',
    );
    expect(screen.getByRole('link', { name: texts.chat.noAssistants.quickstart })).toHaveAttribute(
      'href',
      expect.stringContaining('#quickstart'),
    );
    expect(screen.queryByText(texts.chat.noAssistants.userText)).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('asks other users to contact an administrator', () => {
    renderRedirect(user, true);

    expect(screen.getByRole('heading', { name: texts.chat.noAssistants.title })).toBeInTheDocument();
    expect(screen.getByText(texts.chat.noAssistants.userText)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: texts.chat.noAssistants.createAssistant })).not.toBeInTheDocument();
    expect(screen.queryByText(texts.chat.noAssistants.adminText)).not.toBeInTheDocument();
  });

  it('shows nothing while the assistants are loading', () => {
    renderRedirect(admin, false);

    expect(screen.queryByTestId('no-assistants')).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('starts a new chat with the selected assistant when there is one', () => {
    const assistant = { id: 7, name: 'Assistant' } as ConfigurationDto;
    vi.mocked(useStateOfEnabledAssistants).mockReturnValue([assistant]);
    vi.mocked(useStateOfSelectedAssistant).mockReturnValue(assistant);

    renderRedirect(admin, false);

    expect(mutate).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId('no-assistants')).not.toBeInTheDocument();
  });
});
