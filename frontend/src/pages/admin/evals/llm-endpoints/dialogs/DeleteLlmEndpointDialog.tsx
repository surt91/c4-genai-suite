import { Button, Group, Portal, Text } from '@mantine/core';
import type { LLMEndpoint } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useDeleteLlmEndpoint } from '../hooks/useLlmEndpointMutations';

interface DeleteLlmEndpointDialogProps {
  endpoint: LLMEndpoint;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteLlmEndpointDialog({ endpoint, onClose, onDeleted }: DeleteLlmEndpointDialogProps) {
  const deleteMutation = useDeleteLlmEndpoint();

  const handleConfirm = () => {
    deleteMutation.mutate(
      {
        id: endpoint.id,
        data: { version: endpoint.version },
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
        header={texts.evals.llmEndpoint.deleteConfirmTitle}
        footer={
          <fieldset disabled={deleteMutation.isPending}>
            <Group justify="flex-end" gap="md">
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
        <Text c="gray.8">{texts.evals.llmEndpoint.deleteConfirmText(endpoint.name)}</Text>
      </Modal>
    </Portal>
  );
}
