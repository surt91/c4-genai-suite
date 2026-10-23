import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLogController } from './controllers/audit-log/audit-log.controller.js';
import { AuthController } from './controllers/auth/auth.controller.js';
import { BlobsController } from './controllers/blobs/blobs.controller.js';
import { ConversationsController } from './controllers/conversations/conversations.controller.js';
import { EvalController } from './controllers/eval/eval.controller.js';
import { ConfigurationsController } from './controllers/extensions/configurations.controller.js';
import { ExtensionsController } from './controllers/extensions/extensions.controller.js';
import { FilesController } from './controllers/files/files.controller.js';
import { UserFilesController } from './controllers/files/user-files.controller.js';
import { HealthController } from './controllers/health/health.controller.js';
import { ApiResponsesController } from './controllers/responses/api.responses.controller.js';
import { SettingsController } from './controllers/settings/settings.controller.js';
import { TranscriptionController } from './controllers/transcription/transcription.controller.js';
import { UsagesController } from './controllers/usages/usages.controller.js';
import { UserGroupsController } from './controllers/users/user-groups.controller.js';
import { UsersController } from './controllers/users/users.controller.js';
import { AuditLogModule } from './domain/audit-log/index.js';
import { AuthModule } from './domain/auth/module.js';
import { ChatModule } from './domain/chat/index.js';
import { UserEntity } from './domain/database/index.js';
import { entities, migrations } from './domain/database/typeorm-sources.js';
import { initSchemaIfNotExistsAndMoveMigrations, schema } from './domain/database/typeorm.helper.js';
import { ExtensionModule } from './domain/extensions/index.js';
import { FilesModule } from './domain/files/index.js';
import { SettingsModule } from './domain/settings/index.js';
import { TranscriptionModule } from './domain/transcription/index.js';
import { UsersModule } from './domain/users/module.js';
import { ExtensionLibraryModule } from './extensions/index.js';
import { I18nModule } from './localization/i18n.module.js';
import { OpenTelemetryModule } from './metrics/opentelemetry.module.js';
import { PrometheusModule } from './metrics/prometheus.module.js';

@Module({
  imports: [
    AuditLogModule,
    AuthModule,
    ChatModule,
    ConfigModule.forRoot(),
    CqrsModule,
    ExtensionLibraryModule.register(),
    ExtensionModule,
    FilesModule,
    I18nModule,
    MulterModule.register({
      // Uploads are buffered in memory; reject huge files before they are read completely.
      limits: { fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 512) * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        callback(null, true);
      },
    }),
    PrometheusModule.forRoot(),
    OpenTelemetryModule,
    SettingsModule,
    TranscriptionModule,
    UsersModule,
    TerminusModule,
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.getOrThrow<string>('DB_URL');
        await initSchemaIfNotExistsAndMoveMigrations(url, schema);
        return {
          url,
          type: 'postgres',
          retryAttempts: 10,
          retryDelay: config.get('GAIBLE_DB_RETRY_DELAY', 100),
          synchronize: false,
          migrationsRun: true,
          entities,
          migrations,
          schema,
        };
      },
      dataSourceFactory: async (options) => {
        return await new DataSource(options!).initialize();
      },
    }),
  ],
  controllers: [
    AuditLogController,
    AuthController,
    BlobsController,
    HealthController,
    ApiResponsesController,
    ConversationsController,
    ConfigurationsController,
    EvalController,
    ExtensionsController,
    FilesController,
    SettingsController,
    TranscriptionController,
    UsagesController,
    UserFilesController,
    UserGroupsController,
    UsersController,
  ],
})
export class AppModule {}
