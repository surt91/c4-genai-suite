import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BlobEntity, BlobRepository } from '../../database/index.js';

export class DeleteBlob {
  constructor(readonly id: string) {}
}

export class DeleteBlobResponse {}

@CommandHandler(DeleteBlob)
export class DeleteBlobHandler implements ICommandHandler<DeleteBlob, DeleteBlobResponse> {
  constructor(
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(request: DeleteBlob): Promise<DeleteBlobResponse> {
    await this.blobs.delete(request.id);
    return new DeleteBlobResponse();
  }
}
