import { Button } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { CreateExtensionDto, useApi } from 'src/api';
import { DisabledAwareTooltip } from 'src/components/DisabledAwareTooltip';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

type TestButtonProps = { extensionId?: number; form: UseFormReturnType<CreateExtensionDto> };

export function TestButton(props: TestButtonProps) {
  const { extensionId, form } = props;
  const api = useApi();
  const testing = useMutation({
    mutationFn: (values: CreateExtensionDto) => {
      return api.extensions.testExtension({ ...values, id: extensionId });
    },
    onSuccess: () => {
      toast.success(texts.extensions.testSuccess);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.testFailed, error));
    },
  });

  // The test button is testable if the form is valid or if the form was not changed
  const isTestable = form.isValid() || !form.isDirty();
  // Disable if form can not be tested or is currently testing
  const isDisabled = !isTestable || testing.isPending;

  return (
    <DisabledAwareTooltip label={texts.extensions.testTooltip}>
      <Button
        type="button"
        variant="outline"
        disabled={isDisabled}
        onClick={() => {
          const validation = form.validate();
          if (!validation.hasErrors) {
            testing.mutate(form.getValues());
          }
        }}
        loading={testing.isPending}
      >
        {texts.extensions.test}
      </Button>
    </DisabledAwareTooltip>
  );
}
