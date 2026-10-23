import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchError, ResponseError, StreamEventDto, StreamObserver } from 'src/api';
import { SseResponseError } from 'src/api/state/sse';
import { toast } from 'src/lib/notifications';
import { renderHook } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { useChatStream } from './chat';
import { ChatMessage } from './types';
import { useChatStore } from './zustand/chatStore';
import { useInspectorStore } from './zustand/inspectorStore';

const api = {
  conversations: {
    getConversation: vi.fn(),
    getMessages: vi.fn(),
  },
  stream: {
    streamPrompt: vi.fn(),
  },
};

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => api,
}));

vi.mock('src/lib/notifications', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn(), success: vi.fn(), warn: vi.fn() }),
  notify: vi.fn(),
}));

describe('useChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({ currentChatId: 0, chatDataMap: new Map() });
    useInspectorStore.setState({ stack: [], hidden: false, trigger: undefined });
  });

  it('reports a network error when loading the chat instead of crashing', async () => {
    api.conversations.getConversation.mockRejectedValue(new FetchError(new TypeError('Failed to fetch'), 'The request failed'));
    api.conversations.getMessages.mockResolvedValue({ items: [] });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderHook(() => useChatStream(1));
    // the request is retried a few times
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        `${texts.chat.errorLoadingMessagesOrConversation} ${texts.common.reloadAndTryAgain}`,
      ),
    );
  });

  describe('errors of the request', () => {
    async function sendAndFail(error: unknown) {
      api.conversations.getConversation.mockResolvedValue({ id: 1, configurationId: 1 });
      api.conversations.getMessages.mockResolvedValue({ items: [] });
      api.stream.streamPrompt.mockImplementation((_chatId, _message, _messageId, observer: StreamObserver<unknown>) => {
        setTimeout(() => observer.error(error));
        return { unsubscribe: vi.fn(), abort: vi.fn() };
      });

      const { result } = renderHook(() => useChatStream(1));
      // the composer is shown once the chat has been loaded
      await waitFor(() => expect(useChatStore.getState().chatDataMap.get(1)?.hasLoadedFromServer).toBe(true));
      act(() => (result.current as ReturnType<typeof useChatStream>).sendMessage('Hello'));
    }

    const answer = () =>
      useChatStore
        .getState()
        .chatDataMap.get(1)
        ?.messages.find((m) => m.type === 'ai');

    it('shows the message of the server for error responses', async () => {
      await sendAndFail(new SseResponseError(403, 'Forbidden resource'));

      await waitFor(() => expect(answer()?.error).toBe(`${texts.chat.sendFailed}: Forbidden resource`));
      expect(useChatStore.getState().chatDataMap.get(1)?.isAiWriting).toBe(false);
    });

    it('shows a connection error for network errors', async () => {
      await sendAndFail(new TypeError('Failed to fetch'));

      await waitFor(() => expect(answer()?.error).toBe(texts.chat.connectionFailed));
    });

    it('goes to the login when the session expired', async () => {
      window.history.pushState({}, '', '/chat/1');
      await sendAndFail(new SseResponseError(401, 'Unauthorized'));

      await waitFor(() => expect(window.location.pathname).toBe('/login'));
      expect(document.cookie).toContain('post-login-redirect=%2Fchat%2F1');
    });
  });

  describe('saved messages', () => {
    let observer!: StreamObserver<StreamEventDto>;

    async function send(messages: ChatMessage[], editMessageId?: number) {
      api.conversations.getConversation.mockResolvedValue({ id: 1, configurationId: 1 });
      api.conversations.getMessages.mockResolvedValue({ items: messages });
      api.stream.streamPrompt.mockImplementation((_chatId, _message, _messageId, o: StreamObserver<StreamEventDto>) => {
        observer = o;
        return { unsubscribe: vi.fn(), abort: vi.fn() };
      });

      const { result } = renderHook(() => useChatStream(1));
      await waitFor(() => expect(useChatStore.getState().chatDataMap.get(1)?.hasLoadedFromServer).toBe(true));
      act(() => (result.current as ReturnType<typeof useChatStream>).sendMessage('Hello', [], editMessageId));
    }

    const ids = () =>
      useChatStore
        .getState()
        .chatDataMap.get(1)
        ?.messages.map((m) => m.id);

    it('updates the details in the inspector when the answer gets its ID', async () => {
      await send([]);
      act(() => {
        observer.next({ type: 'tool_error', tool: { name: 'Search', id: 'call-1' }, error: 'Timeout' });
        useInspectorStore.getState().open({ type: 'tool', conversationId: 1, messageId: -1, toolId: 'call-1' });
        observer.next({ type: 'saved', messageType: 'human', messageId: 41 });
        observer.next({ type: 'saved', messageType: 'ai', messageId: 42 });
      });

      expect(ids()).toEqual([41, 42]);
      expect(useInspectorStore.getState().stack).toEqual([{ type: 'tool', conversationId: 1, messageId: 42, toolId: 'call-1' }]);
    });

    it('uses the ID of the stored question after an edit', async () => {
      await send(
        [
          { id: 5, type: 'human', configurationId: 1, content: [{ type: 'text', text: 'Old' }] },
          { id: 6, type: 'ai', configurationId: 1, content: [{ type: 'text', text: 'Answer' }] },
        ],
        5,
      );
      act(() => observer.next({ type: 'saved', messageType: 'human', messageId: 7 }));

      expect(ids()).toEqual([7, -1]);
    });
  });

  it('forgets the subscription when the stream is complete', async () => {
    api.conversations.getConversation.mockResolvedValue({ id: 1, configurationId: 1 });
    api.conversations.getMessages.mockResolvedValue({ items: [] });
    api.stream.streamPrompt.mockImplementation((_chatId, _message, _messageId, observer: StreamObserver<unknown>) => {
      setTimeout(() => observer.complete());
      return { unsubscribe: vi.fn(), abort: vi.fn() };
    });

    const { result } = renderHook(() => useChatStream(1));
    await waitFor(() => expect(useChatStore.getState().chatDataMap.get(1)?.hasLoadedFromServer).toBe(true));
    act(() => (result.current as ReturnType<typeof useChatStream>).sendMessage('Hello'));
    expect(useChatStore.getState().chatDataMap.get(1)?.activeStreamSubscription).toBeDefined();

    await waitFor(() => expect(useChatStore.getState().chatDataMap.get(1)?.activeStreamSubscription).toBeUndefined());
  });

  it.each([404, 400])('reports an unknown chat (%i)', async (status) => {
    api.conversations.getConversation.mockRejectedValue(new ResponseError(new Response(null, { status })));

    renderHook(() => useChatStream(1));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(texts.chat.conversationNotFound));
  });
});
