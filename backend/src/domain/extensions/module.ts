import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/index.js';
import { ConfigurationUserEntity } from '../database/entities/configuration-user.js';
import { BucketEntity, ConfigurationEntity, ConversationEntity, ExtensionEntity, UserGroupEntity } from '../database/index.js';
import { ExplorerService } from './services/index.js';
import { GetConfigurationUserValuesHandler } from './use-cases/get-configuration-user-values.js';
import {
  CreateConfigurationHandler,
  CreateExtensionHandler,
  DeleteConfigurationHandler,
  DeleteExtensionHandler,
  DuplicateConfigurationHandler,
  ExportConfigurationHandler,
  GetBucketAvailabilityHandler,
  GetConfigurationHandler,
  GetConfigurationsHandler,
  GetExtensionHandler,
  GetExtensionsHandler,
  ImportConfigurationHandler,
  RebuildExtensionHandler,
  TestExtensionHandler,
  UpdateConfigurationHandler,
  UpdateExtensionHandler,
} from './use-cases/index.js';
import { UpdateConfigurationUserValuesHandler } from './use-cases/update-configuration-user-values.js';

@Module({
  imports: [
    AuditLogModule,
    ConfigModule,
    CqrsModule,
    TypeOrmModule.forFeature([
      BucketEntity,
      ConfigurationEntity,
      ConfigurationUserEntity,
      ConversationEntity,
      ExtensionEntity,
      UserGroupEntity,
    ]),
  ],
  providers: [
    CreateConfigurationHandler,
    CreateExtensionHandler,
    GetConfigurationHandler,
    DeleteConfigurationHandler,
    DeleteExtensionHandler,
    ExplorerService,
    GetBucketAvailabilityHandler,
    GetConfigurationsHandler,
    GetExtensionHandler,
    GetExtensionsHandler,
    TestExtensionHandler,
    RebuildExtensionHandler,
    UpdateConfigurationHandler,
    UpdateExtensionHandler,
    DuplicateConfigurationHandler,
    GetConfigurationUserValuesHandler,
    UpdateConfigurationUserValuesHandler,
    ExportConfigurationHandler,
    ImportConfigurationHandler,
  ],
  exports: [ExplorerService],
})
export class ExtensionModule {}
