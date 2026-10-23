import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { ConversationEntity, ConversationRepository } from '../../database/index.js';
import { User } from '../../users/index.js';

/** How long a deleted conversation can be restored (the UI offers "Undo" for a few seconds). */
export const CONVERSATION_RESTORE_PERIOD_MS = 5 * 60 * 1000;

export class DeleteConversation {
  constructor(
    public readonly id: number,
    public readonly user: User,
  ) {}
}

export class DeleteConversationResponse {}

/**
 * Deletes the conversation softly, so that it can be restored for a while (see RestoreConversation). Conversations that
 * have been deleted before the restore period are deleted permanently.
 */
@CommandHandler(DeleteConversation)
export class DeleteConversationHandler implements ICommandHandler<DeleteConversation, DeleteConversationResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(command: DeleteConversation): Promise<DeleteConversationResponse> {
    const { id, user } = command;

    const entity = await this.conversations.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    await this.conversations.softDelete({ id: entity.id });
    await purgeDeletedConversations(this.conversations);

    return new DeleteConversationResponse();
  }
}

/** Deletes the soft deleted conversations permanently, which cannot be restored anymore. */
export async function purgeDeletedConversations(conversations: ConversationRepository, now = new Date()) {
  await conversations.delete({ deletedAt: LessThan(new Date(now.getTime() - CONVERSATION_RESTORE_PERIOD_MS)) });
}
