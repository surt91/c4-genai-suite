import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationFiles } from 'src/hooks/api/files';
import { render } from 'src/pages/admin/test-utils';
import { useChatStore } from 'src/pages/chat/state/zustand/chatStore';
import { texts } from 'src/texts';
import { ChatMessage } from '../../state/types';
import { HumanChatItem } from './HumanChatItem';

vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

vi.mock('src/hooks/api/files', () => ({
  useConversationFiles: vi.fn(),
}));

// @ts-expect-error we just mock the needed fields
vi.mocked(useConversationFiles).mockImplementation(() => ({ data: [] }));

const question: ChatMessage = { id: 5, type: 'human', configurationId: 1, content: [{ type: 'text', text: 'Question' }] };

describe('HumanChatItem', () => {
  beforeEach(() => {
    useChatStore.setState({ currentChatId: 0, chatDataMap: new Map() });
    act(() => useChatStore.getState().switchToChat(1));
  });

  const renderItem = () => {
    const editMessage = vi.fn();
    render(<HumanChatItem agentName="AI" message={question} isLast={false} isBeforeLast={true} editMessage={editMessage} />);
    return editMessage;
  };

  it('sends the edited question', () => {
    const editMessage = renderItem();

    fireEvent.click(screen.getByRole('button', { name: texts.common.edit }));
    fireEvent.change(screen.getByLabelText(texts.accessibility.editMessage), { target: { value: 'Edited' } });
    fireEvent.click(screen.getByRole('button', { name: texts.common.send }));

    expect(editMessage).toHaveBeenCalledWith('Edited', [], 5);
  });

  it('cannot be edited while an answer is generated', () => {
    act(() => useChatStore.getState().setIsAiWriting(1, true));
    renderItem();

    expect(screen.getByRole('button', { name: texts.common.edit })).toBeDisabled();
  });

  it('does not send an edit while an answer is generated', () => {
    const editMessage = renderItem();
    fireEvent.click(screen.getByRole('button', { name: texts.common.edit }));

    act(() => useChatStore.getState().setIsAiWriting(1, true));
    fireEvent.keyDown(screen.getByLabelText(texts.accessibility.editMessage), { key: 'Enter' });

    expect(editMessage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: texts.common.send })).toBeDisabled();
  });
});
