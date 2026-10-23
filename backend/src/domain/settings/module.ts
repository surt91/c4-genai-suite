import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/index.js';
import { BlobEntity, SettingEntity } from '../database/index.js';
import {
  DeleteBlobHandler,
  GetBlobHandler,
  GetSettingsHandler,
  UpdateSettingsHandler,
  UploadBlobHandler,
} from './use-cases/index.js';

@Module({
  imports: [AuditLogModule, TypeOrmModule.forFeature([BlobEntity, SettingEntity])],
  providers: [
    DeleteBlobHandler, //
    GetBlobHandler,
    GetSettingsHandler,
    UpdateSettingsHandler,
    UploadBlobHandler,
  ],
})
export class SettingsModule {}
