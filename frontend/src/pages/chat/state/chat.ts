import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatUICallbackResultDto,
  ConversationDto,
  ConversationDtoRatingEnum,
  FileDto,
  MessageDtoRatingEnum,
  ResponseError,
  StreamMessageSavedDtoMessageTypeEnum,
  UpdateConversationDto,
  useApi,
} from 'src/api';
import { redirectToLogin } from 'src/api/state/redirectToLogin';
import { SseResponseError } from 'src/api/state/sse';
import { toast } from 'src/lib/notifications';

import { texts } from 'src/texts';
import { ChatMessage, InteractionStatus, ToolCallState } from './types';
import { useChatStore } from './zustand/chatStore';
import { useInspectorStore } from './zustand/inspectorStore';
import { useListOfChatsStore } from './zustand/listOfChatsStore';

/** Tool calls without an ID (older servers) are identified by their name. */
const toolId = (tool: { name: string; id?: string }) => tool.id ?? tool.name;

function upsertToolCall(toolCalls: ToolCallState[] | undefined, update: ToolCallState): ToolCallState[] {
  const existing = toolCalls ?? [];
  if (!existing.some((t) => t.id === update.id)) {
    return [...existing, update];
  }
  return existing.map((t) => (t.id === update.id ? { ...t, ...update, error: update.error ?? t.error } : t));
}

const responseStatus = (error: unknown) => (error instanceof ResponseError ? error.response.status : undefined);

/** The message shown in the answer when the request of the chat failed (before or while streaming). */
function streamErrorMessage(error: unknown) {
  if (error instanceof SseResponseError) {
    return error.serverMessage ? `${texts.chat.sendFailed}: ${error.serverMessage}` : `${texts.chat.sendFailed}.`;
  }
  // fetch and the stream reader reject with a TypeError when the connection fails
  if (error instanceof TypeError) {
    return texts.chat.connectionFailed;
  }
  return error instanceof Error && error.message ? `${texts.chat.sendFailed}: ${error.message}` : `${texts.chat.sendFailed}.`;
}

const getMessagePlaceholderId = (messageType: StreamMessageSavedDtoMessageTypeEnum) => {
  return messageType === 'ai' ? -1 : 0;
};

