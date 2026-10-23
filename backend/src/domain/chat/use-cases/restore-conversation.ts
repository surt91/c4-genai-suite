import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationEntity, ConversationRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { CONVERSATION_RESTORE_PERIOD_MS } from './delete-conversation';

export class RestoreConversation {
  constructor(
    public readonly id: number,
    public readonly user: User,
  ) {}
}

export class RestoreConversationResponse {}

/** Restores a conversation that has been deleted recently ("Undo"). */
@CommandHandler(RestoreConversation)
export class RestoreConversationHandler implements ICommandHandler<RestoreConversation, RestoreConversationResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(command: RestoreConversation): Promise<RestoreConversationResponse> {
    const { id, user } = command;

    const entity = await this.conversations.findOne({ where: { id }, withDeleted: true });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    if (!entity.deletedAt) {
      return new RestoreConversationResponse();
    }

    if (Date.now() - entity.deletedAt.getTime() > CONVERSATION_RESTORE_PERIOD_MS) {
      throw new NotFoundException();
    }

    await this.conversations.restore({ id: entity.id });

    return new RestoreConversationResponse();
  }
}
