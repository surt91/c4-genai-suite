import { randomUUID } from 'crypto';
import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import type { Mock } from 'vitest';
import { AppModule } from '../../app.module.js';
import { ConversationFileEntity } from '../../domain/database/entities/conversation-file.js';
import {
  BucketEntity,
  ConfigurationEntity,
  ConfigurationStatus,
  ConversationEntity,
  FileEntity,
  FileUploadStatus,
  MessageEntity,
  UserEntity,
} from '../../domain/database/index.js';
import { buildClient } from '../../domain/files/use-cases/utils.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationDto } from './dtos/index.js';

vi.mock('../../domain/files/use-cases/utils.js', () => ({
  buildClient: vi.fn(),
}));

describe('Conversations', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let controller: ConversationsController;
  let user: UserEntity;
  let configuration: ConfigurationEntity;
  let bucket: BucketEntity;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(ConversationsController);

    const initialized = await initAppWithDataBaseAndValidUser(module);
    dataSource = initialized.dataSource;
    app = initialized.app;
    user = await dataSource.getRepository(UserEntity).findOneByOrFail({ id: initialized.user.id });
    configuration = await dataSource
      .getRepository(ConfigurationEntity)
      .save({ name: `Conversations ${randomUUID()}`, status: ConfigurationStatus.ENABLED });
    bucket = await dataSource.getRepository(BucketEntity).save({
      name: `Conversations ${randomUUID()}`,
      type: 'conversation',
      endpoint: 'http://localhost:1234',
      isDefault: false,
    });

    (buildClient as Mock).mockImplementation(() => ({
      duplicateEmbeddings: vi.fn().mockResolvedValue({}),
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  /** Creates a conversation of the user with a unique name, messages and a file. */
  const createConversation = (name = `Greetings ${randomUUID()}`) =>
    seedConversation(dataSource, { user, configuration, bucket, name });

  async function duplicate(conversationId: number) {
    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);
    return response.body as ConversationDto;
  }

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should retrieve conversation by id', async () => {
    const conversation = await createConversation();

    const response = await request(app.getHttpServer()).get(`/conversations/${conversation.id}`).expect(200);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).toBe(conversation.id);
    expect(typedBody.name).toBe(conversation.name);
  });
  it('should duplicate conversation', async () => {
    const conversation = await createConversation();

    const typedBody = await duplicate(conversation.id);

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversation.id); // must be a new ID
    expect(typedBody.name).toBe(`${conversation.name} (2)`);
  });
  it('should duplicate conversation twice with distinct names', async () => {
    const conversation = await createConversation();

    await duplicate(conversation.id);
    const typedBody = await duplicate(conversation.id);

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversation.id);
    expect(typedBody.name).toBe(`${conversation.name} (3)`);
  });
  it('should ignore conversations of other users when numbering duplicates', async () => {
    const conversation = await createConversation();
    const other = await createOtherUser(dataSource);
    await dataSource
      .getRepository(ConversationEntity)
      .save({ name: `${conversation.name} (2)`, configurationId: configuration.id, userId: other.id });

    const typedBody = await duplicate(conversation.id);

    expect(typedBody.name).toBe(`${conversation.name} (2)`);
  });

  it('should delete a conversation softly and restore it', async () => {
    const created = await dataSource
      .getRepository(ConversationEntity)
      .save({ name: 'To be restored', configurationId: configuration.id, userId: user.id });

    await request(app.getHttpServer()).delete(`/conversations/${created.id}`).expect(200);
    await request(app.getHttpServer()).get(`/conversations/${created.id}`).expect(404);
    const deleted = await dataSource.getRepository(ConversationEntity).findOne({ where: { id: created.id }, withDeleted: true });
    expect(deleted?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer()).post(`/conversations/${created.id}/restore`).expect(204);
    const restored = await request(app.getHttpServer()).get(`/conversations/${created.id}`).expect(200);
    expect((restored.body as ConversationDto).name).toBe('To be restored');
  });

  it('should not restore conversations of other users or after the restore period', async () => {
    const repository = dataSource.getRepository(ConversationEntity);
    const other = await createOtherUser(dataSource);
    const ofOther = await repository.save({ name: 'Other', configurationId: configuration.id, userId: other.id });
    await repository.softDelete({ id: ofOther.id });
    await request(app.getHttpServer()).post(`/conversations/${ofOther.id}/restore`).expect(403);

    const old = await repository.save({ name: 'Old', configurationId: configuration.id, userId: user.id });
    await repository.update({ id: old.id }, { deletedAt: new Date(Date.now() - 60 * 60 * 1000) });
    await request(app.getHttpServer()).post(`/conversations/${old.id}/restore`).expect(404);

    // deleting another conversation purges the conversations that cannot be restored anymore
    const next = await repository.save({ name: 'Next', configurationId: configuration.id, userId: user.id });
    await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(200);
    expect(await repository.findOne({ where: { id: old.id }, withDeleted: true })).toBeNull();
  });
});

function createOtherUser(dataSource: DataSource) {
  const id = randomUUID();
  return dataSource.getRepository(UserEntity).save({ id, name: 'other', email: `other-${id}@example.com` });
}

async function seedConversation(
  dataSource: DataSource,
  {
    user,
    configuration,
    bucket,
    name,
  }: { user: UserEntity; configuration: ConfigurationEntity; bucket: BucketEntity; name: string },
) {
  const conversation = await dataSource.getRepository(ConversationEntity).save({ configuration, user, name });
  const file = await createFiles(dataSource.getRepository(FileEntity), bucket);
  await createConversationFiles(dataSource.getRepository(ConversationFileEntity), conversation.id, file.id);
  await createMessages(dataSource.getRepository(MessageEntity), conversation.id, configuration.id);
  return conversation;
}

function createMessages(
  messageRepository: Repository<MessageEntity>,
  conversationId: number,
  configurationId: number,
): Promise<MessageEntity[]> {
  const messages = [];
  const message1 = new MessageEntity();
  message1.conversationId = conversationId;
  message1.configurationId = configurationId;
  message1.createdAt = new Date();
  message1.type = 'human';
  message1.data = `{"content":"hi","additional_kwargs":{},"response_metadata":{}}`;
  messages.push(message1);

  const message2 = new MessageEntity();
  message2.conversationId = conversationId;
  message2.configurationId = configurationId;
  message2.createdAt = new Date();
  message2.type = 'ai';
  message2.data = `{"content":"Hello! How can I assist you today?","tool_calls":[],"invalid_tool_calls":[],"additional_kwargs":{},"response_metadata":{}}`;
  messages.push(message2);

  return messageRepository.save(messages);
}

function createFiles(fileRepository: Repository<FileEntity>, bucketEntity: BucketEntity): Promise<FileEntity> {
  const fileEntity = new FileEntity();
  fileEntity.mimeType = 'application/pdf';
  fileEntity.fileName = 'test.pdf';
  fileEntity.fileSize = 1024;
  fileEntity.uploadStatus = FileUploadStatus.Successful;
  fileEntity.bucket = bucketEntity;

  return fileRepository.save(fileEntity);
}

function createConversationFiles(
  conversationFileRepository: Repository<ConversationFileEntity>,
  conversationId: number,
  fileId: number,
): Promise<ConversationFileEntity> {
  const conversationFileEntity = new ConversationFileEntity();
  conversationFileEntity.conversationId = conversationId;
  conversationFileEntity.fileId = fileId;

  return conversationFileRepository.save(conversationFileEntity);
}
