import { ChatInteractionDtoStatusEnum, MessageDto, SourceDto, StreamUIRequestDto } from 'src/api';

type ToolCallStatus = 'running' | 'success' | 'error' | 'cancelled';

export type ToolCallState = {
  // The ID of the tool call (or the name for older answers).
  id: string;
  // The display name of the tool.
  name: string;
  status: ToolCallStatus;
  // The error message, when the tool call failed.
  error?: string;
};

export type InteractionStatus = ChatInteractionDtoStatusEnum;

/** A request of the AI (form, confirmation or URL to open) shown in the answer while it is generated. */
export type UIRequestState = {
  request: StreamUIRequestDto;
  status: InteractionStatus;
  // The answers of a form.
  data?: Record<string, unknown>;
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
  // The requests of the AI during the generation (the stored results are in `interactions`).
  requests: UIRequestState[];
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;
