import { ActionIcon, Box, Button, Group, Portal, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconX } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import type { QAPair } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';

// Module-level schema (Gaible pattern)
const createScheme = () =>
  z.object({
    question: z.string().min(1, texts.evals.qaCatalog.questionRequired),
    expectedOutput: z.string().min(1, texts.evals.qaCatalog.expectedOutputRequired),
    contexts: z.array(z.string()),
  });

type FormValues = z.infer<ReturnType<typeof createScheme>>;

interface EditQaPairDialogProps {
  pair: QAPair;
  onClose: () => void;
  onSave: (pair: QAPair) => void;
}

export function EditQaPairDialog({ pair, onClose, onSave }: EditQaPairDialogProps) {
  const form = useForm<FormValues>({
    validate: zod4Resolver(createScheme()),
    initialValues: {
      question: pair.question,
      expectedOutput: pair.expectedOutput,
      contexts: [...pair.contexts],
    },
    mode: 'controlled',
  });

  const handleSubmit = form.onSubmit((values) => {
    onSave({
      ...pair,
      question: values.question,
      expectedOutput: values.expectedOutput,
      contexts: values.contexts.filter((c) => c.trim() !== ''),
    });
  });

  const addContext = () => {
    form.insertListItem('contexts', '');
  };

  const removeContext = (index: number) => {
    form.removeListItem('contexts', index);
  };

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.editQaPair}
          footer={
            <Group justify="flex-end" gap={16} wrap="nowrap">
              <Button type="button" variant="subtle" onClick={onClose}>
                {texts.common.cancel}
              </Button>
              <Button type="submit">{texts.common.save}</Button>
            </Group>
          }
        >
          <Textarea
            id="question"
            withAsterisk
            label={texts.evals.qaCatalog.questionLabel}
            placeholder={texts.evals.qaCatalog.questionPlaceholder}
            minRows={3}
            mb={16}
            key={form.key('question')}
            {...form.getInputProps('question')}
          />

          <Textarea
            id="expectedOutput"
            withAsterisk
            label={texts.evals.qaCatalog.expectedOutputLabel}
            placeholder={texts.evals.qaCatalog.expectedOutputPlaceholder}
            minRows={3}
            mb={16}
            key={form.key('expectedOutput')}
            {...form.getInputProps('expectedOutput')}
          />

          <Box mb={16}>
            <Group justify="space-between" wrap="nowrap" gap={0} mb={8}>
              <Text component="label" fz="sm" fw={500}>
                {texts.evals.qaCatalog.contextsLabel}
              </Text>
              <Tooltip label={texts.evals.qaCatalog.addContext}>
                <ActionIcon variant="light" size="sm" onClick={addContext}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Text mb={8} fz="xs" lh="1rem" c="dark.3">
              {texts.evals.qaCatalog.contextsHint}
            </Text>

            {form.values.contexts.length === 0 ? (
              <Text fz="sm" c="gray.6" fs="italic">
                {texts.evals.qaCatalog.noContexts}
              </Text>
            ) : (
              <Stack gap={8}>
                {form.values.contexts.map((_, index) => (
                  <Group key={index} gap={8} wrap="nowrap" align="flex-start">
                    <Textarea
                      flex={1}
                      placeholder={texts.evals.qaCatalog.contextsPlaceholder}
                      minRows={2}
                      key={form.key(`contexts.${index}`)}
                      {...form.getInputProps(`contexts.${index}`)}
                    />
                    <Tooltip label={texts.evals.qaCatalog.removeContext}>
                      <ActionIcon variant="subtle" color="red" mt={4} onClick={() => removeContext(index)}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ))}
              </Stack>
            )}
          </Box>
        </Modal>
      </form>
    </Portal>
  );
}
