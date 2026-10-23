/**
 * Authorization tests with the real guards: an admin and a regular user authenticate with API keys.
 */
import { randomUUID } from 'crypto';
import { Server } from 'net';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
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
  ExtensionEntity,
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

  const asAdmin = (req: request.Test) => req.set('x-api-key', ADMIN_KEY);
  const asUser = (req: request.Test) => req.set('x-api-key', USER_KEY);
  const http = () => request(app.getHttpServer());

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

    it.each([
      ['restricted to another user group', { status: ConfigurationStatus.ENABLED, restricted: true }],
      ['disabled', { status: ConfigurationStatus.DISABLED, restricted: false }],
    ])('rejects messages to an assistant that is %s now', async (_, { status, restricted }) => {
      const group = await dataSource
        .getRepository(UserGroupEntity)
        .save({ id: randomUUID(), name: `Other ${randomUUID()}`, isAdmin: false, isBuiltIn: false });
      const assistant = await dataSource.getRepository(ConfigurationEntity).save({
        name: `Assistant ${randomUUID()}`,
        description: '',
        status,
        userGroups: restricted ? [group] : [],
      });
      const conversation = await dataSource
        .getRepository(ConversationEntity)
        .save({ name: 'Old chat', configurationId: assistant.id, userId: alice.id });

      await expect(queryBus.execute(new SendMessage(conversation.id, buildUser(alice), 'hi'))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('responses API', () => {
    it('does not accept files for assistants the user cannot access', async () => {
      const group = await dataSource
        .getRepository(UserGroupEntity)
        .save({ id: randomUUID(), name: `Other ${randomUUID()}`, isAdmin: false, isBuiltIn: false });
      const assistant = await dataSource.getRepository(ConfigurationEntity).save({
        name: `Assistant ${randomUUID()}`,
        description: '',
        status: ConfigurationStatus.ENABLED,
        userGroups: [group],
      });

      await asUser(
        http()
          .post(`/public/assistants/${assistant.id}/files`)
          .field('purpose', 'assistants')
          .attach('file', Buffer.from('x'), 'image.png'),
      ).expect(404);
      await asUser(http().post(`/public/assistants/${assistant.id}/responses`).send({ input: 'hi' })).expect(404);
    });
  });

  it('searches users by name and e-mail', async () => {
    type Users = { items: { id: string }[] };
    const byName = await asAdmin(http().get('/users?query=ALIC')).expect(200);
    expect((byName.body as Users).items.map((x) => x.id)).toEqual([alice.id]);

    const byEmail = await asAdmin(http().get(`/users?query=${encodeURIComponent(bob.email)}`)).expect(200);
    expect((byEmail.body as Users).items.map((x) => x.id)).toEqual([bob.id]);

    const wildcard = await asAdmin(http().get('/users?query=%25')).expect(200);
    expect((wildcard.body as Users).items).toEqual([]);
  });

  it('answers non-numeric ids with 400 instead of a database error', async () => {
    await asUser(http().get('/conversations/abc')).expect(400);
    await asAdmin(http().get('/configurations/abc')).expect(400);
  });

  it('rejects a password change of a user without password with 400', async () => {
    await asUser(http().put('/users/me/password').send({ password: 'new-password', currentPassword: 'guess' })).expect(400);
  });

  describe('user file uploads', () => {
    const createExtension = (name: string, values: Record<string, unknown>) =>
      dataSource.getRepository(ExtensionEntity).save({ name, enabled: true, values, configurationId: configuration.id });
    const upload = (extensionId: number, fileName: string, conversationId?: number) =>
      asUser(
        http()
          .post(`/user-files?extensionId=${extensionId}${conversationId ? `&conversationId=${conversationId}` : ''}`)
          .attach('file', Buffer.from('x'), fileName),
      );

    it('are only accepted by file extensions', async () => {
      const llm = await createExtension('calculator', {});
      await upload(llm.id, 'image.png').expect(404);
    });

    it('without bucket are restricted to the file types of the extension', async () => {
      const vision = await createExtension('files-vision', { fileNameExtensions: ['.png'], maxFiles: 3 });
      await upload(vision.id, 'payload.html').expect(400);
      await upload(vision.id, 'image.png').expect(201);
    });

    it('are not accepted for conversations of other users', async () => {
      const vision = await createExtension('files-vision', { fileNameExtensions: ['.png'], maxFiles: 3 });
      const bobsConversation = await dataSource
        .getRepository(ConversationEntity)
        .save({ name: 'Bob chat', configurationId: configuration.id, userId: bob.id });
      await upload(vision.id, 'image.png', bobsConversation.id).expect(403);
    });
  });

  describe('buckets (contain REI-S credentials)', () => {
    it('are not readable by regular users', async () => {
      await asUser(http().get('/buckets')).expect(403);
      await asUser(http().get(`/buckets/${bucket.id}`)).expect(403);
    });

    it('are readable by admins', async () => {
      const response = await asAdmin(http().get(`/buckets/${bucket.id}`)).expect(200);
      expect((response.body as { headers: string }).headers).toBe('Authorization=Bearer reis-secret');
    });
  });

  describe('extensions of a configuration (contain headers/endpoints)', () => {
    it('are not readable by regular users', async () => {
      await asUser(http().get(`/configurations/${configuration.id}/extensions`)).expect(403);
    });

    it('are readable by admins', async () => {
      await asAdmin(http().get(`/configurations/${configuration.id}/extensions`)).expect(200);
    });
  });

  describe('configuration list', () => {
    type Items = { items: { id: number; executorHeaders?: string; executorEndpoint?: string }[] };
    const find = (body: unknown) => (body as Items).items.find((x) => x.id === configuration.id)!;

    it('does not contain the executor credentials for regular users', async () => {
      const response = await asUser(http().get('/configurations')).expect(200);
      expect(find(response.body)).toBeDefined();
      expect(find(response.body).executorHeaders).toBeUndefined();
      expect(find(response.body).executorEndpoint).toBeUndefined();
    });

    it('contains the executor settings for admins', async () => {
      const response = await asAdmin(http().get('/configurations')).expect(200);
      expect(find(response.body).executorHeaders).toBe('Authorization=Bearer executor-secret');
    });

    it('treats enabled=false as false', async () => {
      const disabled = await dataSource
        .getRepository(ConfigurationEntity)
        .save({ name: `Disabled ${randomUUID()}`, description: '', status: ConfigurationStatus.DISABLED });

      const all = await asAdmin(http().get('/configurations?enabled=false')).expect(200);
      expect((all.body as Items).items.some((x) => x.id === disabled.id)).toBe(true);

      const enabled = await asAdmin(http().get('/configurations?enabled=true')).expect(200);
      expect((enabled.body as Items).items.some((x) => x.id === disabled.id)).toBe(false);
    });
  });
});
