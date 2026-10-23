import { ActionIcon, Button, Textarea, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconClipboard, IconPencil } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { Alert } from 'src/components';
import { DisabledAwareTooltip } from 'src/components/DisabledAwareTooltip';
import { useEventCallback } from 'src/hooks';
import { useConversationFiles } from 'src/hooks/api/files';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import { useStateOfIsAiWriting, useStateOfSelectedChatId } from '../../state/chat';
import { ChatItemProps } from './ChatItem';
import classes from './ChatItem.module.css';

export const HumanChatItem = ({ message, editMessage }: ChatItemProps) => {
  // MessageDTO ist generated from the backend models.
  // It may be refactored to become a simple string
  // instead of an array with one entry (in the futute ;) ).
  const textContent = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const chatId = useStateOfSelectedChatId();
  const { data: chatFiles } = useConversationFiles(chatId);
  const [editedText, setEditedText] = useState(textContent);
  const [isEditing, setIsEditing] = useState(false);
  // Like the composer: a new question can only be sent when the answer is complete (or stopped).
  const isAiWriting = useStateOfIsAiWriting();
  const clipboard = useClipboard();

  const copyTextToClipboard = () => {
    clipboard.copy(textContent);
    toast(texts.common.copied, { type: 'info' });
  };

  const handleSave = () => {
    if (isAiWriting) {
      return;
    }
    setIsEditing(false);
    editMessage(editedText, chatFiles, message.id);
  };

  const doKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) handleSave();
  });

  return (
    <div className={classes.humanItem} data-editing={isEditing || undefined} data-testid="chat-item">
      {message.error && <Alert text={message.error} className={classes.error} />}

      {isEditing ? (
        <div className={classes.editor}>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={doKeyDown}
            autosize
            aria-label={texts.accessibility.editMessage}
          />
          <div className={classes.editorActions}>
            <Button onClick={() => setIsEditing(false)} size="xs" variant="subtle">
              {texts.common.cancel}
            </Button>
            <Button onClick={handleSave} size="xs" disabled={isAiWriting}>
              {texts.common.send}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={classes.humanText}>{textContent}</div>
          <div className={clsx(classes.actions, classes.humanActions)}>
            <Tooltip label={texts.common.copy}>
              <ActionIcon
                color="gray"
                c="black"
                size={'lg'}
                variant="subtle"
                onClick={copyTextToClipboard}
                aria-label={texts.common.copy}
              >
                <IconClipboard size={16} />
              </ActionIcon>
            </Tooltip>
            <DisabledAwareTooltip label={texts.common.edit}>
              <ActionIcon
                color="gray"
                c="black"
                size={'lg'}
                variant="subtle"
                onClick={() => setIsEditing(true)}
                disabled={isAiWriting}
                aria-label={texts.common.edit}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </DisabledAwareTooltip>
          </div>
        </>
      )}
    </div>
  );
};
