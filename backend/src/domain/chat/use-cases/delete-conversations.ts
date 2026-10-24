import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file.js';
import {
  BlobEntity,
  BlobRepository,
  ConversationEntity,
  ConversationRepository,
  FileEntity,
  FileRepository,
} from '../../database/index.js';
import { User } from '../../users/index.js';
import { purgeConversations } from './delete-conversation.js';

export class DeleteConversations {
  constructor(public readonly user: User) {}
}

export class DeleteConversationsResponse {}

/** Deletes all conversations of the user permanently (they cannot be restored). */
@CommandHandler(DeleteConversations)
export class DeleteConversationsHandler implements ICommandHandler<DeleteConversations, DeleteConversationsResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
    @InjectRepository(ConversationFileEntity)
    private readonly conversationFiles: ConversationFileRepository,
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(command: DeleteConversations): Promise<DeleteConversationsResponse> {
    const { user } = command;

    if (user?.id != null) {
      // including the softly deleted ones, together with their files (see purgeConversations)
      const conversations = await this.conversations.find({
        where: { userId: user.id },
        withDeleted: true,
        select: { id: true },
      });
      await purgeConversations(
        { conversations: this.conversations, conversationFiles: this.conversationFiles, files: this.files, blobs: this.blobs },
        conversations.map((x) => x.id),
      );
    }

    return new DeleteConversationsResponse();
  }
}
