import { Box, Text } from '@mantine/core';
import { useClipboard, useDebouncedValue } from '@mantine/hooks';
import { IconPlayerStopFilled } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { Alert, Markdown } from 'src/components';
import { useProfile } from 'src/hooks';
import { toast } from 'src/lib/notifications';
import { useStateOfAllAssistants, useStateOfEnabledAssistants } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import { useStateOfIsAiWriting } from '../../state/chat';
import { ChatItemDebug } from '../ChatItemDebug';
import { ChatItemLogging } from '../ChatItemLogging';
import ChatItemSources from '../ChatItemSources';
import { ChatItemTools } from '../ChatItemTools';
import { ReasoningLoadingIndicator } from '../ReasoningLoadingIndicator';
import { AIChatItemActions } from './AIChatItemActions';
import { AiAvatar } from './AiAvatar';
import { ChatItemProps } from './ChatItem';
import classes from './ChatItem.module.css';
import { ChatItemUserInput } from './ChatItemUserInput';

export const AIChatItem = ({ agentName, message, isLast, selectDocument }: ChatItemProps) => {
  // MessageDTO ist generated from the backend models.
  // It may be refactored to become a simple string
  // instead of an array with one entry (in the futute ;) ).
  const textContent = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const user = useProfile();
  const isWriting = useStateOfIsAiWriting();
  const clipboard = useClipboard();
  const assistants = useStateOfAllAssistants();
  const assistantsWithExtensions = useStateOfEnabledAssistants();

  const copyTextToClipboard = () => {
    clipboard.copy(textContent);
    toast(texts.common.copied, { type: 'info' });
  };

  const messageAssistant = assistants.find((x) => x.id === message.configurationId);
  const messageAssistantWithExtensions = assistantsWithExtensions.find((x) => x.id === message.configurationId);
  const assistantLLmLogo = messageAssistantWithExtensions?.extensions?.find((x) => x.type === 'llm')?.logo;

  const [debouncedIsWriting] = useDebouncedValue(isWriting, 500);
  const newReply = isWriting || debouncedIsWriting;
  const assistantStatus = !messageAssistant
    ? texts.chat.assistantDeleted
    : !messageAssistant.enabled
      ? texts.chat.assistantDisabled
      : '';

  return (
    <div className={classes.aiItem} data-testid="chat-item">
      <div className={classes.aiHeader}>
        <AiAvatar llmLogo={assistantLLmLogo} />
        <strong>{agentName}</strong>
        {messageAssistant && (
          <>
            |<strong>{messageAssistant.name}</strong>
          </>
        )}
        {assistantStatus && <small className={classes.assistantStatus}>[{assistantStatus}]</small>}
      </div>
      {message.error && <Alert text={message.error} className={classes.error} />}
      <ChatItemTools tools={message.toolsInUse || {}} />
      {message.ui && <ChatItemUserInput key={message.ui.id} request={message.ui} />}
      {message.reasoning?.length && (
        <ReasoningLoadingIndicator message={message.reasoning} inProgress={message.reasoningInProgress} />
      )}
      <Markdown animateText={isLast && newReply} className={classes.markdown}>
        {textContent}
      </Markdown>
      {message.sources && message.sources?.length > 0 ? (
        <ChatItemSources
          sources={message.sources || []}
          selectDocument={(documentUri) => selectDocument(message.id, documentUri)}
        />
      ) : (
        <ChatItemDebug debug={message.debug || []} />
      )}
      {message.stopped && (
        <Text size="xs" c="dimmed" className={classes.stopped} data-testid="chat-item-stopped">
          <IconPlayerStopFilled size={12} aria-hidden />
          {texts.chat.generationStopped}
        </Text>
      )}
      {isLast && isWriting && <Box className={clsx('animate-loading-dot', classes.loadingDot)} bg="primary" />}
      {!isWriting && <ChatItemLogging logging={message.logging || []} />}
      {!(isWriting && isLast) && (
        <AIChatItemActions
          messageId={message.id}
          copyTextToClipboard={copyTextToClipboard}
          rating={message.rating}
          renderAlways={isLast && !newReply}
          tokenCount={message.tokenCount}
          user={user}
        />
      )}
    </div>
  );
};
