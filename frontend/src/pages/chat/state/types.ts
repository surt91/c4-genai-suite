import { MessageDto, SourceDto, StreamUIRequestDto } from 'src/api';

export type ToolCallStatus = 'running' | 'success' | 'error' | 'cancelled';

export type ToolCallState = {
  // The ID of the tool call (or the name for older answers).
  id: string;
  // The display name of the tool.
  name: string;
  status: ToolCallStatus;
  // The error message, when the tool call failed.
  error?: string;
};

type MessageMetaInfoState = {
  toolCalls: ToolCallState[];
  tokenCount?: number;
  debug: string[];
  sources: SourceDto[];
  logging: string[];
  reasoning: string;
  reasoningInProgress: boolean;
  error?: string;
  isAiWriting?: boolean;
  ui?: StreamUIRequestDto;
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;
