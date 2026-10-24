import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BlobCategory, BlobEntity, BlobRepository } from '../../database/index.js';

export class UploadBlob {
  constructor(
    public readonly id: string,
    public readonly buffer: Buffer,
    public readonly mimeType: string,
    public readonly fileName: string,
    public readonly fileSize: number,
    public readonly category: BlobCategory,
    // The owner of a generated image: only this user can read it and it is deleted with the conversation or the user.
    public readonly owner?: BlobOwner,
  ) {}
}

export interface BlobOwner {
  userId: string;
  conversationId?: number;
}

export class UploadBlobResponse {}

@CommandHandler(UploadBlob)
export class UploadBlobHandler implements ICommandHandler<UploadBlob, UploadBlobResponse> {
  constructor(
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(request: UploadBlob): Promise<UploadBlobResponse> {
    const { id, mimeType: type, category, owner } = request;

    const buffer = request.buffer.toString('base64');

    await this.blobs.save({ id, type, buffer, category, userId: owner?.userId, conversationId: owner?.conversationId });

    return new UploadBlobResponse();
  }
}
