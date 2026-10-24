import { randomUUID } from 'crypto';
import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import type { Mock } from 'vitest';
import { AppModule } from '../app.module.js';
import { ConversationFileEntity } from '../domain/database/entities/conversation-file.js';
import {
  BlobCategory,
  BlobEntity,
  BucketEntity,
  BucketType,
  ConfigurationEntity,
  ConfigurationStatus,
  ConversationEntity,
  FileEntity,
  FileUploadStatus,
  MessageEntity,
  UserEntity,
} from '../domain/database/index.js';
import { buildClient } from '../domain/files/use-cases/utils.js';
import { initAppWithDataBaseAndValidUser } from '../utils/testUtils.js';

vi.mock('../domain/files/use-cases/utils.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domain/files/use-cases/utils.js')>()),
  buildClient: vi.fn(),
}));

/** The files, blobs and REI-S documents of conversations and users are deleted when they are purged (P2-27). */
describe('Deletion of the data of conversations and users', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let deleteFile: Mock;

  let conversationBucket: BucketEntity;
  let userBucket: BucketEntity;
  let configurationId: number;
  let userId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const initialized = await initAppWithDataBaseAndValidUser(module);
    dataSource = initialized.dataSource;
    app = initialized.app;
    userId = initialized.user.id;

    const configuration = await dataSource
      .getRepository(ConfigurationEntity)
      .save({ name: 'Assistant', status: ConfigurationStatus.ENABLED });
    configurationId = configuration.id;
    conversationBucket = await createBucket('conversation', 'conversation-index');
    userBucket = await createBucket('user', 'user-index');
  });

  beforeEach(() => {
    deleteFile = vi.fn().mockResolvedValue(undefined);
    (buildClient as Mock).mockImplementation(() => ({ deleteFile }));
  });

  afterAll(async () => {
    await app.close();
  });

  async function createBucket(type: BucketType, indexName: string) {
    return dataSource.getRepository(BucketEntity).save({
      name: `${type} bucket`,
      type,
      endpoint: 'http://reis:3201',
      indexName,
      isDefault: false,
      perUserQuota: 20,
    });
  }

  async function createConversation(owner = userId, deletedAt?: Date) {
    return dataSource
      .getRepository(ConversationEntity)
      .save({ name: 'Conversation', configurationId, userId: owner, deletedAt: deletedAt ?? null });
  }

  async function createUser(name: string) {
    const id = randomUUID();
    return dataSource.getRepository(UserEntity).save({ id, name, email: `${name}-${id}@example.com` });
  }

  async function createFile(owner: string, bucket?: BucketEntity, conversationIds: number[] = []) {
    const file = await dataSource.getRepository(FileEntity).save({
      fileName: 'file.pdf',
      fileSize: 10,
      mimeType: 'application/pdf',
      uploadStatus: FileUploadStatus.Successful,
      userId: owner,
      bucketId: bucket?.id,
    });
    await dataSource.getRepository(BlobEntity).save({
      id: `blob-${file.id}`,
      fileId: file.id,
      userId: owner,
      type: 'application/pdf',
      buffer: 'AA==',
      category: BlobCategory.FILE_ORIGINAL,
    });
    for (const conversationId of conversationIds) {
      await dataSource.getRepository(ConversationFileEntity).save({ conversationId, fileId: file.id });
    }
    return file;
  }

  /** An image of an image tool, shown in an answer of the conversation (see GPTImage1Extension). */
  async function createGeneratedImage(owner?: { userId: string; conversationId: number }) {
    const image = await dataSource.getRepository(BlobEntity).save({
      id: randomUUID(),
      type: 'image/png',
      buffer: 'AA==',
      category: BlobCategory.LLM_IMAGE,
      userId: owner?.userId,
      conversationId: owner?.conversationId,
    });
    if (owner) {
      await showImage(owner.conversationId, image.id);
    }
    return image;
  }

  async function showImage(conversationId: number, imageId: string) {
    await dataSource.getRepository(MessageEntity).save({
      type: 'ai',
      data: { content: `![a dog](https://example.com/blobs/${imageId})` },
      configurationId,
      conversationId,
    });
  }

  const expired = () => new Date(Date.now() - 60 * 60 * 1000);
  const imageExists = async (id: string) => (await dataSource.getRepository(BlobEntity).countBy({ id })) > 0;
  const fileExists = async (id: number) => (await dataSource.getRepository(FileEntity).countBy({ id })) > 0;
  const blobExists = async (fileId: number) => (await dataSource.getRepository(BlobEntity).countBy({ fileId })) > 0;
  const conversationExists = async (id: number) =>
    (await dataSource.getRepository(ConversationEntity).count({ where: { id }, withDeleted: true })) > 0;

  it('keeps the files of a softly deleted conversation, so that it can be restored', async () => {
    const conversation = await createConversation();
    const file = await createFile(userId, conversationBucket, [conversation.id]);

    await request(app.getHttpServer()).delete(`/conversations/${conversation.id}`).expect(200);

    expect(deleteFile).not.toHaveBeenCalled();
    expect(await fileExists(file.id)).toBe(true);
    await request(app.getHttpServer()).post(`/conversations/${conversation.id}/restore`).expect(204);
  });

  it('deletes the conversation files and their REI-S documents when the conversation is purged', async () => {
    const old = await createConversation(userId, expired());
    const duplicate = await createConversation();
    const conversationFile = await createFile(userId, conversationBucket, [old.id]);
    const image = await createFile(userId, undefined, [old.id]);
    const personalFile = await createFile(userId, userBucket, [old.id]);
    const sharedFile = await createFile(userId, conversationBucket, [old.id, duplicate.id]);

    const next = await createConversation();
    await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(200);

    expect(await conversationExists(old.id)).toBe(false);
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(deleteFile).toHaveBeenCalledWith({ file_id: String(conversationFile.id), indexName: 'conversation-index' });
    expect(await fileExists(conversationFile.id)).toBe(false);
    expect(await blobExists(conversationFile.id)).toBe(false);
    expect(await fileExists(image.id)).toBe(false);
    expect(await blobExists(image.id)).toBe(false);
    // personal files are only unlinked, files of other conversations (duplicates) are kept
    expect(await fileExists(personalFile.id)).toBe(true);
    expect(await fileExists(sharedFile.id)).toBe(true);
  });

  it('deletes the generated images of a purged conversation, unless a duplicate of the same user shows them', async () => {
    const other = await createUser('o');
    const old = await createConversation(userId, expired());
    const duplicate = await createConversation();
    const ofOtherUser = await createConversation(other.id);
    const image = await createGeneratedImage({ userId, conversationId: old.id });
    const sharedImage = await createGeneratedImage({ userId, conversationId: old.id });
    await showImage(duplicate.id, sharedImage.id);
    // another user cannot take over the image by sending its URL
    const pastedImage = await createGeneratedImage({ userId, conversationId: old.id });
    await showImage(ofOtherUser.id, pastedImage.id);
    // generated before the owner was recorded
    const imageWithoutOwner = await createGeneratedImage();
    const imageOfDuplicate = await createGeneratedImage({ userId, conversationId: duplicate.id });

    const next = await createConversation();
    await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(200);

    expect(await conversationExists(old.id)).toBe(false);
    expect(await imageExists(image.id)).toBe(false);
    expect(await imageExists(pastedImage.id)).toBe(false);
    expect(await dataSource.getRepository(BlobEntity).findOneBy({ id: sharedImage.id })).toMatchObject({
      userId,
      conversationId: duplicate.id,
    });
    expect(await imageExists(imageWithoutOwner.id)).toBe(true);
    expect(await imageExists(imageOfDuplicate.id)).toBe(true);

    // the duplicate took over the image, so it is deleted with the duplicate
    await request(app.getHttpServer()).delete('/conversations').expect(200);
    expect(await imageExists(sharedImage.id)).toBe(false);
    expect(await imageExists(imageOfDuplicate.id)).toBe(false);
    expect(await imageExists(imageWithoutOwner.id)).toBe(true);
  });

  it('fails without deleting anything when REI-S is not reachable and can be retried', async () => {
    const old = await createConversation(userId, expired());
    const file = await createFile(userId, conversationBucket, [old.id]);
    const next = await createConversation();
    deleteFile.mockRejectedValue(new TypeError('fetch failed'));

    const response = await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(503);

    expect((response.body as { message: string }).message).toContain('RAG server');
    expect(await fileExists(file.id)).toBe(true);
    expect(await conversationExists(old.id)).toBe(true);
    await request(app.getHttpServer()).get(`/conversations/${next.id}`).expect(200);

    deleteFile.mockResolvedValue(undefined);
    await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(200);

    expect(await fileExists(file.id)).toBe(false);
    expect(await conversationExists(old.id)).toBe(false);
  });

  it('deletes the files of all conversations when all conversations are deleted', async () => {
    const other = await createUser('other');
    const ofOther = await createConversation(other.id);
    const fileOfOther = await createFile(other.id, conversationBucket, [ofOther.id]);
    const conversation = await createConversation();
    const softlyDeleted = await createConversation(userId, new Date());
    const file = await createFile(userId, conversationBucket, [conversation.id]);
    const fileOfSoftlyDeleted = await createFile(userId, conversationBucket, [softlyDeleted.id]);

    await request(app.getHttpServer()).delete('/conversations').expect(200);

    expect(await conversationExists(conversation.id)).toBe(false);
    expect(await conversationExists(softlyDeleted.id)).toBe(false);
    expect(await fileExists(file.id)).toBe(false);
    expect(await fileExists(fileOfSoftlyDeleted.id)).toBe(false);
    expect(deleteFile).toHaveBeenCalledWith({ file_id: String(file.id), indexName: 'conversation-index' });
    expect(await fileExists(fileOfOther.id)).toBe(true);
  });

  it('deletes all files of a deleted user and their REI-S documents and keeps the user when REI-S fails', async () => {
    const user = await createUser('leaving');
    const conversation = await createConversation(user.id);
    const conversationFile = await createFile(user.id, conversationBucket, [conversation.id]);
    const personalFile = await createFile(user.id, userBucket);
    // e.g. uploaded with the responses API
    const unlinkedFile = await createFile(user.id, conversationBucket);
    const image = await createFile(user.id, undefined, [conversation.id]);
    const fileOfOtherUser = await createFile(userId, userBucket);
    const generatedImage = await createGeneratedImage({ userId: user.id, conversationId: conversation.id });
    const imageOfOtherUser = await createGeneratedImage({ userId, conversationId: (await createConversation()).id });

    deleteFile.mockRejectedValueOnce(new TypeError('fetch failed'));
    await request(app.getHttpServer()).delete(`/users/${user.id}`).expect(503);
    expect(await dataSource.getRepository(UserEntity).countBy({ id: user.id })).toBe(1);
    expect(await conversationExists(conversation.id)).toBe(true);
    expect(await imageExists(generatedImage.id)).toBe(true);

    deleteFile.mockClear();
    await request(app.getHttpServer()).delete(`/users/${user.id}`).expect(200);

    expect(await dataSource.getRepository(UserEntity).countBy({ id: user.id })).toBe(0);
    expect(await conversationExists(conversation.id)).toBe(false);
    for (const file of [conversationFile, personalFile, unlinkedFile, image]) {
      expect(await fileExists(file.id)).toBe(false);
      expect(await blobExists(file.id)).toBe(false);
    }
    expect(deleteFile).toHaveBeenCalledWith({ file_id: String(conversationFile.id), indexName: 'conversation-index' });
    expect(deleteFile).toHaveBeenCalledWith({ file_id: String(personalFile.id), indexName: 'user-index' });
    expect(deleteFile).toHaveBeenCalledWith({ file_id: String(unlinkedFile.id), indexName: 'conversation-index' });
    expect(await fileExists(fileOfOtherUser.id)).toBe(true);
    expect(await imageExists(generatedImage.id)).toBe(false);
    expect(await imageExists(imageOfOtherUser.id)).toBe(true);
  });
});
