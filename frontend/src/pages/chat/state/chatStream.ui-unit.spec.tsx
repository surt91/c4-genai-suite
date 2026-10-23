import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchError, ResponseError, StreamObserver } from 'src/api';
import { SseResponseError } from 'src/api/state/sse';
import { toast } from 'src/lib/notifications';
import { renderHook } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { useChatStream } from './chat';
import { useChatStore } from './zustand/chatStore';

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

  it.each([404, 400])('reports an unknown chat (%i)', async (status) => {
    api.conversations.getConversation.mockRejectedValue(new ResponseError(new Response(null, { status })));

    renderHook(() => useChatStream(1));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(texts.chat.conversationNotFound));
  });
});
