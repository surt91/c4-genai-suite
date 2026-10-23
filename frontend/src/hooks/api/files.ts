import { useMutation, useQuery } from '@tanstack/react-query';
import { FileDto, useApi } from 'src/api';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { useUserFilesStore } from 'src/pages/chat/state/zustand/userFilesStore';
import { texts } from 'src/texts';

export const useDocumentContent = (conversationId: number, messageId: number, documentUri: string) => {
  const { conversations } = useApi();
  return useQuery({
    queryFn: () => conversations.getDocumentChunks(conversationId, messageId, documentUri),
    queryKey: ['files', 'document-content', { messageId }, { documentUri }],
    enabled: !!documentUri,
  });
};

export const useDocument = (conversationId: number, messageId: number, documentUri: string) => {
  const { conversations } = useApi();

  return useQuery({
    queryFn: () => conversations.getDocument(conversationId, messageId, documentUri),
    queryKey: ['files', 'document', { conversationId }, { messageId }, { documentUri }],
    enabled: !!documentUri,
  });
};

export const useConversationFiles = (conversationId: number) => {
  const api = useApi();
  const { userFiles, ...userFilesFunctions } = useUserFilesStore();

  const { data: conversationFiles, refetch } = useQuery({
    queryKey: ['files', 'conversation-files', { conversationId }],
    queryFn: () => api.files.getUserFiles(undefined, undefined, undefined, conversationId),
    select: (data) => data.items,
  });

  const deleteFile = useMutation({
    mutationFn: async (file: FileDto) => {
      return api.files.deleteUserFile(file.id, conversationId);
    },
    onSuccess: (_, file) => {
      userFilesFunctions.remove(file);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeFileFailed, error));
    },
    onSettled: () => refetch(),
  });

  const conversationAndUserFiles = [
    ...userFiles.filter((x) => !conversationFiles?.find((y) => y.id === x.id)),
    ...(conversationFiles || []),
  ];

  return {
    data: conversationAndUserFiles,
    ...userFilesFunctions,
    remove: (file: FileDto) => deleteFile.mutate(file),
    // Forgets a selected personal file without calling the server (e.g. after it has been deleted).
    forget: (file: FileDto) => {
      userFilesFunctions.remove(file);
      void refetch();
    },
    toggle: (file: FileDto) => {
      if (conversationAndUserFiles.find((x) => x.id === file.id)) {
        deleteFile.mutate(file);
      } else {
        userFilesFunctions.add(file);
      }
    },
    refetch,
  };
};
