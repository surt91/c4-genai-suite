import { Button, Group, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useUpdateEvaluation } from '../hooks/useEvaluationMutations';

// Module-level schema (Gaible pattern)
const createScheme = () =>
  z.object({
    name: z.string().min(1, texts.evals.evaluations.nameRequired),
  });

type FormValues = z.infer<ReturnType<typeof createScheme>>;

interface EditEvaluationNameDialogProps {
  evaluation: EvaluationDetailSummary;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EditEvaluationNameDialog({ evaluation, onClose, onUpdated }: EditEvaluationNameDialogProps) {
  const updateMutation = useUpdateEvaluation();

  const form = useForm<FormValues>({
    validate: zod4Resolver(createScheme()),
    initialValues: {
      name: evaluation.name,
    },
    mode: 'controlled',
  });

  const handleSubmit = form.onSubmit((values) => {
    updateMutation.mutate(
      {
        id: evaluation.id,
        data: { name: values.name.trim(), version: evaluation.version },
      },
      {
        onSuccess: () => {
          onUpdated?.();
          onClose();
        },
      },
    );
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.evaluations.editNameTitle}
          footer={
            <fieldset disabled={updateMutation.isPending}>
              <Group justify="flex-end" gap={16} wrap="nowrap">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  {texts.common.save}
                </Button>
              </Group>
            </fieldset>
          }
        >
          <fieldset disabled={updateMutation.isPending}>
            <TextInput
              id="name"
              withAsterisk
              label={texts.evals.evaluations.nameLabel}
              placeholder={texts.evals.evaluations.namePlaceholder}
              mb={16}
              key={form.key('name')}
              {...form.getInputProps('name')}
            />
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
