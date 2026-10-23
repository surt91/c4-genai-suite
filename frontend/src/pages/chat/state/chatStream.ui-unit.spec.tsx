import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchError, ResponseError } from 'src/api';
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

  it('reports an unknown chat', async () => {
    api.conversations.getConversation.mockRejectedValue(new ResponseError(new Response(null, { status: 404 })));

    renderHook(() => useChatStream(1));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(texts.chat.conversationNotFound));
  });
});
