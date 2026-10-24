import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from '../../audit-log/index.js';
import { FileEntity, FileRepository, UserEntity, UserRepository } from '../../database/index.js';
import { purgeFilesOfUser } from '../../files/use-cases/purge-files.js';
import { buildUser, buildUserSnapshot } from './utils.js';

export class DeleteUser {
  constructor(
    public readonly id: string,
    public readonly performedBy: PerformedBy,
  ) {}
}

@CommandHandler(DeleteUser)
export class DeleteUserHandler implements ICommandHandler<DeleteUser, void> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteUser): Promise<void> {
    const { id, performedBy } = command;

    // Get user before deletion for audit log
    const entity = await this.users.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException();
    }
    const userSnapshot = buildUserSnapshot(buildUser(entity));

    // The files (and their documents in the RAG server) first: if the RAG server fails, the user is kept, so that the
    // deletion can be retried. Everything else of the user (conversations, sessions, blobs, ...) is deleted by the
    // foreign key cascades.
    await purgeFilesOfUser(this.files, id);

    const result = await this.users.delete({ id });

    if (!result.affected) {
      throw new NotFoundException();
    }

    await this.auditLogService.createAuditLog({
      entityType: 'user',
      entityId: id,
      action: 'delete',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: userSnapshot,
    });
  }
}
