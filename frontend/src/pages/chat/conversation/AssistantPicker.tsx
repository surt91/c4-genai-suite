import { Button, Combobox, ScrollArea, Text, useCombobox } from '@mantine/core';
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { ConfigurationDto } from 'src/api';
import { usePersistentState } from 'src/hooks';
import { useIsPhone } from 'src/hooks/useIsCompact';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import { useStateMutateChat, useStateOfChat } from '../state/chat';
import { useStateOfEnabledAssistants, useStateOfSelectedAssistant } from '../state/listOfAssistants';
import classes from './AssistantPicker.module.css';

// With more assistants the list gets a search input.
const SEARCH_THRESHOLD = 5;

type Assistant = Pick<ConfigurationDto, 'id' | 'name' | 'description'>;

interface AssistantPickerProps {
  assistants: Assistant[];
  value?: Assistant;
  onChange: (id: number) => void;
}

function matches(assistant: Assistant, search: string) {
  const query = search.trim().toLowerCase();
  return !query || assistant.name.toLowerCase().includes(query) || !!assistant.description?.toLowerCase().includes(query);
}

/**
 * The assistant of the chat in the header: a button with its name that opens a list of the assistants (with a search
 * for many of them). A full-width list on phones.
 */
export function AssistantPicker({ assistants, value, onChange }: AssistantPickerProps) {
  const isPhone = useIsPhone();
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const withSearch = assistants.length > SEARCH_THRESHOLD;

  const combobox = useCombobox({
    onDropdownOpen: () => {
      if (withSearch) {
        combobox.focusSearchInput();
      }
      combobox.updateSelectedOptionIndex('active');
    },
    onDropdownClose: () => {
      // return the focus to the button, unless the user clicked somewhere else
      const active = document.activeElement;
      if (!active || active === document.body || dropdownRef.current?.contains(active)) {
        combobox.focusTarget();
      }
      combobox.resetSelectedOption();
      setSearch('');
    },
  });

  // the first match is selected, so Enter picks it
  useEffect(() => {
    if (search) {
      combobox.selectFirstOption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = assistants.filter((assistant) => matches(assistant, search));
  const name = value?.name ?? texts.chat.assistantPicker.select;

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(id) => {
        combobox.closeDropdown();
        if (+id !== value?.id) {
          onChange(+id);
        }
      }}
      position="bottom-start"
      width={isPhone ? 'calc(100vw - 1rem)' : 360}
      middlewares={{ flip: false, shift: { padding: 8 } }}
      shadow="md"
      radius="md"
    >
      <Combobox.Target targetType="button" withExpandedAttribute>
        <Button
          variant="subtle"
          color="gray"
          size={isPhone ? 'compact-sm' : 'sm'}
          rightSection={<IconChevronDown size={16} aria-hidden />}
          onClick={() => combobox.toggleDropdown()}
          title={value?.name}
          aria-label={`${texts.chat.assistantPicker.label}: ${name}`}
          classNames={{ root: classes.button, label: classes.buttonLabel }}
          data-testid="assistant-picker"
        >
          <span className={classes.name}>{name}</span>
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown ref={dropdownRef} data-testid="assistant-picker-dropdown">
        {withSearch && (
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={texts.chat.assistantPicker.search}
            aria-label={texts.chat.assistantPicker.search}
            leftSection={<IconSearch size={14} aria-hidden />}
          />
        )}
        <Combobox.Options aria-label={texts.chat.assistantPicker.label}>
          <ScrollArea.Autosize mah={isPhone ? '60dvh' : 400} type="scroll">
            {filtered.length === 0 ? (
              <Combobox.Empty>{texts.chat.assistantPicker.empty}</Combobox.Empty>
            ) : (
              filtered.map((assistant) => {
                const active = assistant.id === value?.id;
                return (
                  <Combobox.Option
                    key={assistant.id}
                    value={`${assistant.id}`}
                    active={active}
                    aria-selected={active}
                    className={classes.option}
                    aria-label={assistant.name}
                  >
                    <div className={classes.optionText}>
                      <Text size="sm" fw={500} className={classes.optionName}>
                        {assistant.name}
                      </Text>
                      {assistant.description && (
                        <Text size="xs" c="gray.7" lineClamp={2}>
                          {assistant.description}
                        </Text>
                      )}
                    </div>
                    {active && <IconCheck size={18} className={classes.check} aria-hidden />}
                  </Combobox.Option>
                );
              })
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

/**
 * The picker for the current chat: switching the assistant updates the configuration of the conversation (also of an
 * existing one, the next answers come from the new assistant) and is remembered for new chats.
 */
export function ChatAssistantPicker() {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);
  const assistants = useStateOfEnabledAssistants();
  const selected = useStateOfSelectedAssistant();
  const [, setPersistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  if (!chat.id || assistants.length === 0) {
    return null;
  }

  return (
    <AssistantPicker
      assistants={assistants}
      value={selected}
      onChange={(id) => {
        updateChat.mutate(
          { configurationId: id },
          { onError: async (error) => toast.error(await buildError(texts.chat.assistantPicker.saveFailed, error)) },
        );
        setPersistentAssistantId(id);
      }}
    />
  );
}
