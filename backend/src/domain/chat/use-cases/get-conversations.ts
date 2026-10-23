import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { And, IsNull, Not } from 'typeorm';
import { ConversationEntity, ConversationRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Conversation } from '../interfaces.js';

export class GetConversations {
  constructor(
    public readonly user: User,
    public readonly limit = 100,
  ) {}
}

export class GetConversationsResponse {
  constructor(public readonly conversations: Conversation[]) {}
}

@QueryHandler(GetConversations)
export class GetConversationsHandler implements IQueryHandler<GetConversations, GetConversationsResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(query: GetConversations): Promise<GetConversationsResponse> {
    const { user, limit } = query;

    const entities = await this.conversations.find({
      where: {
        userId: user.id,
        name: And(
          Not(IsNull()), //
          Not(''),
        ),
      },
      order: {
        updatedAt: 'DESC',
      },
      take: limit || undefined,
    });

    return new GetConversationsResponse(entities);
  }
}
