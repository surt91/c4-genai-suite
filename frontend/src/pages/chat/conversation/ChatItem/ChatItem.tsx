import { memo } from 'react';
import { FileDto, MessageDto } from 'src/api';
import { ChatMessage } from '../../state/types';
import { AIChatItem } from './AIChatItem';
import { HumanChatItem } from './HumanChatItem';

export interface ChatItemProps {
  agentName: string;
  message: ChatMessage;
  isLast: boolean;
  isBeforeLast: boolean;
  rating?: MessageDto['rating'];
  llmLogo?: string;
  editMessage: (input: string, files?: FileDto[], editMessageId?: number) => void;
}

export const ChatItem = memo((props: ChatItemProps) => {
  return props.message.type === 'ai' ? <AIChatItem {...props} /> : <HumanChatItem {...props} />;
});
