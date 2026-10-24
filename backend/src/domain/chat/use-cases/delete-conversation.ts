import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Not } from 'typeorm';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file.js';
import {
  BlobCategory,
  BlobEntity,
  BlobRepository,
  ConversationEntity,
  ConversationRepository,
  FileEntity,
  FileRepository,
  MessageEntity,
} from '../../database/index.js';
import { purgeFiles } from '../../files/use-cases/purge-files.js';
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
 * have been deleted before the restore period are deleted permanently (with their files, see purgeConversations).
 *
 * The purge runs first: when the RAG server is not reachable, the request fails and nothing is deleted, so it can be
 * retried.
 */
@CommandHandler(DeleteConversation)
export class DeleteConversationHandler implements ICommandHandler<DeleteConversation, DeleteConversationResponse> {
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

  async execute(command: DeleteConversation): Promise<DeleteConversationResponse> {
    const { id, user } = command;

    const entity = await this.conversations.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    await purgeDeletedConversations({
      conversations: this.conversations,
      conversationFiles: this.conversationFiles,
      files: this.files,
      blobs: this.blobs,
    });
    await this.conversations.softDelete({ id: entity.id });

    return new DeleteConversationResponse();
  }
}

export interface ConversationPurgeRepositories {
  conversations: ConversationRepository;
  conversationFiles: ConversationFileRepository;
  files: FileRepository;
  blobs: BlobRepository;
}

/** Deletes the soft deleted conversations permanently, which cannot be restored anymore. */
export async function purgeDeletedConversations(repositories: ConversationPurgeRepositories, now = new Date()) {
  const expired = await repositories.conversations.find({
    where: { deletedAt: LessThan(new Date(now.getTime() - CONVERSATION_RESTORE_PERIOD_MS)) },
    withDeleted: true,
    select: { id: true },
  });

  await purgeConversations(
    repositories,
    expired.map((x) => x.id),
  );
}

/**
 * Deletes the conversations permanently together with the files that belong to them: files of the conversation bucket
 * and files without bucket (e.g. images), unless another conversation (e.g. a duplicate) still uses them. Personal
 * files of the user bucket are only unlinked. The images generated in the conversation are deleted, too (see
 * purgeGeneratedImages).
 *
 * The conversations are purged one after another and a conversation is only deleted after its files, so when the RAG
 * server fails (RagServerDeletionFailedException), the remaining conversations stay and are purged by the next attempt.
 */
export async function purgeConversations(repositories: ConversationPurgeRepositories, ids: number[]) {
  const { conversations, conversationFiles, files, blobs } = repositories;

  for (const conversationId of ids) {
    const links = await conversationFiles.find({
      where: { conversationId },
      relations: { file: { bucket: true } },
    });

    const candidates = links
      .map((link) => link.file)
      .filter((file) => (file.bucket ? file.bucket.type === 'conversation' : file.bucketId == null));

    const usedElsewhere = candidates.length
      ? await conversationFiles.find({
          where: { fileId: In(candidates.map((file) => file.id)), conversationId: Not(conversationId) },
          select: { fileId: true },
        })
      : [];
    const usedElsewhereIds = new Set(usedElsewhere.map((link) => link.fileId));

    await purgeFiles(
      files,
      candidates.filter((file) => !usedElsewhereIds.has(file.id)).map((file) => file.id),
    );
    await purgeGeneratedImages(blobs, conversationId);
    await conversations.delete({ id: conversationId });
  }
}

/**
 * Deletes the images generated in the conversation (by the image tools). A duplicate of the conversation shows the same
 * images (the messages contain their URLs), so another conversation of the same user, whose messages contain the URL,
 * takes over the image instead. Images generated before their conversation was recorded have no conversation and stay.
 */
async function purgeGeneratedImages(blobs: BlobRepository, conversationId: number) {
  const images = await blobs.find({
    where: { conversationId, category: BlobCategory.LLM_IMAGE },
    select: { id: true, userId: true },
  });

  const deletable: string[] = [];
  for (const image of images) {
    const usedBy = image.userId
      ? await blobs.manager
          .createQueryBuilder(MessageEntity, 'message')
          .withDeleted()
          .innerJoin('message.conversation', 'conversation')
          .select('message.conversationId', 'conversationId')
          .where('message.conversationId <> :conversationId', { conversationId })
          .andWhere('conversation.userId = :userId', { userId: image.userId })
          // the ID is a UUID, which contains no wildcards of LIKE
          .andWhere('message.data LIKE :url', { url: `%/blobs/${image.id}%` })
          .orderBy('message.conversationId')
          .limit(1)
          .getRawOne<{ conversationId: number }>()
      : undefined;

    if (usedBy) {
      await blobs.update({ id: image.id }, { conversationId: usedBy.conversationId });
    } else {
      deletable.push(image.id);
    }
  }

  if (deletable.length) {
    await blobs.delete({ id: In(deletable) });
  }
}
