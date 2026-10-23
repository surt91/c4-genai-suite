import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { onErrorResumeNextWith } from 'rxjs';
import { In } from 'typeorm';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file.js';
import {
  ConversationEntity,
  ConversationRepository,
  ExtensionSource,
  MessageEntity,
  MessageRepository,
} from '../../database/index.js';
import {
  AIMessage,
  BaseMessage,
  ChatContext,
  ChatInteraction,
  ChatMiddleware,
  ChatNextDelegate,
  GetContext,
  HumanMessage,
  MessagesHistory,
  Source,
} from '../interfaces.js';

@Injectable()
export class GetHistoryMiddleware implements ChatMiddleware {
  public static ORDER = -100;

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
    @InjectRepository(ConversationFileEntity)
    private readonly conversationFiles: ConversationFileRepository,
  ) {}

  order?: number = GetHistoryMiddleware.ORDER;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const { conversationId, configuration } = context;

    const history = new InternalChatHistory(
      conversationId,
      configuration.id,
      context,
      this.messages,
      this.conversations,
      this.conversationFiles,
    );

    await history.addMessage(new HumanMessage(context.input), true, context.editMessageId);

    context.history = history;
    try {
      await next(context);
    } finally {
      // When the generation was stopped before an answer could be stored, store an empty (stopped) answer, so that
      // the conversation shows that the question was not answered completely.
      if (context.abort.signal.aborted && !history.hasAIMessage) {
        await history.addAIMessage('', { stopped: true });
      }
    }
  }
}

class InternalChatHistory extends MessagesHistory {
  private readonly logger = new Logger(InternalChatHistory.name);
  private readonly tools: string[] = [];
  private readonly debug: string[] = [];
  private sources: ExtensionSource[] = [];
  private stored?: BaseMessage[];
  private currentParentId?: number;
  private readonly interactions = new Map<string, ChatInteraction>();
  // The ID of the stored AI message, interactions that finish later are added to it.
  private aiMessageId?: number;

  // Whether an AI message has been stored by this pipeline run.
  public hasAIMessage = false;

