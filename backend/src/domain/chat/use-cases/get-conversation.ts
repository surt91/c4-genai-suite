import { ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationEntity, ConversationRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Conversation } from '../interfaces.js';

export class GetConversation {
  constructor(
    public readonly id: number,
    public readonly user: User,
  ) {}
}

export class GetConversationResponse {
  constructor(public readonly conversation?: Conversation) {}
}

@QueryHandler(GetConversation)
export class GetConversationHandler implements IQueryHandler<GetConversation, GetConversationResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(command: GetConversation): Promise<GetConversationResponse> {
    const { id, user } = command;

    const entity = await this.conversations.findOneBy({ id });

    if (!entity) {
      return new GetConversationResponse();
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    return new GetConversationResponse(entity);
  }
}
