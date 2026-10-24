import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/index.js';
import { ConversationFileEntity } from '../database/entities/conversation-file.js';
import { BlobEntity, BucketEntity, ExtensionEntity, FileEntity } from '../database/index.js';
import {
  CreateBucketHandler,
  DeleteBucketHandler,
  DeleteFileHandler,
  GetBucketDefaultsHandler,
  GetBucketHandler,
  GetBucketsHandler,
  GetDocumentContentHandler,
  GetDocumentPdfHandler,
  GetFilesHandler,
  GetFileTypesHandler,
  RenameFileHandler,
  SearchFilesHandler,
  TestBucketHandler,
  UpdateBucketHandler,
  UploadFileHandler,
} from './use-cases/index.js';

@Module({
  imports: [
    AuditLogModule,
    ConfigModule,
    CqrsModule,
    TypeOrmModule.forFeature([BucketEntity, FileEntity, ExtensionEntity, BlobEntity, ConversationFileEntity]),
  ],
  providers: [
    CreateBucketHandler,
    DeleteBucketHandler,
    DeleteFileHandler,
    RenameFileHandler,
    GetBucketDefaultsHandler,
    GetBucketHandler,
    GetBucketsHandler,
    GetDocumentContentHandler,
    GetDocumentPdfHandler,
    GetFilesHandler,
    GetFileTypesHandler,
    SearchFilesHandler,
    TestBucketHandler,
    UpdateBucketHandler,
    UploadFileHandler,
  ],
})
export class FilesModule {}
