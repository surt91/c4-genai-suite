import { CallSettings, InferSchema, LanguageModel, Schema } from 'ai';
import { Subject } from 'rxjs';
import * as z from 'zod';
import { ConfigurationModel, ExtensionArgument } from '../extensions';
import { UploadedFile } from '../files';
import { User } from '../users';

// Chat errors are exposed to the user.
export class ChatError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'ChatError';
  }
}

export type ConversationContext = Record<string, string>;

export type ExtensionUserArgumentValues = Record<string, any>;

export type ExtensionUserArguments = Record<string, ExtensionUserArgumentValues>;

export interface Conversation {
  readonly id: number;

  readonly name?: string;

  readonly isNameSetManually?: boolean;

  readonly rating?: ConversationRating;

  readonly updatedAt: Date;
  readonly createdAt: Date;

  // The chosen llm.
  readonly llm?: string;

  readonly configurationId: number;

  readonly context?: ConversationContext;

  readonly extensionUserArguments?: ExtensionUserArguments;
}

export interface ChatCache {
  // Gets a cache item.
  get<T>(key: string, args: any, resolver: () => Promise<T> | T, ttl?: number): Promise<T>;

  clean(): void;
}

export enum FormActionType {
  ACCEPT = 'accept',
  REJECT = 'reject',
  CANCEL = 'cancel',
}

export interface ChatUICallbackResult {
  action: FormActionType;
  data?: Record<string, any>;
  // Set internally when the request has been cancelled because nobody answered in time.
  expired?: boolean;
}

/** Who asks, e.g. the name of the MCP server. */
export interface ChatUIRequestOptions {
  source?: string;
}

export interface ChatUIOpenUrlRequest extends ChatUIRequestOptions {
  // The message of the server, why the page should be opened.
  text: string;
  url: string;
  // The ID of the elicitation of the server, to map its completion notification.
  elicitationId?: string;
  // The allowed domains (incl. subdomains). Without, every domain is allowed (and the user is warned).
  allowedDomains?: string[];
}

/** The final state of an URL request after the user has opened the page. */
export type ChatUIUrlCompletion = 'completed' | 'cancelled' | 'expired' | 'opened';

export interface ChatUIOpenUrlResult {
  // accept: the user has opened the page, reject: declined, cancel: dismissed, expired or not allowed
  action: FormActionType;
  // Resolves when the interaction outside is complete (notification of the server, the user, or timeout).
  completion: Promise<ChatUIUrlCompletion>;
}

export interface ChatUI {
  form(text: string, schema: ExtensionArgument, options?: ChatUIRequestOptions): Promise<ChatUICallbackResult>;

  // Asks the user to open an URL (e.g. to log in at a third party service). Only opened after the explicit consent.
  openUrl(request: ChatUIOpenUrlRequest): Promise<ChatUIOpenUrlResult>;

  // Marks an opened URL request as complete (e.g. when the server sends `notifications/elicitation/complete`).
  completeUrl(elicitationId: string): void;
}

export type ChatInteractionKind = 'form' | 'url' | 'tool_error';

export type ChatInteractionStatus =
  'waiting' | 'accepted' | 'declined' | 'cancelled' | 'expired' | 'opened' | 'completed' | 'blocked' | 'error';

/**
 * The result of an interaction in the conversation (an answered form, an opened URL, a failed tool). It is stored with
 * the answer, so that it is still visible after a reload.
 */
export interface ChatInteraction {
  // The ID of the request (or of the tool call).
  id: string;
  kind: ChatInteractionKind;
  status: ChatInteractionStatus;
  // Who asked (e.g. the MCP server) or the name of the tool.
  source?: string;
  // The question.
  text?: string;
  // The answers of a form (without secrets).
  data?: Record<string, any>;
  // The URL (without query) and its domain.
  url?: string;
  domain?: string;
  // The error message of a failed tool.
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export abstract class BaseMessage {
  role!: 'assistant' | 'user';
  content: string;
  constructor(content: string) {
    this.content = content;
  }
  getType(): 'ai' | 'human' {
    if (this.isHuman()) {
      return 'human';
    }
    return 'ai';
  }
  getRole(): 'assistant' | 'user' {
    return this.role;
  }
  isHuman(): this is HumanMessage {
    return this.role === 'user';
  }
  isAI(): this is AIMessage {
    return this.role === 'assistant';
  }
}

export interface AIMessageOptions {
  // Whether the generation was stopped (e.g. by the user) before it was complete.
  stopped?: boolean;
}

export class AIMessage extends BaseMessage {
  readonly role = 'assistant' as const;
  readonly stopped: boolean;
  constructor(content: string, options?: AIMessageOptions) {
    super(content);
    this.stopped = options?.stopped ?? false;
  }
}

export class HumanMessage extends BaseMessage {
  readonly role = 'user' as const;
  constructor(content: string) {
    super(content);
  }
}

export abstract class MessagesHistory {
  /** Returns a list of messages stored in the store. */
  public abstract getMessages(): Promise<BaseMessage[]>;
  /** Add a message object to the store. */
  public abstract addMessage(message: BaseMessage): Promise<void>;
  /** Add source annotations. */
  public abstract addSources(externalExtensionId: string, sources: Source[]): void;
  /** Adds or updates the result of an interaction (stored with the answer, also when the answer is already stored). */
  public abstract setInteraction(interaction: ChatInteraction): void;

