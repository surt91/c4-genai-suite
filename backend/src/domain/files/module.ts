import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/index.js';
import { ConversationFileEntity } from '../database/entities/conversation-file.js';
import { BlobEntity, BucketEntity, ExtensionEntity, FileEntity } from '../database/index.js';
import {
  CreateBucketHandler,
  DeleteBucketHandler,
  DeleteFileHandler,
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
    CqrsModule,
    TypeOrmModule.forFeature([BucketEntity, FileEntity, ExtensionEntity, BlobEntity, ConversationFileEntity]),
  ],
  providers: [
    CreateBucketHandler,
    DeleteBucketHandler,
    DeleteFileHandler,
    RenameFileHandler,
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
