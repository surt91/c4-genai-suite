import { Button, Menu, rem } from '@mantine/core';
import { IconCopy, IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { FormEvent, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationDto } from 'src/api';
import { useIsCompact } from 'src/hooks/useIsCompact';
import { texts } from 'src/texts';
import classes from './ConversationItem.module.css';
import { useStateOfSelectedChatId } from './state/chat';
import { useStateMutateDuplicateChat, useStateMutateRemoveChat, useStateMutateRenameChat } from './state/listOfChats';

const getInputValue = (e: FormEvent<HTMLFormElement>) => (new FormData(e.currentTarget).get('name') as string)?.trim();

interface ChatProps {
  chat: ConversationDto;
}

export const ConversationItem = memo(({ chat }: ChatProps) => {
  const isSelected = chat.id === useStateOfSelectedChatId();
  const removeChat = useStateMutateRemoveChat();
  const duplicateChat = useStateMutateDuplicateChat();
  const renameChat = useStateMutateRenameChat();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const isCompact = useIsCompact();

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = getInputValue(event);
    if (name && name !== chat.name) {
      renameChat.mutate({ chat, name });
    }
    setShowRenameInput(false);
  };

  if (showRenameInput) {
    return (
      <form className={classes.renameForm} onSubmit={submitRename}>
        <div>
          <input
            autoFocus
            name="name"
            className={classes.renameInput}
            onBlur={() => setShowRenameInput(false)}
            onKeyUp={(e) => e.key === 'Escape' && setShowRenameInput(false)}
            defaultValue={chat.name}
            data-testid="conversation-rename-input"
            aria-label={texts.accessibility.renameConversation}
          />
        </div>
      </form>
    );
  }

  return (
    <div className={classes.root} data-testid="conversation-item">
      <Button
        size="sm"
        px="xs"
        onClick={async () => await navigate(`/chat/${chat.id}`)}
        justify="flex-start"
        variant={isSelected ? 'filled' : 'subtle'}
        classNames={{
          root: classes.button,
          label: classes.buttonLabel,
        }}
        onDoubleClick={() => isSelected && setShowRenameInput(true)}
        title={chat.name}
      >
        {chat.name}
      </Button>
      <div className={clsx(classes.actions, !isCompact && !isSelected && classes.actionsHover)}>
        <Menu width={200} opened={menuOpen} onChange={setMenuOpen} withInitialFocusPlaceholder={false}>
          <Menu.Target>
            <Button
              variant="subtle"
              size="compact-xs"
              p={4}
              aria-label={texts.common.menu}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <IconDots
                style={{ width: rem(18), height: rem(18) }}
                data-testid={isSelected ? 'active-conversation-item-more-actions' : 'conversation-item-more-actions'}
              />
            </Button>
          </Menu.Target>
          <Menu.Dropdown aria-label={texts.accessibility.conversationOptions}>
            <Menu.Item
              leftSection={<IconEdit size={16} />}
              disabled={renameChat.isPending}
              onClick={() => setShowRenameInput(true)}
            >
              {texts.common.rename}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy size={16} />}
              disabled={duplicateChat.isPending}
              onClick={() => duplicateChat.mutate(chat.id)}
            >
              {texts.common.duplicate}
            </Menu.Item>
            <Menu.Item
              c="red.9"
              leftSection={<IconTrash size={16} />}
              disabled={removeChat.isPending}
              onClick={() => removeChat.mutate(chat.id)}
            >
              {texts.common.remove}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
});
