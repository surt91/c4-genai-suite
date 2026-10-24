import { Button, FileInput, Group, Portal, Tabs, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFile, IconFileUpload, IconUpload } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { FormAlert, Modal } from 'src/components';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';

const ACCEPTED_FILE_TYPES = '.csv,.json,.xlsx';

// Created when used, so that the messages are in the language of the installation
const createEmptyScheme = () =>
  z.object({
    name: z.string().min(1, texts.evals.qaCatalog.catalogNameRequired),
  });

const createUploadScheme = () =>
  z.object({
    name: z.string().min(1, texts.evals.qaCatalog.catalogNameRequired),
    file: z.instanceof(File, { message: texts.evals.qaCatalog.fileRequired }),
  });

type EmptyFormValues = z.infer<ReturnType<typeof createEmptyScheme>>;
type UploadFormValues = z.infer<ReturnType<typeof createUploadScheme>>;

interface CreateQaCatalogDialogProps {
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateQaCatalogDialog({ onClose, onCreated }: CreateQaCatalogDialogProps) {
  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('empty');

  const emptyForm = useForm<EmptyFormValues>({
    validate: zod4Resolver(createEmptyScheme()),
    initialValues: {
      name: '',
    },
    mode: 'controlled',
  });

  const uploadForm = useForm<UploadFormValues>({
    validate: zod4Resolver(createUploadScheme()),
    initialValues: {
      name: '',
      file: null as unknown as File,
    },
    mode: 'controlled',
  });

  const createEmptyMutation = useMutation({
    mutationFn: async (values: EmptyFormValues) => {
      return await evalApi.qaCatalog.qaCatalogCreateEmpty({ name: values.name });
    },
    onSuccess: (catalog) => {
      toast.success(texts.evals.qaCatalog.createSuccess);
      onCreated?.();
      onClose();
      void navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      return await evalApi.qaCatalog.qaCatalogUpload({
        bodyUploadV1QaCatalogUploadPost: { file: values.file, name: values.name },
      });
    },
    onSuccess: (catalog) => {
      toast.success(texts.evals.qaCatalog.createSuccess);
      onCreated?.();
      onClose();
      void navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
    },
  });

  const handleEmptySubmit = emptyForm.onSubmit((values) => {
    void createEmptyMutation.mutate(values);
  });

  const handleUploadSubmit = uploadForm.onSubmit((values) => {
    void uploadMutation.mutate(values);
  });

  const isPending = createEmptyMutation.isPending || uploadMutation.isPending;
  const error = activeTab === 'empty' ? createEmptyMutation.error : uploadMutation.error;

  return (
    <Portal>
      <form
        noValidate
        onSubmit={(e) => {
          if (activeTab === 'empty') {
            handleEmptySubmit(e);
          } else if (activeTab === 'upload') {
            handleUploadSubmit(e);
          } else {
            e.preventDefault();
          }
        }}
      >
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.createTitle}
          footer={
            <fieldset disabled={isPending}>
              <Group justify="flex-end" gap={16} wrap="nowrap">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                {activeTab === 'empty' && (
                  <Button type="submit" loading={createEmptyMutation.isPending}>
                    {texts.evals.qaCatalog.create}
                  </Button>
                )}
                {activeTab === 'upload' && (
                  <Button type="submit" loading={uploadMutation.isPending}>
                    {texts.evals.qaCatalog.create}
                  </Button>
                )}
              </Group>
            </fieldset>
          }
        >
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="empty" leftSection={<IconFile size={16} />}>
                {texts.evals.qaCatalog.createTabEmpty}
              </Tabs.Tab>
              <Tabs.Tab value="upload" leftSection={<IconFileUpload size={16} />}>
                {texts.evals.qaCatalog.createTabUpload}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="empty" pt="md">
              <fieldset disabled={createEmptyMutation.isPending}>
                <FormAlert common={texts.evals.qaCatalog.createFailed} error={error} />

                <Text mb={16} fz="sm" c="dark.3">
                  {texts.evals.qaCatalog.createEmptyDescription}
                </Text>

                <TextInput
                  id="empty-name"
                  withAsterisk
                  label={texts.evals.qaCatalog.catalogName}
                  placeholder={texts.evals.qaCatalog.catalogNamePlaceholder}
                  mb={16}
                  key={emptyForm.key('name')}
                  {...emptyForm.getInputProps('name')}
                />
              </fieldset>
            </Tabs.Panel>

            <Tabs.Panel value="upload" pt="md">
              <fieldset disabled={uploadMutation.isPending}>
                <FormAlert common={texts.evals.qaCatalog.createFailed} error={error} />

                <TextInput
                  id="upload-name"
                  withAsterisk
                  label={texts.evals.qaCatalog.catalogName}
                  placeholder={texts.evals.qaCatalog.catalogNamePlaceholder}
                  mb={16}
                  key={uploadForm.key('name')}
                  {...uploadForm.getInputProps('name')}
                />

                <FileInput
                  id="file"
                  withAsterisk
                  label={texts.evals.qaCatalog.uploadFile}
                  description={texts.evals.qaCatalog.uploadFileFormats}
                  placeholder={texts.evals.qaCatalog.uploadFileHint}
                  accept={ACCEPTED_FILE_TYPES}
                  leftSection={<IconUpload size={16} />}
                  mb={16}
                  key={uploadForm.key('file')}
                  {...uploadForm.getInputProps('file')}
                />
              </fieldset>
            </Tabs.Panel>
          </Tabs>
        </Modal>
      </form>
    </Portal>
  );
}
