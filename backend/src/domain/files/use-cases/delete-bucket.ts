import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { JsonContains } from 'typeorm';
import { AuditLogService, PerformedBy } from '../../audit-log/index.js';
import { BucketEntity, BucketRepository, ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { buildBucket, buildBucketSnapshot, buildClient, ResponseError } from './utils.js';

export class DeleteBucket {
  constructor(
    public readonly id: number,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class DeleteBucketResponse {}

@CommandHandler(DeleteBucket)
export class DeleteBucketHandler implements ICommandHandler<DeleteBucket, DeleteBucketResponse> {
  private readonly logger = new Logger(DeleteBucketHandler.name);

  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteBucket): Promise<DeleteBucketResponse> {
    const { id, performedBy } = command;

    const bucket = await this.buckets.findOneBy({ id });

    if (!bucket) {
      throw new NotFoundException();
    }

    // Capture snapshot before deletion for audit log
    const bucketSnapshot = buildBucketSnapshot(buildBucket(bucket));

    const extensionUsingBucket = await this.extensions.findOne({
      where: { values: JsonContains({ bucket: Number(id) }) },
    });
    if (extensionUsingBucket !== null) {
      throw new BadRequestException(
        `Bucket ${bucket.name ?? ''} cannot be deleted because it is used by one or more extensions.`,
      );
    }

    const api = buildClient(bucket);

    const files = await bucket.files;
    for (const file of files) {
      try {
        await api.deleteFile({ file_id: file.id.toString(), indexName: bucket.indexName });
      } catch (error) {
        if (error instanceof ResponseError && error.status === 404) {
          // if the file is not found, we can ignore the error trying to delete it
          this.logger.warn(`File ${file.id} not found in remote storage, assuming it was already deleted.`);
          continue;
        }
        throw error;
      }
    }

    await this.buckets.delete({ id });

    await this.auditLogService.createAuditLog({
      entityType: 'bucket',
      entityId: String(id),
      action: 'delete',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: bucketSnapshot,
    });

    return new DeleteBucketResponse();
  }
}
