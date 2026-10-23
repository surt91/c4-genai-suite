import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/module.js';
import { ConversationFileEntity } from '../database/entities/conversation-file.js';
import {
  BucketEntity,
  ConfigurationEntity,
  ConversationEntity,
  ConversationRepository,
  FileEntity,
  MessageEntity,
  MessageRepository,
  UsageEntity,
  UsageRepository,
  UserGroupEntity,
} from '../database/index.js';
import { registerRepositoryForEntity } from '../database/typeorm.helper.js';
import { ChatCacheImpl } from './cache.js';
import { CHAT_MIDDLEWARES_TOKEN, ChatMiddleware } from './interfaces.js';
import {
  CheckUsageMiddleware,
  ChooseLllMiddleware,
  CompleteMiddleware,
  DefaultPromptMiddleware,
  ExceptionMiddleware,
  ExecuteMiddleware,
  GetHistoryMiddleware,
  GetUserMiddleware,
  LangfuseMiddleware,
  RenderPromptMiddleware,
  StorageUsageMiddleware,
  SummarizeHistoryMiddleware,
  UIMiddleware,
} from './middlewares/index.js';
import { CallbackService } from './services/callback-service.js';
import { ConversationRunsService } from './services/conversation-runs.js';
import {
  DeleteConversationHandler,
  DeleteConversationsHandler,
  DuplicateConversationHandler,
  GetAssistantsCountHandler,
  GetConversationHandler,
  GetConversationsHandler,
  GetDocumentContentHandler,
  GetDocumentHandler,
  GetHistoryHandler,
  GetMessagesCountHandler,
  GetRatingsHandler,
  GetUsageHandler,
  GetUsersCountHandler,
  RateMessageHandler,
  RestoreConversationHandler,
  SendMessageHandler,
  StartConversationHandler,
  UpdateConversationHandler,
} from './use-cases/index.js';

@Module({
  imports: [
    AuditLogModule,
    ConfigModule,
    CqrsModule,
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConfigurationEntity,
      MessageEntity,
      UsageEntity,
      UserGroupEntity,
      BucketEntity,
      FileEntity,
      ConversationFileEntity,
    ]),
  ],
  exports: [CallbackService],
  providers: [
    ChatCacheImpl,
    CallbackService,
    CheckUsageMiddleware,
    ConversationRunsService,
    ChooseLllMiddleware,
    CompleteMiddleware,
    DefaultPromptMiddleware,
    DeleteConversationHandler,
    RestoreConversationHandler,
    DeleteConversationsHandler,
    DuplicateConversationHandler,
    ExceptionMiddleware,
    ExecuteMiddleware,
    GetAssistantsCountHandler,
    GetConversationHandler,
    GetConversationsHandler,
    GetDocumentContentHandler,
    GetDocumentHandler,
    GetHistoryHandler,
    GetHistoryMiddleware,
    GetRatingsHandler,
    GetMessagesCountHandler,
    GetUsageHandler,
    GetUserMiddleware,
    GetUsersCountHandler,
    LangfuseMiddleware,
    RateMessageHandler,
    RenderPromptMiddleware,
    SendMessageHandler,
    StartConversationHandler,
    StorageUsageMiddleware,
    SummarizeHistoryMiddleware,
    UIMiddleware,
    UpdateConversationHandler,
    registerRepositoryForEntity(MessageRepository, MessageEntity),
    registerRepositoryForEntity(ConversationRepository, ConversationEntity),
    registerRepositoryForEntity(UsageRepository, UsageEntity),
    {
      provide: CHAT_MIDDLEWARES_TOKEN,
      useFactory: (...args: ChatMiddleware[]) => {
        return [...args];
      },
      inject: [
        CheckUsageMiddleware,
        ChooseLllMiddleware,
        CompleteMiddleware,
        DefaultPromptMiddleware,
        ExceptionMiddleware,
        ExecuteMiddleware,
        GetHistoryMiddleware,
        GetUserMiddleware,
        LangfuseMiddleware,
        RenderPromptMiddleware,
        StorageUsageMiddleware,
        SummarizeHistoryMiddleware,
        UIMiddleware,
      ],
    },
  ],
})
export class ChatModule {}
