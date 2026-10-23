import { AuditLogEntity } from 'src/domain/database';
import { AuditLog } from '../interfaces';

export function buildAuditLog(entity: AuditLogEntity): AuditLog {
  return {
    id: entity.id,
    entityType: entity.entityType,
    entityId: entity.entityId,
    action: entity.action,
    userId: entity.userId,
    userName: entity.userName,
    snapshot: entity.snapshot,
    createdAt: entity.createdAt,
  };
}
