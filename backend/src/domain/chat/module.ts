import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
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
} from 'src/domain/database';
import { AuditLogModule } from '../audit-log/module';
import { ConversationFileEntity } from '../database/entities/conversation-file';
import { registerRepositoryForEntity } from '../database/typeorm.helper';
import { ChatCacheImpl } from './cache';
import { CHAT_MIDDLEWARES_TOKEN, ChatMiddleware } from './interfaces';
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
} from './middlewares';
import { CallbackService } from './services/callback-service';
import { ConversationRunsService } from './services/conversation-runs';
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
} from './use-cases';

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