  public addUserMessage(message: string): Promise<void> {
    return this.addMessage(new HumanMessage(message));
  }
  public addAIMessage(message: string, options?: AIMessageOptions): Promise<void> {
    return this.addMessage(new AIMessage(message, options));
  }
  public async addMessages(messages: BaseMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
    }
  }
}

export interface LanguageModelContext {
  model: LanguageModel;
  options: Partial<CallSettings>;
  // metadata (e.g. for usage counting)
  modelName: string;
  providerName: string;
  // when true, uses generateText instead of streamText
  disableStreaming?: boolean;
  // when true, reasoning events are not emitted to the frontend
  suppressReasoning?: boolean;
}

// a zod object or a plain JSON schema (`jsonSchema()` of `ai`, e.g. for MCP tools)
export type ToolSchema = z.ZodObject<z.ZodRawShape> | Schema<Record<string, any>>;

export abstract class NamedStructuredTool<
  T extends z.ZodRawShape = z.ZodRawShape,
  TSchema extends ToolSchema = z.ZodObject<T> | Schema<Record<string, any>>,
  TToolOutput = string | Record<string, any> | undefined | void,
> {
  abstract displayName: string;
  abstract schema: TSchema;

  abstract name: string;
  abstract description: string;

  protected abstract _call(arg: InferSchema<TSchema>): Promise<TToolOutput>;

  execute(input: InferSchema<TSchema>): Promise<TToolOutput> {
    return this._call(input);
  }
}

export type NamedDynamicStructuredToolInput<TSchema extends ToolSchema, TToolOutput> = {
  name: string;
  description: string;
  displayName: string;
  schema: TSchema;
  func: (arg: InferSchema<TSchema>) => Promise<TToolOutput>;
  returnDirect?: boolean;
};

export class NamedDynamicStructuredTool<
  T extends z.ZodRawShape = z.ZodRawShape,
  TSchema extends ToolSchema = z.ZodObject<T>,
  TToolOutput = string | Record<string, any> | undefined | void,
> extends NamedStructuredTool<T, TSchema, TToolOutput> {
  displayName: string;
  name: string;
  schema: TSchema;
  description: string;
  func: (arg: InferSchema<TSchema>) => Promise<TToolOutput>;
  returnDirect: boolean;

  constructor({ displayName, func, schema, ...toolInput }: NamedDynamicStructuredToolInput<TSchema, TToolOutput>) {
    super();
    this.displayName = displayName;
    this.func = func;
    this.schema = schema;
    this.name = toolInput.name;
    this.description = toolInput.description;
    this.returnDirect = toolInput.returnDirect ?? false;
  }

  protected async _call(arg: InferSchema<TSchema>): Promise<TToolOutput> {
    return this.func(arg);
  }
}

export interface ChatContext {
  // The abort controller.
  readonly abort: AbortController;

  // Tools this agent has access to.
  readonly tools: NamedStructuredTool[];

  // The input.
  readonly input: string;

  // The message to update.
  readonly editMessageId?: number;

  // The input files
  readonly files?: Pick<UploadedFile, 'id' | 'fileName'>[];

  // The result message.
  readonly result: Subject<StreamEvent>;

  // The cache for expensive values.
  readonly cache: ChatCache;

  // The system messages.
  systemMessages: string[];

  // Whether to replace the default system prompt (set by custom prompt extension).
  replaceDefaultPrompt?: boolean;

  // The deployment.
  readonly configuration: ConfigurationModel;

  // The ID of the conversion.
  readonly conversationId: number;

  // The context values.
  readonly context: ConversationContext;

  // Configures the summary generation.
  summaryConfig?: { prompt: string; historyLength?: number };

  // Controls the chat user interface.
  ui: ChatUI;

  // The current user.
  user: User;

  // LLM to use as the agent.
  llms: Record<string, LanguageModelContext>;

  // The chosen LLM.
  llm?: string;

  // The optional token usage.
  tokenUsage?: TokenUsage;

  // The history of previous messages
  history?: MessagesHistory;

  // whether open telemetry is enabled
  telemetry?: boolean;
}

export interface TokenUsage {
  // The consumed token.
  tokenCount: number;

  // The name of the llm.
  llm: string;

  // The name of the model.
  model: string;
}

export interface Message {
  // The ID to make updates.
  id: number;

  // The actual content.
  content: NormalizedMessageContents;

  // The type of the message.
  type: MessageType;

  // The debug records.
  debug?: string[];

  // The sources.
  sources?: Source[];

