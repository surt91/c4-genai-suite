import { Button } from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import { ChatUICallbackResultDto, type ExtensionArgumentObjectSpecDto, StreamUIRequestDto } from 'src/api';
import { Markdown } from 'src/components';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';
import { useConfirmAiAction } from '../../state/chat';
import classes from './ChatItem.module.css';

type DynamicFormProps<T> = { schema: ExtensionArgumentObjectSpecDto; form: UseFormReturnType<T> };

function DynamicForm<T>(props: DynamicFormProps<T>) {
  const { schema, form } = props;

  return (
    <>
      {schema.type === 'object' && Object.keys(schema.properties).length > 0 && (
        <div className={classes.userInputFields}>
          {Object.entries(schema.properties).map(([name, spec]) => (
            <Argument key={name} buckets={[]} name={name} argument={spec} form={form} />
          ))}
        </div>
      )}
    </>
  );
}

type FormValues = Record<string, unknown>;

export const ChatItemUserInput = memo(({ request }: { request: StreamUIRequestDto }) => {
  const confirmAiAction = useConfirmAiAction(request.id);
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {},
    validate: useArgumentObjectSpecResolver<FormValues>(request.schema),
  });

  const onSubmit = (data: ChatUICallbackResultDto['data']) => {
    confirmAiAction.mutate({ action: 'accept', data });
  };

  if (confirmAiAction.isSuccess) {
    return null;
  }

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <div className={classes.userInput}>
        <div>
          <Markdown>{request.text}</Markdown>
        </div>
        {request.schema && <DynamicForm schema={request.schema} form={form} />}
        <fieldset>
          <div className={classes.userInputFooter}>
            <div></div>
            <div className={classes.userInputButtons}>
              <Button type="button" variant="subtle" onClick={() => confirmAiAction.mutate({ action: 'reject' })}>
                {texts.common.reject}
              </Button>
              <Button type="submit">{texts.common.confirm}</Button>
            </div>
          </div>
        </fieldset>
      </div>
    </form>
  );
});
