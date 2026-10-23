import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { BlobCategory, BlobEntity, BlobRepository } from '../../database/index.js';

export class GetBlob {
  constructor(public readonly id: string) {}
}

export class GetBlobResponse {
  constructor(public readonly blob?: { buffer: Buffer; type: string }) {}
}

@QueryHandler(GetBlob)
export class GetBlobHandler implements IQueryHandler<GetBlob, GetBlobResponse> {
  constructor(
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(request: GetBlob): Promise<GetBlobResponse> {
    const { id } = request;

    // Only generated images and logos are public by id; file contents (original/processed) are only accessible
    // through the (user scoped) file endpoints.
    const entity = await this.blobs.findOneBy({ id, category: In([BlobCategory.LLM_IMAGE, BlobCategory.LOGO]) });

    if (!entity) {
      return new GetBlobResponse();
    }

    const buffer = Buffer.from(entity.buffer, 'base64');

    return new GetBlobResponse({ type: entity.type, buffer });
  }
}
