import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { ConversationDto, useApi } from 'src/api';
import { useTransientContext, useTransientNavigate } from 'src/hooks';
import { usePersistentState } from 'src/hooks/stored';
import { buildError } from 'src/lib';
import { notify, toast } from 'src/lib/notifications';
import { useStateOfChat } from 'src/pages/chat/state/chat';
import { useStateOfEnabledAssistants } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import { useListOfChatsStore } from './zustand/listOfChatsStore';

/**
 * @description Initially loads the list of all known chats to make it
 * available in global state.
 **/
export const useListOfChatsInit = () => {
  const api = useApi();
  const setChats = useListOfChatsStore((s) => s.setChats);
  const setRefetchFn = useListOfChatsStore((s) => s.setRefetchFn);

  const initialQueryGetChats = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.conversations.getConversations(),
  });

  useEffect(() => {
    if (initialQueryGetChats.data) setChats(initialQueryGetChats.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetChats.data]);

  useEffect(() => {
    const refetchFn = () => {
      void initialQueryGetChats.refetch();
    };
    setRefetchFn(refetchFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetChats.refetch]);
};

export const useStateMutateDuplicateChat = () => {
  const api = useApi();
  const refetchChatsList = useListOfChatsStore((s) => s.refetch);
  const navigate = useTransientNavigate();

  return useMutation({
    mutationFn: (id: number) => api.conversations.duplicateConversation({ id }),
    onSuccess: (duplicated) => {
      refetchChatsList();
      notify(texts.chat.duplicateConversationSuccess, {
        type: 'success',
        action: { label: texts.chat.openConversation, onClick: () => navigate(`/chat/${duplicated.id}`) },
      });
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.duplicateConversationFailed));
    },
  });
};

export const useStateMutateRenameChat = () => {
  const api = useApi();
  const upsertChat = useListOfChatsStore((s) => s.upsertChat);

  return useMutation({
    mutationFn: ({ chat, name }: { chat: ConversationDto; name: string }) =>
      api.conversations.patchConversation({ id: chat.id, updateConversationDto: { name, isNameSetManually: true } }),
    onSuccess: upsertChat,
    onError: async () => toast.error(await buildError(texts.chat.renameConversationFailed, texts.common.reloadAndTryAgain)),
  });
};

/**
 * Deletes a chat immediately and offers to undo it in a notification (the server keeps deleted chats for a while).
 */
export const useStateMutateRemoveChat = () => {
  const api = useApi();

  const chat = useStateOfChat();
  const removeChat = useListOfChatsStore((s) => s.removeChat);
  const refetchChatsList = useListOfChatsStore((s) => s.refetch);
  const createNewChat = useMutateNewChat();
  const navigate = useTransientNavigate();
  const [persistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  const restore = async (id: number) => {
    try {
      await api.conversations.restoreConversation({ id });
      refetchChatsList();
      navigate(`/chat/${id}`);
    } catch (error) {
      toast.error(await buildError(texts.chat.restoreConversationFailed, error as Error));
    }
  };

  return useMutation({
    mutationFn: (conversation: ConversationDto) => api.conversations.deleteConversation({ id: conversation.id }),
    onMutate: (conversation) => {
      removeChat(conversation.id);
    },
    onSuccess: (_, conversation) => {
      if (conversation.id === chat.id) {
        // Use last selected assistant instead of the deleted chat's assistant
        createNewChat.mutate(persistentAssistantId || undefined);
      }
      notify(conversation.name ? texts.chat.conversationDeleted(conversation.name) : texts.chat.conversationDeletedUnnamed, {
        action: { label: texts.chat.undo, onClick: () => void restore(conversation.id) },
        autoClose: 8000,
      });
    },
    onError: async (error) => {
      refetchChatsList();
      // e.g. the RAG server is not reachable to delete the files of older deleted chats
      toast.error(await buildError(texts.chat.removeConversationFailed, error));
    },
  });
};

export const useStateMutateRemoveAllChats = () => {
  const api = useApi();
  const setChats = useListOfChatsStore((s) => s.setChats);
  const createNewChat = useMutateNewChat();
  const [persistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);
  const currentChat = useStateOfChat();

  return useMutation({
    mutationFn: () => api.conversations.deleteConversations(),
    onSuccess: () => {
      setChats([]);
      // Prioritize current chat's assistant for session reliability, fall back to persisted selection (used on page load when no current chat exists)
      const assistantId = currentChat?.configurationId || persistentAssistantId;
      createNewChat.mutate(assistantId || undefined);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.chat.clearConversationsFailed, error));
    },
  });
};

export const useMutateNewChat = () => {
  const api = useApi();
  const context = useTransientContext();
  const navigate = useTransientNavigate();
  const assistants = useStateOfEnabledAssistants();
  const [persistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  return useMutation({
    mutationFn: (assistantId?: number) => {
      // Use the provided assistantId, then lastSelectedAssistantId, then fallback to first assistant
      const configurationId = assistantId || persistentAssistantId || assistants?.[0]?.id;
      return api.conversations.postConversation({
        createConversationDto: {
          configurationId,
          context,
        },
      });
    },
    onSuccess: (chat) => navigate(`/chat/${chat.id}`),
  });
};

export const useStateOfChats = () => useListOfChatsStore((s) => s.chats);

/**
 * @description returns a function that is true if the provided conversation id
 * points to an empty conversion.
 **/
export const useStateOfChatEmptiness = () => {
  const api = useApi();
  return async (id: number) => {
    const { items } = await api.conversations.getMessages({ id });
    return items.length === 0;
  };
};
