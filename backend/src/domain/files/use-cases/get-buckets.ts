import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from '../../database/index.js';
import { Bucket } from '../interfaces.js';
import { buildBucket } from './utils.js';

export class GetBuckets {
  constructor() {}
}

export class GetBucketsResponse {
  constructor(public readonly buckets: Bucket[]) {}
}

@QueryHandler(GetBuckets)
export class GetBucketsHandler implements IQueryHandler<GetBuckets, GetBucketsResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
  ) {}

  async execute(): Promise<GetBucketsResponse> {
    const entities = await this.buckets.find({ order: { name: 'ASC' } });
    const result = entities.map(buildBucket);

    return new GetBucketsResponse(result);
  }
}
