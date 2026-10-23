import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStoppedMessages, useStateOfChat, useStateOfIsAiWriting, useStateOfSelectedAssistantId } from './chat';
import { ChatMessage } from './types';
import { useChatStore } from './zustand/chatStore';
import { useInspectorStore } from './zustand/inspectorStore';

describe('chat state selectors', () => {
  beforeEach(() => {
    useChatStore.setState({
      currentChatId: 0,
      chatDataMap: new Map(),
    });
  });

  it('does not rerender isAiWriting subscribers for message-only updates', () => {
    act(() => {
      useChatStore.getState().switchToChat(1);
      useChatStore.getState().setIsAiWriting(1, true);
    });

    const renderValue = vi.fn();
    render(<IsAiWritingSubscriber renderValue={renderValue} />);
    renderValue.mockClear();

    act(() => {
      useChatStore.getState().setMessages(1, [
        {
          id: 1,
          type: 'ai',
          configurationId: 1,
          content: [{ type: 'text', text: 'updated response' }],
        },
      ]);
    });

    expect(renderValue).not.toHaveBeenCalled();

    act(() => {
      useChatStore.getState().setIsAiWriting(1, false);
    });

    expect(renderValue).toHaveBeenCalledOnce();
    expect(renderValue).toHaveBeenCalledWith(false);
  });

  it('does not rerender subscribers of the chat or the assistant while streaming', () => {
    act(() => {
      const store = useChatStore.getState();
      store.switchToChat(1);
      store.setChat(1, { id: 1, configurationId: 7, updatedAt: new Date(), createdAt: new Date() });
      store.setMessages(1, [{ id: -1, type: 'ai', configurationId: 7, content: [{ type: 'text', text: '' }] }]);
      store.setStreamingMessageId(1, -1);
    });

    const renderValue = vi.fn();
    render(<ChatSubscriber renderValue={renderValue} />);
    expect(renderValue).toHaveBeenLastCalledWith({ chatId: 1, assistantId: 7 });
    renderValue.mockClear();

    act(() => {
      useChatStore.getState().appendToStreamingMessage(1, 'Hello');
      useChatStore.getState().appendToStreamingMessage(1, ' world');
    });

    expect(renderValue).not.toHaveBeenCalled();
  });
});

function ChatSubscriber({ renderValue }: { renderValue: (value: unknown) => void }) {
  const chat = useStateOfChat();
  const assistantId = useStateOfSelectedAssistantId();
  renderValue({ chatId: chat.id, assistantId });
  return null;
}

describe('stopping the generation', () => {
  const question: ChatMessage = { id: 0, type: 'human', configurationId: 1, content: [{ type: 'text', text: 'Question' }] };
  const answer: ChatMessage = { id: -1, type: 'ai', configurationId: 1, content: [{ type: 'text', text: 'Partial' }] };

  function startStream(
    messages: ChatMessage[] = [
      question,
      {
        ...answer,
        requests: [
          {
            status: 'waiting',
            request: {
              id: 'form',
              kind: 'form',
              expiresAt: new Date(),
              text: 'Confirm?',
              schema: { type: 'object', title: 'Confirm', properties: {} },
            },
          },
        ],
      },
    ],
  ) {
    const subscription = { unsubscribe: vi.fn(), abort: vi.fn() };
    const store = useChatStore.getState();
    store.switchToChat(1);
    store.setMessages(1, messages);
    store.setStreamingMessageId(1, -1);
    store.setIsAiWriting(1, true);
    store.setActiveStreamSubscription(1, subscription);
    store.updateMessage(1, -1, { toolCalls: [{ id: 'call-1', name: 'Search', status: 'running' }] });
    return subscription;
  }

  beforeEach(() => {
    useChatStore.setState({ currentChatId: 0, chatDataMap: new Map() });
  });

  it('aborts the request and marks the answer as stopped', () => {
    const subscription = startStream();

    expect(useChatStore.getState().stopActiveStream(1)).toBe(true);

    expect(subscription.abort).toHaveBeenCalledOnce();
    const chatData = useChatStore.getState().chatDataMap.get(1)!;
    expect(chatData.isAiWriting).toBe(false);
    expect(chatData.activeStreamSubscription).toBeUndefined();

    const [stoppedQuestion, stoppedAnswer] = chatData.messages;
    expect(stoppedAnswer).toMatchObject({
      stopped: true,
      requests: [expect.objectContaining({ status: 'cancelled' })],
      toolCalls: [{ id: 'call-1', name: 'Search', status: 'cancelled' }],
    });
    expect(stoppedAnswer.content).toEqual(answer.content);
    // the placeholder IDs are free for the next message
    expect(stoppedQuestion.id).toBeLessThan(-1);
    expect(stoppedAnswer.id).toBeLessThan(-1);
    expect(stoppedAnswer.id).not.toBe(stoppedQuestion.id);
  });

  it('updates the details in the inspector to the new ID of the stopped answer', () => {
    startStream();
    useInspectorStore.getState().open({ type: 'tool', conversationId: 1, messageId: -1, toolId: 'call-1' });

    useChatStore.getState().stopActiveStream(1);

    const stoppedAnswer = useChatStore.getState().chatDataMap.get(1)!.messages[1];
    expect(useInspectorStore.getState().stack).toEqual([
      { type: 'tool', conversationId: 1, messageId: stoppedAnswer.id, toolId: 'call-1' },
    ]);
  });

  it('does nothing without an active stream', () => {
    useChatStore.getState().switchToChat(1);

    expect(useChatStore.getState().stopActiveStream(1)).toBe(false);
  });

  it('loads the stored messages after stopping', async () => {
    startStream();
    useChatStore.getState().stopActiveStream(1);

    const stored: ChatMessage[] = [
      { ...question, id: 10 },
      { ...answer, id: 11, stopped: true },
    ];
    const getMessages = vi
      .fn()
      // the first request overtakes the abort and does not contain the answer yet
      .mockResolvedValueOnce({ items: [stored[0]] })
      .mockResolvedValue({ items: stored });

    await loadStoppedMessages(1, getMessages);

    expect(getMessages).toHaveBeenCalledTimes(2);
    expect(useChatStore.getState().chatDataMap.get(1)!.messages).toEqual(stored);
  });

  it('does not replace the messages when a new message has been sent in the meantime', async () => {
    startStream();
    useChatStore.getState().stopActiveStream(1);
    useChatStore.getState().setIsAiWriting(1, true);

    const getMessages = vi.fn().mockResolvedValue({
      items: [
        { ...question, id: 10 },
        { ...answer, id: 11 },
      ],
    });
    await loadStoppedMessages(1, getMessages);

    expect(useChatStore.getState().chatDataMap.get(1)!.messages[1].id).not.toBe(11);
  });
});

function IsAiWritingSubscriber({ renderValue }: { renderValue: (value: boolean) => void }) {
  const isAiWriting = useStateOfIsAiWriting();
  renderValue(isAiWriting);
  return null;
}
