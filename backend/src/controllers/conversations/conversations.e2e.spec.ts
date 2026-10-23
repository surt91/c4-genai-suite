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
import { schema } from '../../domain/database/typeorm.helper.js';
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

  let conversationId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(ConversationsController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await cleanDatabase(dataSource);
    const conversation = await seedTestData(dataSource);
    conversationId = conversation.id;

    (buildClient as Mock).mockImplementation(() => ({
      duplicateEmbeddings: vi.fn().mockResolvedValue({}),
    }));
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should retrieve conversation by id', async () => {
    const response = await request(app.getHttpServer()).get('/conversations/1').expect(200);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).toBe(1);
    expect(typedBody.name).toBe('Greetings Exchange');
  });
  it('should duplicate conversation', async () => {
    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversationId); // must be a new ID
    expect(typedBody.name).toBe('Greetings Exchange (2)');
  });
  it('should duplicate conversation twice with distinct names', async () => {
    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversationId);
    expect(typedBody.name).toBe('Greetings Exchange (3)');
  });
  it('should ignore conversations of other users when numbering duplicates', async () => {
    const other = await dataSource.getRepository(UserEntity).save({ id: 'other', name: 'other', email: 'other@example.com' });
    await dataSource
      .getRepository(ConversationEntity)
      .save({ name: 'Greetings Exchange (4)', configurationId: 1, userId: other.id });

    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);

    expect((response.body as ConversationDto).name).toBe('Greetings Exchange (4)');
  });

  it('should delete a conversation softly and restore it', async () => {
    const created = await dataSource
      .getRepository(ConversationEntity)
      .save({ name: 'To be restored', configurationId: 1, userId: '1' });

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
    const ofOther = await repository.save({ name: 'Other', configurationId: 1, userId: 'other' });
    await repository.softDelete({ id: ofOther.id });
    await request(app.getHttpServer()).post(`/conversations/${ofOther.id}/restore`).expect(403);

    const old = await repository.save({ name: 'Old', configurationId: 1, userId: '1' });
    await repository.update({ id: old.id }, { deletedAt: new Date(Date.now() - 60 * 60 * 1000) });
    await request(app.getHttpServer()).post(`/conversations/${old.id}/restore`).expect(404);

    // deleting another conversation purges the conversations that cannot be restored anymore
    const next = await repository.save({ name: 'Next', configurationId: 1, userId: '1' });
    await request(app.getHttpServer()).delete(`/conversations/${next.id}`).expect(200);
    expect(await repository.findOne({ where: { id: old.id }, withDeleted: true })).toBeNull();
  });
});

async function cleanDatabase(dataSource: DataSource) {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE ${schema}."${entity.tableName}" RESTART IDENTITY CASCADE`);
  }
}

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  const configurationRepository = dataSource.getRepository(ConfigurationEntity);
  const conversationRepository = dataSource.getRepository(ConversationEntity);
  const messageRepository = dataSource.getRepository(MessageEntity);
  const fileRepository = dataSource.getRepository(FileEntity);
  const conversationFileRepository = dataSource.getRepository(ConversationFileEntity);
  const bucketRepository = dataSource.getRepository(BucketEntity);

  const userEntity = await createUser(userRepository);
  const configurationEntity = await createConfiguration(configurationRepository);

  const conversation = await createConversationEntity(conversationRepository, configurationEntity, userEntity);
  const bucketEntity = await createBucket(bucketRepository);
  const file = await createFiles(fileRepository, conversation.id, bucketEntity);
  await createConversationFiles(conversationFileRepository, conversation.id, file.id);
  await createMessages(messageRepository, conversation.id, configurationEntity.id);

  return conversation;
}

function createConfiguration(configurationRepository: Repository<ConfigurationEntity>): Promise<ConfigurationEntity> {
  const configurationEntity = new ConfigurationEntity();
  configurationEntity.name = 'Test Configuration';
  configurationEntity.status = ConfigurationStatus.ENABLED;

  return configurationRepository.save(configurationEntity);
}

function createUser(userRepository: Repository<UserEntity>): Promise<UserEntity> {
  const userEntity = new UserEntity();
  userEntity.id = '1';
  userEntity.name = 'test-user';
  userEntity.email = 'test@example.com';

  return userRepository.save(userEntity);
}

function createConversationEntity(
  conversationRepository: Repository<ConversationEntity>,
  configuration: ConfigurationEntity,
  user: UserEntity,
): Promise<ConversationEntity> {
  const conversationEntity = new ConversationEntity();
  conversationEntity.configuration = configuration;
  conversationEntity.user = user;
  conversationEntity.name = 'Greetings Exchange';

  return conversationRepository.save(conversationEntity);
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

function createFiles(
  fileRepository: Repository<FileEntity>,
  conversationId: number,
  bucketEntity: BucketEntity,
): Promise<FileEntity> {
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

function createBucket(bucketRepository: Repository<BucketEntity>): Promise<BucketEntity> {
  const bucketEntity = new BucketEntity();
  bucketEntity.id = 1;
  bucketEntity.name = 'Test Bucket';
  bucketEntity.type = 'conversation';
  bucketEntity.endpoint = 'http://localhost:1234';
  bucketEntity.isDefault = false;

  return bucketRepository.save(bucketEntity);
}
