import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import {
  IconEdit,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRight,
  IconMenu2,
} from '@tabler/icons-react';
import { useIsCompact } from 'src/hooks/useIsCompact';
import { texts } from 'src/texts';
import { useStateOfSelectedChatId } from '../state/chat';
import { useStateOfChats } from '../state/listOfChats';
import { ChatAssistantPicker } from './AssistantPicker';
import classes from './ConversationHeader.module.css';

interface ConversationHeaderProps {
  isChatListOpen: boolean;
  onToggleChatList: () => void;
  showNewChat: boolean;
  onNewChat: () => void;
  // Whether the inspector has views (it may be hidden).
  hasDetails: boolean;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
}

/**
 * The header of the conversation with labeled buttons instead of handles at the edges: the chat list on the left
 * (burger on small screens), the assistant of the chat, the details (inspector) on the right when there are some.
 */
export function ConversationHeader(props: ConversationHeaderProps) {
  const { isChatListOpen, onToggleChatList, showNewChat, onNewChat, hasDetails, isDetailsOpen, onToggleDetails } = props;
  const isCompact = useIsCompact();
  const chatId = useStateOfSelectedChatId();
  const chatName = useStateOfChats().find((c) => c.id === chatId)?.name;

  const chatListLabel = isChatListOpen
    ? texts.common.hide(texts.common.conversations)
    : texts.common.show(texts.common.conversations);
  const detailsLabel = isDetailsOpen
    ? texts.common.hide(texts.chat.inspector.details)
    : texts.common.show(texts.chat.inspector.details);

  return (
    <Group className={classes.root} gap="xs" wrap="nowrap" data-testid="conversation-header">
      <Tooltip label={chatListLabel}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onToggleChatList}
          aria-label={chatListLabel}
          aria-expanded={isChatListOpen}
          data-testid="toggle-chat-list"
        >
          {isCompact ? (
            <IconMenu2 size={20} />
          ) : isChatListOpen ? (
            <IconLayoutSidebarLeftCollapse size={20} />
          ) : (
            <IconLayoutSidebarLeftExpand size={20} />
          )}
        </ActionIcon>
      </Tooltip>
      {showNewChat && (
        <Tooltip label={`${texts.chat.header.newChat} (Ctrl+Shift+O)`}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={onNewChat}
            aria-label={texts.chat.header.newChat}
            data-testid="header-new-chat"
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
      )}
      <ChatAssistantPicker />
      <Text size="sm" fw={500} className={classes.title} title={chatName}>
        {chatName}
      </Text>
      {hasDetails && (
        <Tooltip label={`${detailsLabel} (Ctrl+.)`}>
          <ActionIcon
            variant={isDetailsOpen ? 'light' : 'subtle'}
            color="gray"
            size="lg"
            onClick={onToggleDetails}
            aria-label={detailsLabel}
            aria-expanded={isDetailsOpen}
            data-testid="toggle-inspector"
          >
            <IconLayoutSidebarRight size={20} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
