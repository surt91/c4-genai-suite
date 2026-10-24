import { Button, Fieldset, Group, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconRotate, IconSettings } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ConfigurationDto,
  ExtensionArgumentObjectSpecDto,
  ExtensionArgumentObjectSpecDtoPropertiesValue,
  ExtensionUserInfoDto,
  useApi,
} from 'src/api';
import { ComposerPopover } from 'src/components/ComposerPopover';
import { ExtensionContext } from 'src/hooks';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver, useUserArgumentsSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';
import classes from './ChatSettings.module.css';

type JSONValue = string | number | boolean | object | unknown[] | undefined;

function getDefault(spec: ExtensionArgumentObjectSpecDtoPropertiesValue): JSONValue {
  switch (spec.type) {
    case 'array':
      return spec.default ?? [];
    case 'string':
      return spec.default ?? '';
    case 'number':
    case 'boolean':
      return spec.default;
    case 'object':
      return getInitialValuesFromSpec(spec);
  }
}

function getInitialValuesFromSpec(spec?: ExtensionArgumentObjectSpecDto): Record<string, JSONValue> {
  return Object.fromEntries(Object.entries(spec?.properties ?? {}).map(([key, property]) => [key, getDefault(property)]));
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

interface ChatSettingsFormProps {
  configuration: ConfigurationDto;
  extensionsWithFilter: ExtensionUserInfoDto[];
  context?: ExtensionContext;
  defaultValues: ExtensionContext;
  onUpdateContext: (context: ExtensionContext) => Promise<unknown>;
  onClose: () => void;
}

/** The settings of the assistant (configurable arguments, stored per user) and the user arguments of the extensions (per chat). */
function ChatSettingsForm(props: ChatSettingsFormProps) {
  const { configuration, extensionsWithFilter, context, defaultValues, onUpdateContext, onClose } = props;
  const api = useApi();
  const queryClient = useQueryClient();
  const configurable = configuration.configurableArguments;

  const valuesQueryKey = [`configuration:${configuration.id}:user-values:default`];
  const { data: fetchedValues } = useQuery({
    queryKey: valuesQueryKey,
    queryFn: () => api.extensions.getConfigurationUserValues({ id: configuration.id }),
    enabled: !!configurable,
  });

  const valuesForm = useForm<ExtensionContext>({
    mode: 'controlled',
    initialValues: getInitialValuesFromSpec(configurable) as ExtensionContext,
    validate: useArgumentObjectSpecResolver<ExtensionContext>(configurable),
  });
  const filterForm = useForm<ExtensionContext>({
    mode: 'controlled',
    initialValues: mergeWithDefaults(context, defaultValues),
    validate: useUserArgumentsSpecResolver<ExtensionContext>(extensionsWithFilter),
  });

  useEffect(() => {
    if (fetchedValues) {
      valuesForm.setValues(fetchedValues.values as ExtensionContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedValues]);

  const save = useMutation({
    mutationFn: async () => {
      if (configurable) {
        await api.extensions.updateConfigurationUserValues({
          id: configuration.id,
          configurationUserValuesDto: { values: valuesForm.getValues() },
        });
        void queryClient.invalidateQueries({ queryKey: valuesQueryKey });
      }
      if (extensionsWithFilter.length > 0) {
        await onUpdateContext(filterForm.getValues());
      }
    },
    onSuccess: () => onClose(),
    onError: async (error) => toast.error(await buildError(texts.chat.chatSettings.saveFailed, error)),
  });

  const submit = () => {
    const invalid = (configurable && valuesForm.validate().hasErrors) || filterForm.validate().hasErrors;
    if (!invalid) {
      save.mutate();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Stack gap="sm">
        {configurable &&
          Object.entries(configurable.properties ?? {}).map(([id, x]) =>
            x.type === 'object' ? (
              <Fieldset key={id} legend={x.title || texts.chat.chatSettings.assistantSettings} variant="unstyled">
                {x.description && (
                  <Text size="xs" c="gray.7" mb="xs">
                    {x.description}
                  </Text>
                )}
                {Object.entries(x.properties).map(([name, spec]) => (
                  <Argument
                    namePrefix={`${id}.`}
                    key={`${id}-${name}`}
                    buckets={[]}
                    name={name}
                    argument={spec}
                    form={valuesForm}
                  />
                ))}
              </Fieldset>
            ) : null,
          )}
        {extensionsWithFilter.map((x) => (
          <Fieldset key={x.name} legend={x.title} variant="unstyled">
            {x.description && (
              <Text size="xs" c="gray.7" mb="xs">
                {x.description}
              </Text>
            )}
            {Object.entries(x.userArguments).map(([name, spec]) => (
              <Argument
                namePrefix={`${x.id}.`}
                key={`${x.id}-${name}`}
                buckets={[]}
                name={name}
                argument={spec}
                form={filterForm}
              />
            ))}
          </Fieldset>
        ))}
        <Group justify="flex-end" gap="xs">
          {extensionsWithFilter.length > 0 && (
            <Button
              type="button"
              variant="subtle"
              size="xs"
              leftSection={<IconRotate size={14} />}
              onClick={() => filterForm.setValues(defaultValues ?? {})}
            >
              {texts.chat.chatSettings.resetAll}
            </Button>
          )}
          <Button type="button" variant="default" size="xs" onClick={onClose}>
            {texts.common.cancel}
          </Button>
          <Button type="submit" size="xs" loading={save.isPending}>
            {texts.chat.chatSettings.apply}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

interface ChatSettingsProps {
  configuration?: ConfigurationDto;
  extensionsWithFilter: ExtensionUserInfoDto[];
  context?: ExtensionContext;
  defaultValues: ExtensionContext;
  onUpdateContext: (context: ExtensionContext) => Promise<unknown>;
  // The chips with the current values (e.g. filters), each opens the settings.
  chips: string[];
}

/**
 * The settings of the chat as chips in the composer: a button and the current values. All of them open one shared
 * popover (bottom sheet on phones) with the settings of the assistant and the options of the extensions. Nothing is
 * shown when there are no settings. The assistant itself is selected in the header (`AssistantPicker`).
 */
export function ChatSettings(props: ChatSettingsProps) {
  const { configuration, chips, ...formProps } = props;
  const [opened, setOpened] = useState(false);
  const close = () => setOpened(false);
  const toggle = () => setOpened((x) => !x);
  const hasSettings = !!configuration?.configurableArguments || formProps.extensionsWithFilter.length > 0;

  if (!configuration || !hasSettings) {
    return null;
  }

  return (
    <ComposerPopover
      opened={opened}
      onClose={close}
      title={texts.chat.chatSettings.title}
      width={420}
      focusTitle
      data-testid="chat-settings-popover"
      target={
        <Group gap={6} className={classes.chips}>
          <Button
            variant="default"
            size="compact-sm"
            radius="xl"
            leftSection={<IconSettings size={14} />}
            onClick={toggle}
            aria-haspopup="dialog"
            aria-expanded={opened}
            data-testid="chat-settings-button"
          >
            {texts.chat.chatSettings.options}
          </Button>
          {chips.map((chip) => (
            <Button
              key={chip}
              variant="light"
              color="gray"
              size="compact-xs"
              radius="xl"
              className={classes.valueChip}
              onClick={toggle}
              aria-label={texts.chat.chatSettings.chipLabel(chip)}
              data-testid="chat-settings-chip"
            >
              <span className={classes.chipLabel}>{chip}</span>
            </Button>
          ))}
        </Group>
      }
    >
      <ChatSettingsForm key={`${configuration.id}-${opened}`} configuration={configuration} onClose={close} {...formProps} />
    </ComposerPopover>
  );
}
