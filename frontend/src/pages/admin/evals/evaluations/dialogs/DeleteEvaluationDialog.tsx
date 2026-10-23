import { Button, Group, Portal, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useDeleteEvaluation } from '../hooks/useEvaluationMutations';

interface DeleteEvaluationDialogProps {
  evaluation: EvaluationDetailSummary;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteEvaluationDialog({ evaluation, onClose, onDeleted }: DeleteEvaluationDialogProps) {
  const deleteMutation = useDeleteEvaluation();

  const handleConfirm = () => {
    deleteMutation.mutate(
      {
        id: evaluation.id,
        data: { version: evaluation.version },
      },
      {
        onSuccess: () => {
          onDeleted?.();
          onClose();
        },
      },
    );
  };

  return (
    <Portal>
      <Modal
        onClose={onClose}
        header={texts.evals.evaluations.deleteConfirmTitle}
        footer={
          <fieldset disabled={deleteMutation.isPending}>
            <Group justify="flex-end" gap={16} wrap="nowrap">
              <Button type="button" variant="subtle" onClick={onClose}>
                {texts.common.cancel}
              </Button>
              <Button type="button" color="red" onClick={handleConfirm} loading={deleteMutation.isPending}>
                {texts.common.remove}
              </Button>
            </Group>
          </fieldset>
        }
      >
        <Group align="flex-start" gap={12} wrap="nowrap">
          <IconAlertTriangle size={24} color="var(--mantine-color-red-7)" style={{ flexShrink: 0 }} />
          <Text c="gray.8">{texts.evals.evaluations.deleteConfirmText(evaluation.name)}</Text>
        </Group>
      </Modal>
    </Portal>
  );
}
