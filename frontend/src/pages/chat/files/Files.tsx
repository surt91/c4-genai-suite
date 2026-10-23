import { Button, Checkbox, Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { type ExtensionBucketSettingsDto, FileDto, useApi } from 'src/api';
import { Pagination } from 'src/components';
import { useTypedMutationStates } from 'src/hooks';
import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import classes from './Files.module.css';
import { useFileIdSelector } from './useFileIdSelector';

type FileProps = {
  conversationId: number;
  configurationId: number;
  userBucket: ExtensionBucketSettingsDto;
  // Opens the management of the files (rename, delete).
  onManage?: () => void;
};

const pageSize = 20;

/**
 * The personal files of the user (user bucket) to select for the conversation, shown in the popover "My files" of the
 * composer: search, select, upload.
 */
export function Files({ conversationId, userBucket, configurationId, onManage }: FileProps) {
  const api = useApi();

  const allowedFileNameExtensions = userBucket.fileNameExtensions ?? [];
  const fileIdSelector = useFileIdSelector(conversationId);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // useFsAccessApi is false to allow the playwright tests to test file uploads
    // see: https://github.com/react-dropzone/react-dropzone?tab=readme-ov-file#file-dialog-cancel-callback
    useFsAccessApi: false,
    onDrop: (files) => files.forEach((file) => upload.mutate(file)),
  });

  const {
    data: loadedFiles,
    refetch: refetchFiles,
    isPending,
  } = useQuery({
    queryKey: ['user-files', page, pageSize, debouncedSearch],
    queryFn: () => api.files.getUserFiles(page, pageSize, debouncedSearch || undefined),
    refetchInterval: (query) => (query.state.data?.items.some((file) => file.uploadStatus === 'inProgress') ? 1000 : false),
  });
  const { data: conversationBucket } = useConversationBucketAvailabilities(configurationId);
  const upload = useMutation({
    mutationKey: ['upload-user-file'],
    mutationFn: (file: File) => api.files.postUserFile(userBucket.extensionId, undefined, file),
    onSuccess: (file) => fileIdSelector.selectId({ ...file, bucketType: 'user' }),
    onError: async (error, file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        return toast.error(await buildError(`${texts.files.uploadFailed} '${file.name}'`, error));
      }
      // images can be uploaded to the conversation (e.g. for vision models) instead
      if ((conversationBucket?.extensions.length ?? 0) > 0) {
        toast.error(texts.files.uploadImageFailedUseThePaperclip(file.name));
      } else {
        toast.error(texts.files.uploadImageFailedNotYetSupported(file.name));
      }
    },
    onSettled: () => refetchFiles(),
  });
  const uploadMutations = useTypedMutationStates(upload, ['upload-user-file']);

  const pendingUploads = uploadMutations
    .filter((mutation) => mutation.status === 'pending')
    .map((mutation) => mutation.variables!.name)
    // a file that is processed already is shown by the list
    .filter((name) => !loadedFiles?.items.some((item) => item.fileName === name));

  const items = loadedFiles?.items ?? [];
  const total = loadedFiles?.total ?? items.length;
  const isSelected = (file: FileDto) => fileIdSelector.selectedIDs.includes(file.id);

  return (
    <Stack gap="xs" data-testid="my-files">
      <Text size="xs" c="gray.7">
        {texts.chat.myFiles.hint}
      </Text>
      <TextInput
        size="xs"
        leftSection={<IconSearch size={14} />}
        placeholder={texts.chat.myFiles.search}
        aria-label={texts.chat.myFiles.search}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(0);
        }}
        data-autofocus
      />

      <div className={classes.dropzone} {...getRootProps()}>
        <input
          {...getInputProps()}
          accept={allowedFileNameExtensions.length > 0 ? allowedFileNameExtensions.join(', ') : undefined}
          aria-label={texts.common.dropZone}
        />
        {isDragActive ? <p>{texts.common.dropZoneDrop}</p> : <p>{texts.common.dropZone}</p>}
      </div>

      {items.length > 0 && (
        <Group justify="space-between" gap={8}>
          <Button
            size="compact-xs"
            type="button"
            variant="light"
            disabled={items.every(isSelected)}
            onClick={() => items.forEach((file) => !isSelected(file) && fileIdSelector.selectId({ ...file, bucketType: 'user' }))}
          >
            {texts.files.selectAll}
          </Button>
          <Button
            size="compact-xs"
            type="button"
            variant="subtle"
            disabled={!items.some(isSelected)}
            onClick={() => items.forEach((file) => isSelected(file) && fileIdSelector.deselectId(file))}
          >
            {texts.files.deselectAll}
          </Button>
        </Group>
      )}

      <Stack gap={4} className={classes.list}>
        {pendingUploads.map((name, i) => (
          <Group key={`upload-${i}-${name}`} gap="xs" wrap="nowrap" className={classes.pending}>
            <Loader size={12} />
            <Text size="sm" truncate>
              {name}
            </Text>
            <Text size="xs" c="gray.7">
              {texts.files.uploading}
            </Text>
          </Group>
        ))}
        {items.map((file) =>
          file.uploadStatus === 'inProgress' ? (
            <Group key={file.id} gap="xs" wrap="nowrap" className={classes.pending}>
              <Loader size={12} />
              <Text size="sm" truncate>
                {file.fileName}
              </Text>
              <Text size="xs" c="gray.7">
                {texts.files.uploading}
              </Text>
            </Group>
          ) : (
            <Checkbox
              key={file.id}
              size="sm"
              checked={isSelected(file)}
              onChange={() => fileIdSelector.toggleIdSelection({ ...file, bucketType: 'user' })}
              label={<span className={classes.fileName}>{file.fileName}</span>}
              aria-label={texts.accessibility.selectFile(file.fileName)}
              classNames={{ body: classes.checkboxBody, labelWrapper: classes.checkboxLabel }}
              data-testid="my-files-item"
            />
          ),
        )}
        {!isPending && items.length === 0 && pendingUploads.length === 0 && (
          <Text size="sm" c="gray.7">
            {debouncedSearch ? texts.chat.myFiles.noResults : texts.chat.myFiles.empty}
          </Text>
        )}
      </Stack>

      {total > pageSize && <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />}

      {onManage && (
        <Group justify="flex-end">
          <Button size="compact-sm" variant="subtle" onClick={onManage} data-testid="my-files-manage">
            {texts.chat.myFiles.manage}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