export const useChatStream = (chatId: number) => {
  const api = useApi();
  const navigate = useNavigate();
  // The actions are stable; the state is read with `getState()` to never use a stale snapshot (and to not re-render on every chunk).
  const chatStore = useChatStore.getState();

  useEffect(() => {
    if (useChatStore.getState().currentChatId !== chatId) {
      chatStore.switchToChat(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const refetchChats = () => useListOfChatsStore.getState().refetch();

  const {
    isLoading: isChatLoading,
    data: loadedChatAndMessages,
    error,
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      return {
        chat: await api.conversations.getConversation(chatId),
        messages: await api.conversations.getMessages(chatId),
      };
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = responseStatus(error);
      return status !== 400 && status !== 404 && status !== 403 && failureCount < 3;
    },
  });

  useEffect(() => {
    if (error) {
      // Network errors (e.g. the server cannot be reached) have no response.
      const status = responseStatus(error);
      if (status === 403) {
        toast.error(texts.chat.noAccessToConversation);
        void navigate('/chat');
      } else if (status === 404 || status === 400) {
        // 400: the ID in the URL is not a number
        toast.error(texts.chat.conversationNotFound);
        void navigate('/chat');
      } else {
        toast.error(`${texts.chat.errorLoadingMessagesOrConversation} ${texts.common.reloadAndTryAgain}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    if (loadedChatAndMessages) {
      // Use preserveIfNewer to avoid overwriting streaming messages
      chatStore.setMessages(chatId, loadedChatAndMessages.messages.items, true);
      chatStore.setChat(chatId, loadedChatAndMessages.chat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedChatAndMessages, chatId]);

  const sendMessage = (input: string, files?: FileDto[], editMessageId?: number) => {
    // Only cancel existing stream for this specific chat if we're starting a new message
    chatStore.cancelActiveStream(chatId);

    if (editMessageId) {
      const currentMessages = useChatStore.getState().chatDataMap.get(chatId)?.messages || [];
      const filteredMessages = currentMessages.filter((message) => message.id > 0 && message.id < editMessageId);
      chatStore.setMessages(chatId, filteredMessages);
    }

    const configurationId = useChatStore.getState().chatDataMap.get(chatId)?.chat.configurationId;

    const humanMessageId = editMessageId ?? getMessagePlaceholderId('human');
    chatStore.addMessage(chatId, {
      type: 'human',
      content: [{ type: 'text', text: input }],
      configurationId: configurationId ?? 0,
      id: humanMessageId,
    });

    const aiMessageId = getMessagePlaceholderId('ai');
    chatStore.addMessage(chatId, {
      type: 'ai',
      content: [{ type: 'text', text: '' }],
      configurationId: configurationId ?? 0,
      id: aiMessageId,
    });

    // Set which message is being streamed to
    chatStore.setStreamingMessageId(chatId, aiMessageId);
    chatStore.setIsAiWriting(chatId, true);

    // Keep track of the actual message ID after it's saved
    let actualAiMessageId = aiMessageId;

    const subscription = chatStore.getStream(chatId, input, files, api, editMessageId, {
      next: (msg) => {
        if (msg.type === 'error' || msg.type === 'completed') {
          chatStore.setIsAiWriting(chatId, false);
          chatStore.setStreamingMessageId(chatId, undefined);
        }

        switch (msg.type) {
          case 'chunk': {
            const chunk = msg.content[0];
            if (chunk.type === 'text') chatStore.appendToStreamingMessage(chatId, chunk.text);
            if (chunk.type === 'image_url') chatStore.appendToStreamingMessage(chatId, `![image](${chunk.image.url})`);
            return;
          }
          case 'reasoning': {
            chatStore.updateReasoning(chatId, msg.content);
            return;
          }
          case 'reasoning_end': {
            chatStore.clearReasoning(chatId);
            return;
          }
          case 'tool_start':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              toolCalls: upsertToolCall(oldMessage.toolCalls, { id: toolId(msg.tool), name: msg.tool.name, status: 'running' }),
            }));
          case 'tool_end':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              toolCalls: upsertToolCall(oldMessage.toolCalls, { id: toolId(msg.tool), name: msg.tool.name, status: 'success' }),
            }));
          case 'tool_error':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              toolCalls: upsertToolCall(oldMessage.toolCalls, {
                id: toolId(msg.tool),
                name: msg.tool.name,
                status: 'error',
                error: msg.error,
              }),
            }));
          case 'debug':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              debug: [...(oldMessage.debug || []), msg.content],
            }));
          case 'sources':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              sources: [...(oldMessage.sources || []), ...msg.content],
            }));
          case 'logging':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              logging: [...(oldMessage.logging || []), msg.content],
            }));
          case 'error':
            return chatStore.updateMessage(chatId, actualAiMessageId, { error: msg.message });
          case 'completed':
            return chatStore.updateMessage(chatId, actualAiMessageId, { tokenCount: msg.metadata.tokenCount });
          case 'saved':
            if (msg.messageType === 'ai') {
              // details opened during the generation (tools, sources) refer to the placeholder
              useInspectorStore.getState().replaceMessageId(chatId, actualAiMessageId, msg.messageId);
              actualAiMessageId = msg.messageId;
              chatStore.setStreamingMessageId(chatId, msg.messageId);
              return chatStore.updateMessage(chatId, aiMessageId, { id: msg.messageId });
            }
            // an edited question is stored as a new message
            return chatStore.updateMessage(chatId, humanMessageId, { id: msg.messageId });
          case 'ui':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              requests: [
                ...(oldMessage.requests ?? []).filter((r) => r.request.id !== msg.request.id),
                { request: msg.request, status: 'waiting' },
              ],
            }));
          case 'ui_update':
            return chatStore.updateRequest(chatId, msg.update.id, {
              status: msg.update.status,
              ...(msg.update.data ? { data: msg.update.data as Record<string, unknown> } : {}),
            });
          case 'summary':
            refetchChats();
        }
      },
      error: (error) => {
        if (error instanceof SseResponseError && error.status === 401) {
          // the session expired, like for all other requests
          redirectToLogin((to) => void navigate(to));
        }
        chatStore.updateMessage(chatId, actualAiMessageId, { error: streamErrorMessage(error) });
        chatStore.setIsAiWriting(chatId, false);
        chatStore.setStreamingMessageId(chatId, undefined);
      },
      complete: () => {
        refetchChats();
        chatStore.setIsAiWriting(chatId, false);
        chatStore.setStreamingMessageId(chatId, undefined);
        const currentChatData = useChatStore.getState().chatDataMap.get(chatId);
        if (currentChatData?.activeStreamSubscription === subscription) {
          chatStore.setActiveStreamSubscription(chatId, undefined);
        }
      },
    });

    chatStore.setActiveStreamSubscription(chatId, subscription);
  };

  const stopMessage = () => {
    if (useChatStore.getState().stopActiveStream(chatId)) {
      // The server stores the partial answer. Load it to get the real message IDs (e.g. to rate the answer).
      void loadStoppedMessages(chatId, () => api.conversations.getMessages(chatId));
    }
  };

  return { sendMessage, stopMessage, isChatLoading };
};

const STOPPED_RELOAD_DELAYS = [0, 250, 500, 1000, 2000];

/**
 * Replaces the local messages with the messages of the server after the generation has been stopped. The server waits
 * for the stopped answer to be stored, but the request may still overtake the abort, so it is retried a few times.
 */
export async function loadStoppedMessages(chatId: number, getMessages: () => Promise<{ items: ChatMessage[] }>) {
  const expectedCount = useChatStore.getState().chatDataMap.get(chatId)?.messages.length ?? 0;

  for (const delay of STOPPED_RELOAD_DELAYS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const { items } = await getMessages();
      const chatData = useChatStore.getState().chatDataMap.get(chatId);
      if (!chatData || chatData.isAiWriting || chatData.messages.length !== expectedCount) {
        // a new message has been sent in the meantime, which updates the messages anyway
        return;
      }
      if (items.length >= expectedCount && items[items.length - 1]?.type === 'ai') {
        useChatStore.getState().setMessages(chatId, items);
        return;
      }
    } catch {
      // try again
    }
  }
}

export const useStateMutateChat = (chatId: number) => {
  const api = useApi();
  const setChat = useChatStore((s) => s.setChat);

  return useMutation({
    mutationFn: (conversionUpdate: UpdateConversationDto) => {
      return api.conversations.patchConversation(chatId, conversionUpdate);
    },
    onSuccess: (updatedChat) => {
      setChat(chatId, updatedChat);
    },
  });
};

/**
 * Answers a request of the AI (form, confirmation, URL). The server reports the result with an `ui_update` event, the
 * local state is updated right away.
 */
export const useConfirmAiAction = (requestId: string) => {
  const api = useApi();
  const currentChatId = useChatStore((s) => s.currentChatId);
  const updateRequest = useChatStore((s) => s.updateRequest);

  return useMutation({
    mutationFn: ({ result }: { result: ChatUICallbackResultDto; status: InteractionStatus }) => {
      return api.conversations.confirm(currentChatId, requestId, result);
    },
    onSuccess: (_, { result, status }) => {
      updateRequest(currentChatId, requestId, {
        status,
        ...(result.data ? { data: result.data as Record<string, unknown> } : {}),
      });
    },
  });
};

/** Whether an answer of the conversation waits for the user (e.g. a form). */
export const useStateOfIsWaitingForUser = (chatId?: number) =>
  useChatStore((state) => {
    const messages = state.chatDataMap.get(chatId ?? state.currentChatId)?.messages ?? [];
    return messages.some((m) => m.requests?.some((r) => r.status === 'waiting' || r.status === 'opened'));
  });

export const useStateMutateChatRating = (chatId: number) => {
  const api = useApi();
  return useMutation({
    mutationFn: (rating: ConversationDtoRatingEnum) => {
      return api.conversations.patchConversation(chatId, { rating });
    },
  });
};

export const useStateMutateMessageRating = (messageId: number) => {
  const api = useApi();
  const chatId = useChatStore((s) => s.currentChatId);
  const updateMessage = useChatStore((s) => s.updateMessage);

  return useMutation({
    mutationFn: async (rating: MessageDtoRatingEnum) => {
      if (chatId) {
        await api.conversations.rateMessage(chatId, messageId, { rating });
      }
    },
    onSuccess: (_, rating) => {
      updateMessage(chatId, messageId, { rating });
    },
  });
};

// Stable fallbacks: the selectors must not return new objects, otherwise every store update re-renders the subscribers.
const NO_CHAT: ConversationDto = { id: 0, configurationId: -1, updatedAt: new Date(0), createdAt: new Date(0) };
const NO_MESSAGES: ChatMessage[] = [];

// The selectors only select what they return, so that streaming (which updates the messages) does not re-render
// components that only need the chat or the assistant (e.g. the chat list).
export const useStateOfChat = () => useChatStore((s) => s.chatDataMap.get(s.currentChatId)?.chat ?? NO_CHAT);

export const useStateOfSelectedChatId = () => useChatStore((s) => s.currentChatId);

export const useStateOfSelectedAssistantId = () =>
  useChatStore((s) => s.chatDataMap.get(s.currentChatId)?.chat.configurationId || -1);

export const useStateOfMessages = () => useChatStore((s) => s.chatDataMap.get(s.currentChatId)?.messages ?? NO_MESSAGES);

/** A message of a (loaded) conversation. */
export const useStateOfMessage = (conversationId: number, messageId: number) =>
  useChatStore((state) => state.chatDataMap.get(conversationId)?.messages.find((m) => m.id === messageId));

export const useStateOfIsAiWriting = () => {
  return useChatStore((state) => state.chatDataMap.get(state.currentChatId)?.isAiWriting || false);
};
