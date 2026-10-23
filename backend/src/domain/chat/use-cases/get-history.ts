import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationEntity, ConversationRepository, MessageEntity, MessageRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Message, MessageType } from '../interfaces.js';
import { ConversationRunsService } from '../services/conversation-runs.js';
import { normalizedMessageContent } from '../utils.js';

export class GetHistory {
  constructor(
    public readonly id: number,
    public readonly user: User,
  ) {}
}

export class GetHistoryResponse {
  constructor(public readonly history: Message[]) {}
}

@QueryHandler(GetHistory)
export class GetHistoryHandler implements IQueryHandler<GetHistory, GetHistoryResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
    private readonly runs: ConversationRunsService,
  ) {}

  async execute(query: GetHistory): Promise<GetHistoryResponse> {
    const { id: conversationId, user } = query;

    const conversation = await this.conversations.findOneBy({ id: conversationId });

    if (!conversation) {
      throw new NotFoundException();
    }

    if (conversation.userId !== user.id) {
      throw new ForbiddenException();
    }

    // If the user has just stopped the answer, wait until the partial answer is persisted.
    await this.runs.waitForStopped(conversationId);

    const entities = await this.messages.getMessageThread(conversationId);

    const result = entities.map((m: { id: number; configurationId: number; type: string; data: MessageEntityData }) => ({
      ...m,
      type: m.type as MessageType,
      content: normalizedMessageContent(m.data.content),
    }));

    return new GetHistoryResponse(result);
  }
}

type MessageEntityData = {
  content: string;
};
