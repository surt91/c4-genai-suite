/**
 * Authorization tests with the real guards: an admin and a regular user authenticate with API keys.
 */
import { randomUUID } from 'crypto';
import { Server } from 'net';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { SendMessage } from '../domain/chat';
import {
  BucketEntity,
  BUILTIN_USER_GROUP_ADMIN,
  BUILTIN_USER_GROUP_DEFAULT,
  ConfigurationEntity,
  ConfigurationStatus,
  ConversationEntity,
  FileEntity,
  FileUploadStatus,
  UserEntity,
  UserGroupEntity,
} from '../domain/database';
import { User } from '../domain/users';
import { buildUser } from '../domain/users/use-cases/utils';
import { hashApiKey } from '../lib';

const ADMIN_KEY = `admin-${randomUUID()}`;
const USER_KEY = `user-${randomUUID()}`;

describe('Authorization', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let queryBus: QueryBus;

  let alice: UserEntity;
  let bob: UserEntity;
  let configuration: ConfigurationEntity;
  let bucket: BucketEntity;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = module.get<DataSource>(getDataSourceToken());
    queryBus = module.get(QueryBus);

    const groups = dataSource.getRepository(UserGroupEntity);
    const adminGroup = await groups.save({ id: BUILTIN_USER_GROUP_ADMIN, name: 'Admin', isAdmin: true, isBuiltIn: true });
    const defaultGroup = await groups.save({ id: BUILTIN_USER_GROUP_DEFAULT, name: 'Default', isAdmin: false, isBuiltIn: true });

    const users = dataSource.getRepository(UserEntity);
    const createUser = (name: string, group: UserGroupEntity, apiKey?: string) =>
      users.save({
        id: randomUUID(),
        name,
        email: `${name}-${randomUUID()}@example.com`,
        apiKey: apiKey ? hashApiKey(apiKey) : undefined,
        userGroups: [group],
      });
    await createUser('admin', adminGroup, ADMIN_KEY);
    alice = await createUser('alice', defaultGroup, USER_KEY);
    bob = await createUser('bob', defaultGroup);

    configuration = await dataSource.getRepository(ConfigurationEntity).save({
      name: `Assistant ${randomUUID()}`,
      description: '',
      status: ConfigurationStatus.ENABLED,
      executorEndpoint: 'http://executor.internal',
      executorHeaders: 'Authorization=Bearer executor-secret',
    });

    bucket = await dataSource.getRepository(BucketEntity).save({
      name: `Bucket ${randomUUID()}`,
      type: 'conversation',
      endpoint: 'http://reis.internal',
      headers: 'Authorization=Bearer reis-secret',
      isDefault: false,
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('SendMessage', () => {
    it('rejects files of other users', async () => {
      const conversation = await dataSource
        .getRepository(ConversationEntity)
        .save({ name: 'Alice chat', configurationId: configuration.id, userId: alice.id });
      const bobsFile = await dataSource.getRepository(FileEntity).save({
        fileName: 'secret.pdf',
        fileSize: 1,
        mimeType: 'application/pdf',
        uploadStatus: FileUploadStatus.Successful,
        bucketId: bucket.id,
        userId: bob.id,
      });

      const aliceUser: User = buildUser(alice);
      await expect(
        queryBus.execute(new SendMessage(conversation.id, aliceUser, 'hi', [{ id: bobsFile.id, fileName: 'secret.pdf' }])),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
