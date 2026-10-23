import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UsageEntity, UsageRepository } from '../../database/index.js';
import { GroupBy } from '../statistics.js';

export class GetUsage {
  constructor(
    public readonly since: Date | undefined,
    public readonly groupBy: GroupBy,
  ) {}
}

export class GetUsageResponse {
  constructor(public readonly usage: Usage[]) {}
}

export interface Usage {
  // The date key.
  date: Date;

  // The total number of tokens.
  total: number;

  // The usage per llm and model.
  byModel: Record<string, number>;
}

@QueryHandler(GetUsage)
export class GetUsageHandler implements IQueryHandler<GetUsage, GetUsageResponse> {
  constructor(
    @InjectRepository(UsageEntity)
    private readonly usages: UsageRepository,
  ) {}

  async execute(query: GetUsage): Promise<GetUsageResponse> {
    const result = await this.usages.getUsageCount(query.since, query.groupBy);
    return new GetUsageResponse(result);
  }
}
