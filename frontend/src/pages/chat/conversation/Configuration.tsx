import { ActionIcon, Group, Select, SelectProps, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconChevronDown, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { usePersistentState } from 'src/hooks';
import { ConfigurationUserValuesModal } from 'src/pages/chat/conversation/ConfigurationUserValuesModal';
import { useStateOfEnabledAssistants, useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { isMobile } from 'src/pages/utils';
import { texts } from 'src/texts';
import { useStateMutateChat, useStateOfChat } from '../state/chat';
import classes from './Configuration.module.css';

interface ConfigurationProps {
  canEditConfiguration?: boolean;
}

export const Configuration = ({ canEditConfiguration }: ConfigurationProps) => {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);
  const assistants = useStateOfEnabledAssistants();
  const assistant = useStateOfSelectedAssistant();

  const [showModal, setShowModal] = useState(false);

  const [, setPersistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  const renderSelectOption: SelectProps['renderOption'] = ({ option, checked }) => (
    <Group flex="1" gap="xs">
      <div>
        <Text size="sm">{option.label}</Text>
        <Text size="xs" c="gray.7">
          {assistants.find((c) => c.id + '' === option.value)?.description}
        </Text>
      </div>
      {checked && <IconCheck size={20} style={{ marginInlineStart: 'auto' }} />}
    </Group>
  );

  const close = () => setShowModal(false);

  const handleOnChange = (value: string | null) => {
    if (value) {
      updateChat.mutate({ configurationId: +value });
      setPersistentAssistantId(+value);
    }
  };

  return (
    <div className={classes.root}>
      <Select
        aria-label={texts.chat.selectAssistant}
        w={isMobile() ? '100%' : undefined}
        maw={isMobile() ? undefined : 224}
        radius={'md'}
        comboboxProps={{
          radius: 'md',
          shadow: 'md',
          position: 'bottom-start',
          width: isMobile() ? '100%' : '280px',
        }}
        classNames={{
          input: classes.input,
        }}
        maxDropdownHeight={480}
        renderOption={renderSelectOption}
        onChange={handleOnChange}
        value={assistant?.id + ''}
        data={assistants.map((c) => ({ value: c.id + '', label: c.name }))}
        disabled={!canEditConfiguration}
        size="md"
        data-testid="chat-assistant-select"
        scrollAreaProps={{ type: 'always' }}
        rightSection={<IconChevronDown size={16} />}
        searchable
        withCheckIcon
        checkIconPosition="right"
        placeholder={texts.chat.searchAssistantsPlaceholder}
      />
      {assistant?.configurableArguments && (
        <Tooltip label={texts.chat.configureAssistant}>
          <ActionIcon
            data-testid="assistant-user-configuration"
            onClick={() => setShowModal(true)}
            size="xl"
            variant="subtle"
            aria-label={texts.chat.configureAssistant}
          >
            <IconSettings data-testid="configuration-settings-icon" />
          </ActionIcon>
        </Tooltip>
      )}
      {assistant?.configurableArguments && showModal && (
        <ConfigurationUserValuesModal configuration={assistant} onSubmit={close} onClose={close} />
      )}
    </div>
  );
};
