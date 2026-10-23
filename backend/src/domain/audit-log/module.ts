import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../database/index.js';
import { AuditLogService, GetAuditLogByIdHandler, GetAuditLogsHandler } from './use-cases/index.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditLogService, GetAuditLogByIdHandler, GetAuditLogsHandler],
  exports: [AuditLogService],
})
export class AuditLogModule {}