  // The running tools.
  tools?: string[];

  // The optional rating.
  rating?: MessageRating;

  logging?: string[];

  // Whether the generation of this (AI) message was stopped before it was complete.
  stopped?: boolean;

  // The results of interactions (forms, URLs, failed tools).
  interactions?: ChatInteraction[];

  configurationId: number;
}

export type NormalizedMessageContentText = {
  type: 'text';
  text: string;
};

export type NormalizedMessageContentImageUrl = {
  type: 'image_url';
  image: { url: string };
};

export type NormalizedMessageContent = NormalizedMessageContentImageUrl | NormalizedMessageContentText;
export type NormalizedMessageContents = NormalizedMessageContent[];

export const CONVERSATION_RATINGS = ['good', 'bad', 'unrated'] as const;

export type ConversationRating = (typeof CONVERSATION_RATINGS)[number];

export const MESSAGE_RATINGS = [
  'lazy',
  'insufficient_style',
  'incorrect',
  'instructions_not_followed',
  'refused',
  'other',
] as const;

export type MessageRating = (typeof MESSAGE_RATINGS)[number];

export const MESSAGE_TYPES = ['ai', 'human'] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export type StreamEvent =
  | StreamSummaryEvent
  | StreamCompletedEvent
  | StreamReasoningEvent
  | StreamReasoningEndEvent
  | StreamDebugEvent
  | StreamSourcesEvent
  | StreamLoggingEvent
  | StreamErrorEvent
  | StreamMessageSavedEvent
  | StreamTokenEvent
  | StreamToolEndEvent
  | StreamToolStartEvent
  | StreamToolErrorEvent
  | StreamUIEvent
  | StreamUIUpdateEvent;

export interface StreamTokenEvent {
  type: 'chunk';
  content: NormalizedMessageContents;
}

export interface StreamErrorEvent {
  type: 'error';
  message: string;
}

export interface StreamToolStartEvent {
  type: 'tool_start';
  tool: ToolInfo;
}

export interface StreamToolEndEvent {
  type: 'tool_end';
  tool: ToolInfo;
}

export interface StreamToolErrorEvent {
  type: 'tool_error';
  tool: ToolInfo;
  // The error message.
  error: string;
}

export interface StreamMessageSavedEvent {
  type: 'saved';
  messageId: number;
  messageType: MessageType;
}

export interface StreamDebugEvent {
  type: 'debug';
  content: string;
}

export interface StreamSourcesEvent {
  type: 'sources';
  content: Source[];
}

export interface StreamLoggingEvent {
  type: 'logging';
  content: string;
}

export interface StreamUIEvent {
  type: 'ui';
  request: ChatUIRequest;
}

export interface StreamUIUpdateEvent {
  type: 'ui_update';
  update: ChatUIUpdate;
}

export interface ChatUIUpdate {
  // The ID of the request.
  id: string;
  status: ChatInteractionStatus;
  // The answers of a form (without secrets).
  data?: Record<string, any>;
}

export interface StreamSummaryEvent {
  type: 'summary';
  content: string;
}

export interface StreamReasoningEvent {
  type: 'reasoning';
  content: string;
}

export interface StreamReasoningEndEvent {
  type: 'reasoning_end';
}

export interface StreamCompletedEvent {
  type: 'completed';
  metadata: ChatMetadata;
}

export interface ChatUIRequest {
  // The request ID to handle responses.
  id: string;

  // The kind of the request: a form (also a confirmation) or an URL to open.
  kind: 'form' | 'url';

  // The text in markdown info.
  text: string;

  // The schema of the form
  schema?: ExtensionArgument;

  // Who asks, e.g. the name of the MCP server.
  source?: string;

  // When the request is cancelled if nobody answers (ISO date).
  expiresAt: string;

  // The URL to open (kind url).
  url?: string;

  // The host name of the URL (kind url).
  domain?: string;

  // Whether the domain is in the allowlist of the extension (false: there is no allowlist).
  domainAllowed?: boolean;
}

export interface ChatMetadata {
  // The total token count.
  tokenCount: number;
}

export interface ToolInfo {
  // The display name of the tool.
  name: string;

  // The ID of the tool call.
  id?: string;
}

export type ChatNextDelegate = (context: ChatContext) => Promise<any>;

export type GetContext = () => ChatContext;

export interface ChatMiddleware {
  order?: number;

  invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any>;
}

export const CHAT_MIDDLEWARES_TOKEN = 'CHAT_MIDDLEWARES';

export type Chunk = {
  uri?: string | null;
  content: string;
  pages?: number[] | null;
  score: number;
};

export type Document = {
  uri: string;
  name?: string | null;
  mimeType: string;
  size?: number | null;
  link?: string | null;
  downloadAvailable?: boolean;
};

export type Source = {
  title: string; // title of the source document
  chunk: Chunk;
  document?: Document | null;
  metadata?: Record<string, any> | null;
};

export type Sources = Source[];
