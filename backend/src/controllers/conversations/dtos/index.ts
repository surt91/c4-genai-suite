import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import {
  ChatInteractionKind,
  ChatInteractionStatus,
  Conversation,
  CONVERSATION_RATINGS,
  ConversationRating,
  FormActionType,
  Message,
  MESSAGE_RATINGS,
  MESSAGE_TYPES,
  MessageRating,
  MessageType,
  NormalizedMessageContents,
  StreamEvent,
} from '../../../domain/chat/index.js';
import { ExtensionArgumentObjectSpecDto } from '../../extensions/dtos/index.js';
import { FileDto } from '../../files/dtos/index.js';
import { MessageContentDto, MessageContentImageUrlDto, MessageContentTextDto, SourceDto } from '../../shared.js';

const CHAT_INTERACTION_KINDS = ['form', 'url', 'tool_error'];
const CHAT_INTERACTION_STATUSES = [
  'waiting',
  'accepted',
  'declined',
  'cancelled',
  'expired',
  'opened',
  'completed',
  'blocked',
  'error',
];
export class ChatUICallbackResultDto {
  @ApiProperty({
    description: 'The action taken in the form.',
    required: true,
    enum: FormActionType,
  })
  @IsEnum(FormActionType)
  action!: FormActionType;

  @ApiProperty({
    description: 'Additional data related to the action.',
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class RateMessageDto {
  @ApiProperty({
    description: 'The rating.',
    required: true,
    enum: MESSAGE_RATINGS,
  })
  @IsDefined()
  @IsIn(MESSAGE_RATINGS)
  rating!: MessageRating;
}

export class ChatInteractionDto {
  @ApiProperty({ description: 'The ID of the request or tool call.', required: true })
  id!: string;

  @ApiProperty({ description: 'The kind of the interaction.', required: true, enum: CHAT_INTERACTION_KINDS })
  kind!: ChatInteractionKind;

  @ApiProperty({ description: 'The state of the interaction.', required: true, enum: CHAT_INTERACTION_STATUSES })
  status!: ChatInteractionStatus;

  @ApiProperty({ description: 'Who asked, or the name of the tool.', required: false })
  source?: string;

  @ApiProperty({ description: 'The question.', required: false })
  text?: string;

  @ApiProperty({ description: 'The answers of a form (without secrets).', required: false, type: Object })
  data?: Record<string, any>;

  @ApiProperty({ description: 'The URL (without query).', required: false })
  url?: string;

  @ApiProperty({ description: 'The domain of the URL.', required: false })
  domain?: string;

  @ApiProperty({ description: 'The error message of a failed tool.', required: false })
  error?: string;

  @ApiProperty({ description: 'When the interaction started.', required: true, type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'When the interaction was updated.', required: true, type: String, format: 'date-time' })
  updatedAt!: string;
}

@ApiExtraModels(MessageContentTextDto, MessageContentImageUrlDto)
export class MessageDto {
  @ApiProperty({
    description: 'The ID of the message.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The ID of the used configuration.',
    required: true,
  })
  configurationId!: number;

  @ApiProperty({
    description: 'The content.',
    required: true,
    type: 'array',
    items: MessageContentDto,
  })
  content!: NormalizedMessageContents;

  @ApiProperty({
    description: 'The type.',
    required: true,
    enum: MESSAGE_TYPES,
  })
  type!: MessageType;

  @ApiProperty({
    description: 'The rating.',
    required: false,
    enum: MESSAGE_RATINGS,
  })
  rating?: MessageRating;

  @ApiProperty({
    description: 'The executed tools.',
    required: false,
    type: [String],
  })
  tools?: string[];

  @ApiProperty({
    description: 'The debug records.',
    required: false,
    type: [String],
  })
  debug?: string[];

  @ApiProperty({
    description: 'The source records.',
    required: false,
    isArray: true,
    type: SourceDto,
  })
  sources?: SourceDto[];

  @ApiProperty({
    description: 'The logging information.',
    required: false,
    type: [String],
  })
  logging?: string[];

  @ApiProperty({
    description: 'Whether the generation of the answer was stopped before it was complete.',
    required: false,
  })
  stopped?: boolean;

  @ApiProperty({
    description: 'The results of interactions (answered forms, opened URLs, failed tools).',
    required: false,
    isArray: true,
    type: ChatInteractionDto,
  })
  interactions?: ChatInteractionDto[];

  static fromDomain(this: void, source: Message) {
    const result = new MessageDto();
    result.id = source.id;
    result.content = source.content;
    result.debug = source.debug;
    result.sources = source.sources;
    result.rating = source.rating;
    result.tools = source.tools;
    result.type = source.type;
    result.logging = source.logging;
    result.configurationId = source.configurationId;
    result.stopped = source.stopped;
    result.interactions = source.interactions ?? undefined;

    return result;
  }
}

export class MessagesDto {
  @ApiProperty({
    description: 'The mesages.',
    required: true,
    type: [MessageDto],
  })
  items!: MessageDto[];

  static fromDomain(source: Message[]) {
    const result = new MessagesDto();
    result.items = source.map(MessageDto.fromDomain).filter((x) => !!x);

    return result;
  }
}

export type ConversationContextDto = Record<string, string>;

export type ExtensionUserArgumentsDto = Record<string, Record<string, string>>;

export class CreateConversationDto {
  @ApiProperty({
    description: 'The name of the conversation.',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The ID of the configuration.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  configurationId?: number;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The user argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;
}

export class SendMessageDto {
  @ApiProperty({
    required: true,
  })
  @IsString()
  query!: string;

  @ApiProperty({
    description: 'The files.',
    required: false,
    isArray: true,
    type: FileDto,
  })
  files?: FileDto[];
}

export class UpdateConversationDto {
  @ApiProperty({
    description: 'The ID of the configuration.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  configurationId?: number;

  @ApiProperty({
    description: 'The name of the conversation.',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Indicates whether the name of the conversation has been set manually by the user.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isNameSetManually?: boolean;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;

  @ApiProperty({
    description: 'The optional rating for the whole conversation.',
    required: false,
    enum: CONVERSATION_RATINGS,
  })
  @IsOptional()
  @IsIn(CONVERSATION_RATINGS)
  rating?: ConversationRating;
}

export class ConversationDto {
  @ApiProperty({
    description: 'The ID of the conversation.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name, which is usually a summary of the conversation.',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'The ID of the configuration.',
    required: true,
  })
  configurationId!: number;

  @ApiProperty({
    description: 'The optional rating for the whole conversation.',
    required: false,
    enum: CONVERSATION_RATINGS,
  })
  rating?: ConversationRating;

  @ApiProperty({
    description: 'The time of the last update.',
    required: true,
    type: String,
    format: 'date',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'The creation time.',
    required: true,
    type: String,
    format: 'date',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;

  static fromDomain(this: void, source: Conversation) {
    const result = new ConversationDto();
    result.id = source.id;
    result.updatedAt = source.updatedAt;
    result.createdAt = source.createdAt;
    result.configurationId = source.configurationId;
    result.name = source.name;
    result.rating = source.rating;
    result.context = source.context;
    result.extensionUserArguments = source.extensionUserArguments;

    return result;
  }
}

export class ConversationsDto {
  @ApiProperty({
    description: 'The conversations.',
    required: true,
    type: [ConversationDto],
  })
  items!: ConversationDto[];

  static fromDomain(source: Conversation[]) {
    const result = new ConversationsDto();
    result.items = source.map(ConversationDto.fromDomain);

    return result;
  }
}

export class StreamToolInfoDto {
  @ApiProperty({
    description: 'The name of the tool.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The ID of the tool call.',
    required: false,
  })
  id?: string;
}

export class StreamUIRequestDto {
  @ApiProperty({
    description: 'The ID to confirm the request.',
    required: true,
  })
  id!: string;

  @ApiProperty({
    description: 'The text for the confirm dialog.',
    required: true,
  })
  text!: string;

  @ApiProperty({
    description: 'The kind of the request: a form (also a confirmation) or an URL to open.',
    required: true,
    enum: ['form', 'url'],
  })
  kind!: 'form' | 'url';

  @ApiProperty({
    description: 'The schema of the form.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  schema?: ExtensionArgumentObjectSpecDto;

  @ApiProperty({
    description: 'Who asks, e.g. the name of the MCP server.',
    required: false,
  })
  source?: string;

  @ApiProperty({
    description: 'When the request is cancelled if nobody answers.',
    required: true,
    type: String,
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'The URL to open (only for URL requests).',
    required: false,
  })
  url?: string;

  @ApiProperty({
    description: 'The host name of the URL (only for URL requests).',
    required: false,
  })
  domain?: string;

  @ApiProperty({
    description: 'Whether the domain is in the allowlist of the extension (false if there is no allowlist).',
    required: false,
  })
  domainAllowed?: boolean;
}

export class StreamUIUpdateDto {
  @ApiProperty({ description: 'The ID of the request.', required: true })
  id!: string;

  @ApiProperty({ description: 'The new state of the request.', required: true, enum: CHAT_INTERACTION_STATUSES })
  status!: ChatInteractionStatus;

  @ApiProperty({ description: 'The answers of a form (without secrets).', required: false, type: Object })
  data?: Record<string, any>;
}

export class StreamMetadataDto {
  @ApiProperty({
    description: 'The total token count.',
    required: true,
  })
  tokenCount!: number;
}

export class StreamTokenEventDto {
  static TYPE_NAME = 'chunk';

  @ApiProperty({
    description: 'The content.',
    required: true,
    type: 'array',
    items: MessageContentDto,
  })
  content!: NormalizedMessageContents;

  @ApiProperty({
    enum: [StreamTokenEventDto.TYPE_NAME],
  })
  type!: typeof StreamTokenEventDto.TYPE_NAME;
}

export class StreamErrorEventDto {
  static TYPE_NAME = 'error';

  @ApiProperty({
    description: 'The error message.',
    required: true,
  })
  message!: string;

  @ApiProperty({
    enum: [StreamErrorEventDto.TYPE_NAME],
  })
  type!: typeof StreamErrorEventDto.TYPE_NAME;
}

export class StreamToolStartEventDto {
  static TYPE_NAME = 'tool_start';

  @ApiProperty({
    description: 'The tool info.',
    required: true,
    type: StreamToolInfoDto,
  })
  tool!: StreamToolInfoDto;

  @ApiProperty({
    enum: [StreamToolStartEventDto.TYPE_NAME],
  })
  type!: typeof StreamToolStartEventDto.TYPE_NAME;
}

export class StreamToolEndEventDto {
  static TYPE_NAME = 'tool_end';

  @ApiProperty({
    description: 'The tool info.',
    required: true,
    type: StreamToolInfoDto,
  })
  tool!: StreamToolInfoDto;

  @ApiProperty({
    enum: [StreamToolEndEventDto.TYPE_NAME],
  })
  type!: typeof StreamToolEndEventDto.TYPE_NAME;
}

export class StreamToolErrorEventDto {
  static TYPE_NAME = 'tool_error';

  @ApiProperty({
    description: 'The tool info.',
    required: true,
    type: StreamToolInfoDto,
  })
  tool!: StreamToolInfoDto;

  @ApiProperty({
    description: 'The error message.',
    required: true,
  })
  error!: string;

  @ApiProperty({
    enum: [StreamToolErrorEventDto.TYPE_NAME],
  })
  type!: typeof StreamToolErrorEventDto.TYPE_NAME;
}

export class StreamMessageSavedDto {
  static TYPE_NAME = 'saved';

  @ApiProperty({
    description: 'The message ID.',
    required: true,
  })
  messageId!: number;

  @ApiProperty({
    description: 'The type.',
    required: true,
    enum: MESSAGE_TYPES,
  })
  messageType!: MessageType;

  @ApiProperty({
    enum: [StreamMessageSavedDto.TYPE_NAME],
  })
  type!: typeof StreamMessageSavedDto.TYPE_NAME;
}

export class StreamReasoningDto {
  static TYPE_NAME = 'reasoning';

  @ApiProperty({
    description: 'The content .',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamReasoningDto.TYPE_NAME],
  })
  type!: typeof StreamReasoningDto.TYPE_NAME;
}

export class StreamReasoningEndDto {
  static TYPE_NAME = 'reasoning_end';

  @ApiProperty({
    enum: [StreamReasoningEndDto.TYPE_NAME],
  })
  type!: typeof StreamReasoningEndDto.TYPE_NAME;
}

export class StreamSummaryDto {
  static TYPE_NAME = 'summary';

  @ApiProperty({
    description: 'The summary .',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamSummaryDto.TYPE_NAME],
  })
  type!: typeof StreamSummaryDto.TYPE_NAME;
}

export class StreamDebugEvent {
  static TYPE_NAME = 'debug';

  @ApiProperty({
    description: 'The debug information.',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamDebugEvent.TYPE_NAME],
  })
  type!: typeof StreamDebugEvent.TYPE_NAME;
}

export class StreamSourcesEvent {
  static TYPE_NAME = 'sources';

  @ApiProperty({
    description: 'The sources information.',
    required: true,
    isArray: true,
    type: SourceDto,
  })
  content!: SourceDto[];

  @ApiProperty({
    enum: [StreamSourcesEvent.TYPE_NAME],
  })
  type!: typeof StreamSourcesEvent.TYPE_NAME;
}

export class StreamLoggingEvent {
  static TYPE_NAME = 'logging';

  @ApiProperty({
    description: 'The logging information.',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamLoggingEvent.TYPE_NAME],
  })
  type!: typeof StreamLoggingEvent.TYPE_NAME;
}

export class StreamUIEventDto {
  static TYPE_NAME = 'ui';

  @ApiProperty({
    description: 'The request.',
    required: true,
    type: StreamUIRequestDto,
  })
  request!: StreamUIRequestDto;

  @ApiProperty({
    enum: [StreamUIEventDto.TYPE_NAME],
  })
  type!: typeof StreamUIEventDto.TYPE_NAME;
}

export class StreamUIUpdateEventDto {
  static TYPE_NAME = 'ui_update';

  @ApiProperty({
    description: 'The update of a request.',
    required: true,
    type: StreamUIUpdateDto,
  })
  update!: StreamUIUpdateDto;

  @ApiProperty({
    enum: [StreamUIUpdateEventDto.TYPE_NAME],
  })
  type!: typeof StreamUIUpdateEventDto.TYPE_NAME;
}

export class StreamCompletedEventDto {
  static TYPE_NAME = 'completed';

  @ApiProperty({
    description: 'The metadata about the request.',
    required: true,
    type: StreamMetadataDto,
  })
  metadata!: StreamMetadataDto;

  @ApiProperty({
    enum: [StreamCompletedEventDto.TYPE_NAME],
  })
  type!: typeof StreamCompletedEventDto.TYPE_NAME;
}

@ApiExtraModels(
  StreamCompletedEventDto,
  StreamDebugEvent,
  StreamSourcesEvent,
  StreamLoggingEvent,
  StreamErrorEventDto,
  StreamMessageSavedDto,
  StreamTokenEventDto,
  StreamToolEndEventDto,
  StreamToolStartEventDto,
  StreamToolErrorEventDto,
  StreamUIEventDto,
  StreamUIUpdateEventDto,
  StreamSummaryDto,
  StreamReasoningDto,
  StreamReasoningEndDto,
)
export class StreamEventHolderDto {
  @ApiProperty({
    title: 'StreamEventDto',
    oneOf: [
      { $ref: getSchemaPath(StreamCompletedEventDto) },
      { $ref: getSchemaPath(StreamDebugEvent) },
      { $ref: getSchemaPath(StreamSourcesEvent) },
      { $ref: getSchemaPath(StreamLoggingEvent) },
      { $ref: getSchemaPath(StreamErrorEventDto) },
      { $ref: getSchemaPath(StreamMessageSavedDto) },
      { $ref: getSchemaPath(StreamSummaryDto) },
      { $ref: getSchemaPath(StreamTokenEventDto) },
      { $ref: getSchemaPath(StreamToolEndEventDto) },
      { $ref: getSchemaPath(StreamToolStartEventDto) },
      { $ref: getSchemaPath(StreamToolErrorEventDto) },
      { $ref: getSchemaPath(StreamUIEventDto) },
      { $ref: getSchemaPath(StreamUIUpdateEventDto) },
      { $ref: getSchemaPath(StreamReasoningDto) },
      { $ref: getSchemaPath(StreamReasoningEndDto) },
    ],
    discriminator: {
      propertyName: 'type',
      mapping: {
        [StreamCompletedEventDto.TYPE_NAME]: getSchemaPath(StreamCompletedEventDto),
        [StreamDebugEvent.TYPE_NAME]: getSchemaPath(StreamDebugEvent),
        [StreamSourcesEvent.TYPE_NAME]: getSchemaPath(StreamSourcesEvent),
        [StreamLoggingEvent.TYPE_NAME]: getSchemaPath(StreamLoggingEvent),
        [StreamErrorEventDto.TYPE_NAME]: getSchemaPath(StreamErrorEventDto),
        [StreamMessageSavedDto.TYPE_NAME]: getSchemaPath(StreamMessageSavedDto),
        [StreamSummaryDto.TYPE_NAME]: getSchemaPath(StreamSummaryDto),
        [StreamTokenEventDto.TYPE_NAME]: getSchemaPath(StreamTokenEventDto),
        [StreamToolEndEventDto.TYPE_NAME]: getSchemaPath(StreamToolEndEventDto),
        [StreamToolStartEventDto.TYPE_NAME]: getSchemaPath(StreamToolStartEventDto),
        [StreamToolErrorEventDto.TYPE_NAME]: getSchemaPath(StreamToolErrorEventDto),
        [StreamUIEventDto.TYPE_NAME]: getSchemaPath(StreamUIEventDto),
        [StreamUIUpdateEventDto.TYPE_NAME]: getSchemaPath(StreamUIUpdateEventDto),
        [StreamReasoningDto.TYPE_NAME]: getSchemaPath(StreamReasoningDto),
        [StreamReasoningEndDto.TYPE_NAME]: getSchemaPath(StreamReasoningEndDto),
      },
    },
  })
  public event!: StreamEvent;
}
