import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileDto } from 'src/api';
import { ProfileContext } from 'src/hooks';
import { render } from 'src/pages/admin/test-utils';
import { useChatStore } from 'src/pages/chat/state/zustand/chatStore';
import { ChatMessage } from '../../state/types';
import { AIChatItem } from './AIChatItem';

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => ({}),
}));

const admin = { id: '1', name: 'Admin', email: 'admin@example.com', isAdmin: true } as ProfileDto;

describe('AIChatItem', () => {
  beforeEach(() => {
    useChatStore.setState({ currentChatId: 0, chatDataMap: new Map() });
    act(() => useChatStore.getState().switchToChat(1));
  });

  it('does not render a zero for empty reasoning or a token count of 0', () => {
    const message: ChatMessage = {
      id: 7,
      type: 'ai',
      configurationId: 1,
      content: [{ type: 'text', text: 'The answer' }],
      reasoning: '',
      tokenCount: 0,
    };

    render(
      <ProfileContext.Provider value={admin}>
        <AIChatItem agentName="AI" message={message} isLast={true} isBeforeLast={false} editMessage={vi.fn()} />
      </ProfileContext.Provider>,
    );

    expect(screen.getByTestId('chat-item')).toHaveTextContent('The answer');
    expect(screen.getByTestId('chat-item').textContent).not.toMatch(/0/);
  });
});
