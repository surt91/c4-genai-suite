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
  ) {}
}

export class UploadBlobResponse {}

@CommandHandler(UploadBlob)
export class UploadBlobHandler implements ICommandHandler<UploadBlob, UploadBlobResponse> {
  constructor(
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(request: UploadBlob): Promise<UploadBlobResponse> {
    const { id, mimeType: type, category } = request;

    const buffer = request.buffer.toString('base64');

    await this.blobs.save({ id, type, buffer, category });

    return new UploadBlobResponse();
  }
}
