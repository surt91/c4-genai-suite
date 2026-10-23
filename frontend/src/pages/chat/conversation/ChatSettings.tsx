import { Button, Divider, Fieldset, Group, Select, SelectProps, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconChevronUp, IconRobot, IconRotate, IconSettings } from '@tabler/icons-react';
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
import { ExtensionContext, usePersistentState } from 'src/hooks';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver, useUserArgumentsSpecResolver } from 'src/pages/admin/extensions/hooks';
import { useStateOfEnabledAssistants } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import { useStateMutateChat, useStateOfChat } from '../state/chat';
import classes from './ChatSettings.module.css';

type JSONValue = string | number | boolean | object | unknown[] | undefined;

function getDefault(spec: ExtensionArgumentObjectSpecDtoPropertiesValue): JSONValue {
  switch (spec.type) {
    case 'array':
      return spec._default ?? [];
    case 'string':
      return spec._default ?? '';
    case 'number':
    case 'boolean':
      return spec._default;
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

function AssistantSelect() {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);
  const assistants = useStateOfEnabledAssistants();
  const [, setPersistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  const renderSelectOption: SelectProps['renderOption'] = ({ option, checked }) => (
    <Group flex="1" gap="xs" wrap="nowrap">
      <div>
        <Text size="sm">{option.label}</Text>
        <Text size="xs" c="gray.7">
          {assistants.find((c) => c.id + '' === option.value)?.description}
        </Text>
      </div>
      {checked && <IconCheck size={20} className={classes.check} />}
    </Group>
  );

  return (
    <Select
      label={texts.chat.chatSettings.assistant}
      aria-label={texts.chat.selectAssistant}
      comboboxProps={{ withinPortal: false, shadow: 'md' }}
      maxDropdownHeight={320}
      renderOption={renderSelectOption}
      onChange={(value) => {
        if (value) {
          updateChat.mutate({ configurationId: +value });
          setPersistentAssistantId(+value);
        }
      }}
      value={chat.configurationId > 0 ? chat.configurationId + '' : null}
      data={assistants.map((c) => ({ value: c.id + '', label: c.name }))}
      data-testid="chat-assistant-select"
      searchable
      withCheckIcon
      checkIconPosition="right"
      placeholder={texts.chat.searchAssistantsPlaceholder}
    />
  );
}

interface ChatSettingsFormProps {
  chatId: number;
  configuration: ConfigurationDto;
  extensionsWithFilter: ExtensionUserInfoDto[];
  context?: ExtensionContext;
  defaultValues: ExtensionContext;
  onUpdateContext: (context: ExtensionContext) => void;
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
    queryFn: () => api.extensions.getConfigurationUserValues(configuration.id),
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
      valuesForm.setValues(fetchedValues.values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedValues]);

  const save = useMutation({
    mutationFn: async () => {
      if (configurable) {
        await api.extensions.updateConfigurationUserValues(configuration.id, { values: valuesForm.getValues() });
        void queryClient.invalidateQueries({ queryKey: valuesQueryKey });
      }
      if (extensionsWithFilter.length > 0) {
        onUpdateContext(filterForm.getValues());
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

  if (!configurable && extensionsWithFilter.length === 0) {
    return null;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Stack gap="sm">
        <Divider />
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
  chatId: number;
  configuration?: ConfigurationDto;
  extensionsWithFilter: ExtensionUserInfoDto[];
  context?: ExtensionContext;
  defaultValues: ExtensionContext;
  onUpdateContext: (context: ExtensionContext) => void;
  // The chips with the current values (e.g. filters), each opens the settings.
  chips: string[];
}

/**
 * The settings of the chat as chips in the composer: the assistant and the current values. All of them open one shared
 * popover (bottom sheet on phones) with the assistant, its settings and the options of the extensions.
 */
export function ChatSettings(props: ChatSettingsProps) {
  const { configuration, chips, ...formProps } = props;
  const [opened, setOpened] = useState(false);
  const close = () => setOpened(false);
  const toggle = () => setOpened((x) => !x);
  const hasSettings = !!configuration?.configurableArguments || formProps.extensionsWithFilter.length > 0;

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
            leftSection={<IconRobot size={14} />}
            rightSection={<IconChevronUp size={12} />}
            onClick={toggle}
            aria-haspopup="dialog"
            aria-expanded={opened}
            aria-label={`${texts.chat.chatSettings.assistant}: ${configuration?.name ?? ''}`}
            className={classes.assistantChip}
            data-testid="chat-settings-button"
          >
            <span className={classes.chipLabel}>{configuration?.name ?? texts.chat.selectAssistant}</span>
          </Button>
          {hasSettings && (
            <Button
              variant="subtle"
              size="compact-sm"
              radius="xl"
              leftSection={<IconSettings size={14} />}
              onClick={toggle}
              data-testid="chat-settings-options"
            >
              {texts.chat.filters}
            </Button>
          )}
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
      <Stack gap="sm">
        <AssistantSelect />
        {configuration && (
          <ChatSettingsForm key={`${configuration.id}-${opened}`} configuration={configuration} onClose={close} {...formProps} />
        )}
      </Stack>
    </ComposerPopover>
  );
}
