import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from '../../database/index.js';

export class GetBucketDefaults {}

export class GetBucketDefaultsResponse {
  constructor(public readonly endpoint?: string) {}
}

/**
 * Provides the defaults for new buckets: the REI-S endpoint from `REIS_DEFAULT_ENDPOINT`, or else the endpoint of
 * the existing buckets when they all use the same one.
 */
@QueryHandler(GetBucketDefaults)
export class GetBucketDefaultsHandler implements IQueryHandler<GetBucketDefaults, GetBucketDefaultsResponse> {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
  ) {}

  async execute(): Promise<GetBucketDefaultsResponse> {
    const configured = this.configService.get<string>('REIS_DEFAULT_ENDPOINT')?.trim();
    if (configured) {
      return new GetBucketDefaultsResponse(configured);
    }

    const endpoints = await this.buckets
      .createQueryBuilder('bucket')
      .select('DISTINCT bucket.endpoint', 'endpoint')
      .limit(2)
      .getRawMany<{ endpoint: string }>();

    return new GetBucketDefaultsResponse(endpoints.length === 1 ? endpoints[0].endpoint : undefined);
  }
}
