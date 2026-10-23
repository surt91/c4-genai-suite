import { ActionIcon, Group, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from 'date-fns';
import { useState } from 'react';
import { FileDto, useApi } from 'src/api';
import { ConfirmDialog, Modal, Pagination } from 'src/components';
import { useConversationFiles } from 'src/hooks/api/files';
import { buildError, formatFileSize } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';

const pageSize = 20;

function FileRow({ file, onDelete }: { file: FileDto; onDelete: (file: FileDto) => void }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.fileName);

  const rename = useMutation({
    mutationFn: (fileName: string) => api.files.renameUserFile(file.id, { fileName }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['user-files'] });
      void queryClient.invalidateQueries({ queryKey: ['files', 'conversation-files'] });
    },
    onError: async (error) => toast.error(await buildError(texts.chat.myFiles.renameFailed, error)),
  });

  const save = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== file.fileName) {
      rename.mutate(trimmed);
    } else {
      setEditing(false);
    }
  };

  return (
    <Group gap="xs" wrap="nowrap" justify="space-between" data-testid="manage-files-row">
      {editing ? (
        <TextInput
          size="xs"
          autoFocus
          flex={1}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              setName(file.fileName);
              setEditing(false);
            }
          }}
          aria-label={texts.chat.myFiles.renameLabel(file.fileName)}
        />
      ) : (
        <Stack gap={0} miw={0} flex={1}>
          <Text size="sm" truncate title={file.fileName}>
            {file.fileName}
          </Text>
          <Text size="xs" c="dimmed">
            {formatFileSize(file.fileSize)} · {formatDate(file.uploadedAt, 'Pp')}
          </Text>
        </Stack>
      )}
      <Group gap={4} wrap="nowrap">
        {editing ? (
          <>
            <ActionIcon variant="subtle" color="gray" onClick={() => setEditing(false)} aria-label={texts.common.cancel}>
              <IconX size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" onClick={save} loading={rename.isPending} aria-label={texts.common.save}>
              <IconCheck size={16} />
            </ActionIcon>
          </>
        ) : (
          <>
            <Tooltip label={texts.chat.myFiles.rename}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setEditing(true)}
                aria-label={`${texts.chat.myFiles.rename}: ${file.fileName}`}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
            <ConfirmDialog
              title={texts.files.removeFilesConfirmTitle}
              text={texts.files.removeFileConfirmText}
              performText={texts.common.remove}
              onPerform={() => onDelete(file)}
            >
              {({ onClick }) => (
                <Tooltip label={texts.common.remove}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={onClick}
                    aria-label={`${texts.common.remove}: ${file.fileName}`}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </ConfirmDialog>
          </>
        )}
      </Group>
    </Group>
  );
}

/** Manages the personal files: rename and delete. */
export function ManageFilesModal({ conversationId, onClose }: { conversationId: number; onClose: () => void }) {
  const api = useApi();
  const [page, setPage] = useState(0);
  const { forget } = useConversationFiles(conversationId);

  const { data, refetch } = useQuery({
    queryKey: ['user-files', 'manage', page, pageSize],
    queryFn: () => api.files.getUserFiles(page, pageSize),
  });

  const deleteFile = useMutation({
    mutationFn: (file: FileDto) => api.files.deleteUserFile(file.id),
    onError: async (error) => toast.error(await buildError(texts.files.removeFileFailed, error)),
    onSuccess: (_, file) => forget(file),
    onSettled: () => refetch(),
  });

  const items = data?.items ?? [];

  return (
    <Modal withinPortal header={texts.chat.myFiles.manageTitle} onClose={onClose} data-testid="manage-files-modal">
      <Stack gap="sm">
        {items.map((file) => (
          <FileRow key={file.id} file={file} onDelete={(f) => deleteFile.mutate(f)} />
        ))}
        {data && items.length === 0 && (
          <Text size="sm" c="dimmed">
            {texts.chat.myFiles.empty}
          </Text>
        )}
        <Pagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} />
      </Stack>
    </Modal>
  );
}
