import { Button, Fieldset } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconRotate } from '@tabler/icons-react';
import { PropsWithChildren } from 'react';
import { ExtensionUserInfoDto } from 'src/api';
import { Modal } from 'src/components';
import { ExtensionContext } from 'src/hooks';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useUserArgumentsSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';
import classes from './ArgumentsModal.module.css';

interface JsonFormProps {
  onClose?: () => void;
  extensions: ExtensionUserInfoDto[];
  onSubmit: (newContext: ExtensionContext) => void;
  values?: ExtensionContext;
  defaultValues?: ExtensionContext;
}

function mergeWithDefaults(values: ExtensionContext | undefined, defaultValues: ExtensionContext | undefined): ExtensionContext {
  if (!defaultValues) return values ?? {};
  if (!values) return defaultValues;

  const result: ExtensionContext = {};
  for (const extId of Object.keys(defaultValues)) {
    result[extId] = { ...defaultValues[extId], ...values[extId] };
  }
  return result;
}

export function FilterModal(props: JsonFormProps & PropsWithChildren) {
  const { extensions, onClose, values, defaultValues } = props;

  const form = useForm<ExtensionContext>({
    mode: 'controlled',
    initialValues: mergeWithDefaults(values, defaultValues),
    validate: useUserArgumentsSpecResolver<ExtensionContext>(extensions),
  });

  return (
    <form onSubmit={form.onSubmit((v) => props.onSubmit(v))}>
      <Modal
        onClose={onClose}
        header={texts.chat.filterHeadline}
        footer={
          <fieldset>
            <div className={classes.footer}>
              <Button
                type="button"
                variant="outline"
                leftSection={<IconRotate size={16} />}
                onClick={() => form.setValues(defaultValues ?? {})}
              >
                {texts.chat.filterResetAll}
              </Button>
              <div className={classes.buttons}>
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit">{texts.chat.filterApply}</Button>
              </div>
            </div>
          </fieldset>
        }
      >
        <div className={classes.fields}>
          {extensions.map((x) => (
            <Fieldset
              key={x.name}
              legend={
                <div className={classes.legend}>
                  <h4 className={classes.legendTitle}>{x.title}</h4>
                  <p className={classes.legendDescription}>{x.description}</p>
                </div>
              }
            >
              {Object.entries(x.userArguments).map(([name, spec]) => (
                <Argument namePrefix={`${x.id}.`} key={`${x.id}-${name}`} buckets={[]} name={name} argument={spec} form={form} />
              ))}
            </Fieldset>
          ))}
        </div>
      </Modal>
    </form>
  );
}