  constructor(
    private readonly conversationId: number,
    private readonly configurationId: number,
    private readonly context: ChatContext,
    private readonly messages: MessageRepository,
    private readonly conversations: ConversationRepository,
    private readonly conversationFiles: ConversationFileRepository,
  ) {
    super();

    // Just ignore the error. Otherwise it is treated as unhandled.
    context.result.pipe(onErrorResumeNextWith()).subscribe((event) => {
      if (event.type === 'tool_start') {
        this.tools.push(event.tool.name);
      } else if (event.type === 'debug') {
        this.debug.push(event.content);
      } else if (event.type === 'tool_error') {
        const now = new Date().toISOString();
        this.setInteraction({
          id: event.tool.id ?? event.tool.name,
          kind: 'tool_error',
          status: 'error',
          source: event.tool.name,
          error: event.error,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  addSources(extensionExternalId: string, sources: Source[]): void {
    this.sources.push(
      ...sources.map((source) => ({
        ...source,
        extensionExternalId,
      })),
    );
  }

  setInteraction(interaction: ChatInteraction): void {
    this.interactions.set(interaction.id, interaction);

    if (this.aiMessageId) {
      // The answer is stored already (e.g. an opened URL is completed afterwards).
      const id = this.aiMessageId;
      this.messages
        .update({ id }, { interactions: [...this.interactions.values()] })
        .catch((err) => this.logger.error('Failed to store the interaction.', err));
    }
  }

  getMessages(): Promise<BaseMessage[]> {
    if (this.conversationId <= 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve(this.stored ?? []);
  }

  private publishSourcesReferences() {
    if (this.sources.length > 0) {
      this.context.result.next({
        type: 'sources',
        content: this.sources.map((source) => ({
          ...source,
          chunk: {
            ...source.chunk,
            content: '',
          },
        })),
      });
    }
  }

  private async attachNewFilesToConversation(conversationId: number, messageId: number, files: ChatContext['files']) {
    if (!files?.length) {
      return;
    }

    const fileIds = files.map((file) => file.id);
    const existingFiles = await this.conversationFiles.find({
      where: {
        conversationId,
        fileId: In(fileIds),
      },
    });

    const existingFileIds = new Set(existingFiles.map((file) => file.fileId));
    const filesToSave = files
      .filter((file) => !existingFileIds.has(file.id))
      .map((file) => ({
        conversationId,
        messageId,
        fileId: file.id,
      }));

    const filesToUpdate = existingFiles
      .filter((file) => file.messageId == null)
      .map((file) => ({
        ...file,
        messageId,
      }));

    if (filesToUpdate.length > 0) {
      await this.conversationFiles.save(filesToUpdate);
    }

    if (filesToSave.length > 0) {
      await this.conversationFiles.save(filesToSave);
    }
  }

  async addMessage(message: BaseMessage, persistHuman?: boolean, editMessageId?: number): Promise<void> {
    const data = {
      type: message.getType(),
      data: {
        content: message.content,
      },
      conversation: {
        id: this.conversationId,
      },
      // The tools is used for the UI only to display the used tools for old conversations.
      tools: message.isAI() ? this.tools : [],
      // The debug information are only relevant for AI messages.
      debug: message.isAI() ? this.debug : [],
      // The sources information are only relevant for AI messages.
      sources: message.isAI() ? this.sources : [],
      stopped: message.isAI() ? message.stopped : false,
      // The results of forms, URLs and failed tools are only relevant for AI messages.
      interactions: message.isAI() && this.interactions.size > 0 ? [...this.interactions.values()] : null,
    };

    try {
      if (message.isAI()) {
        this.publishSourcesReferences();
        const entity = await this.messages.save({
          ...data,
          parentId: this.currentParentId,
          configurationId: this.configurationId,
        });
        this.currentParentId = entity.id;
        this.aiMessageId = entity.id;
        this.hasAIMessage = true;
        // Notify the UI about the message ID, because it is needed to rate messages.
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'ai' });
      } else if (persistHuman) {
        if (editMessageId) {
          // only messages of this conversation can be edited (the id comes from the client)
          const message = await this.messages.findOneBy({ id: editMessageId, conversationId: this.conversationId });
          this.currentParentId = message?.parentId;
        } else {
          // we actually need a replyToMessageId
          const message = await this.messages.findOne({
            where: {
              conversationId: this.conversationId,
            },
            order: {
              id: 'DESC',
            },
          });
          this.currentParentId = message?.id;
        }

        this.stored = mapStoredMessagesToChatMessages(
          await this.messages.getMessageThread(this.conversationId, this.currentParentId, false),
        );

        const entity = await this.messages.save({
          parentId: this.currentParentId,
          configurationId: this.configurationId,
          ...data,
        });
        this.currentParentId = entity.id;
        await this.attachNewFilesToConversation(entity.conversationId, entity.id, this.context.files);
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'human' });
      }

      // also mark the conversation as updated
      const conversation = await this.conversations.findOneByOrFail({ id: this.conversationId });
      conversation.updatedAt = new Date();
      await this.conversations.save(conversation);
    } catch (err) {
      this.logger.error('Failed to store message in history.', err);
    }
  }
}

function mapStoredMessagesToChatMessages(messages: MessageEntity[]): BaseMessage[] {
  return (
    messages
      // Answers that were stopped before any text was generated are only kept for the UI. Some LLM APIs reject empty
      // assistant messages, so they are not part of the history for the LLM.
      .filter((message) => !(message.type === 'ai' && message.stopped && !(message.data as { content?: string })?.content))
      .map((message) => {
        // TODO: maybe we should not save this json structure but migrate to a string column
        const data = message.data as { content: string };
        const text = data.content;

        switch (message.type) {
          case 'human':
            return new HumanMessage(text);
          case 'ai':
            return new AIMessage(text, { stopped: message.stopped });
          default:
            throw new Error(`Unsupported message type '${message.type}'.`);
        }
      })
  );
}
