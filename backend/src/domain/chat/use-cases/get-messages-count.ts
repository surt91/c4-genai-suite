import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity, MessageRepository, MessagesCount } from '../../database/index.js';
import { GroupBy } from '../statistics.js';

export class GetMessagesCount {
  constructor(
    public readonly since: Date | undefined,
    public readonly groupBy: GroupBy,
  ) {}
}

export class GetMessagesCountResponse {
  constructor(public readonly requests: MessagesCount[]) {}
}

@QueryHandler(GetMessagesCount)
export class GetMessagesCountHandler implements IQueryHandler<GetMessagesCount, GetMessagesCountResponse> {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
  ) {}

  async execute(query: GetMessagesCount): Promise<GetMessagesCountResponse> {
    const result = await this.messages.getMessageCount(query.since, query.groupBy);
    return new GetMessagesCountResponse(result);
  }
}
