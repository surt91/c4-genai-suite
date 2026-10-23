import { clsx } from 'clsx';
import { FileDto } from 'src/api';
import { useStateOfMessages, useStateOfSelectedChatId } from '../state/chat';
import classes from './ChatHistory.module.css';
import { ChatItem } from './ChatItem/ChatItem';

type ChatHistoryProps = {
  agentName: string;
  editMessage: (input: string, files?: FileDto[], editMessageId?: number) => void;
};

export function ChatHistory({ agentName, editMessage }: ChatHistoryProps) {
  const messages = useStateOfMessages();
  const allMessagesButLastTwo = messages.slice(0, -2);
  const lastTwoMessages = messages.slice(-2);
  const chatId = useStateOfSelectedChatId();

  return (
    <>
      <div className={classes.grid}>
        {allMessagesButLastTwo.map((message, i) => (
          <div className={clsx('chat-history-deferred', classes.grid)} data-testid="deferred-chat-item" key={`${i}_${chatId}`}>
            <ChatItem agentName={agentName} isLast={false} isBeforeLast={false} message={message} editMessage={editMessage} />
          </div>
        ))}
      </div>
      <div className={classes.lastMessageExchange}>
        {lastTwoMessages.map((message, i) => (
          <ChatItem
            key={`${i + messages.length - 2}_${chatId}`}
            agentName={agentName}
            isLast={i === 1}
            isBeforeLast={i === 0}
            message={message}
            editMessage={editMessage}
          />
        ))}
      </div>
    </>
  );
}
