import { createHash, randomUUID } from 'crypto';
import { Server } from 'net';
import { HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { configureCookies, configureSession, configureValidation } from '../config/index.js';
import { BUILTIN_USER_GROUP_ADMIN, UserEntity, UserGroupEntity } from '../domain/database/index.js';

const PASSWORD = 'Password1!';

/**
 * Since TypeORM 1, `undefined` (and invalid values) in a `where` condition are no longer ignored but throw, i.e. missing
 * or invalid input must be rejected with 400 before it reaches the database instead of ending in a 500.
 */
describe('Input validation', () => {
  let app: NestExpressApplication;
  let server: Server;
  const apiKey = `input-validation-${randomUUID()}`;
  const email = `input-validation-${randomUUID()}@example.com`;

  const api = (method: 'get' | 'post' | 'put' | 'patch', path: string) =>
    request(server)[method](path).set('x-api-key', apiKey).set('X-Forwarded-Proto', 'https');

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    configureValidation(app);
    await app.init();
    server = app.getHttpServer();

    const dataSource = module.get<DataSource>(getDataSourceToken());
    const adminGroup = await dataSource
      .getRepository(UserGroupEntity)
      .save({ id: BUILTIN_USER_GROUP_ADMIN, name: 'Admin', isAdmin: true, isBuiltIn: true });
    await dataSource.getRepository(UserEntity).save({
      id: randomUUID(),
      name: 'Input Validation User',
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      apiKey: createHash('sha256').update(apiKey).digest('hex'),
      userGroups: [adminGroup],
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it.each([
      ['an empty body', {}],
      ['no email', { password: PASSWORD }],
      ['no password', { email }],
      ['an empty email', { email: '', password: PASSWORD }],
      ['an email of the wrong type', { email: 1, password: PASSWORD }],
      ['a password of the wrong type', { email, password: 2 }],
      ['an array body', []],
    ])('rejects %s with 400', async (_, body) => {
      await request(server).post('/auth/login').send(body).expect(HttpStatus.BAD_REQUEST);
    });

    it('still logs in with valid credentials and rejects a wrong password with 401', async () => {
      await request(server).post('/auth/login').set('X-Forwarded-Proto', 'https').send({ email, password: PASSWORD }).expect(201);
      await request(server).post('/auth/login').send({ email, password: 'wrong' }).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /user-files', () => {
    it.each(['abc', '1.5'])('rejects the conversationId %s with 400', async (conversationId) => {
      await api('get', '/user-files').query({ conversationId }).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('with an assistant', () => {
    let configurationId: number;
    let conversationId: number;

    beforeAll(async () => {
      const configuration = await api('post', '/configurations')
        .send({ name: `input-validation-${randomUUID()}`, description: 'test', enabled: true })
        .expect(201);
      configurationId = (configuration.body as { id: number }).id;
      const conversation = await api('post', '/conversations').send({ configurationId }).expect(201);
      conversationId = (conversation.body as { id: number }).id;
    });

    it('GET /configurations/:id/checkBucketAvailability/:type rejects an unknown type with 400', async () => {
      await api('get', `/configurations/${configurationId}/checkBucketAvailability/general`).expect(HttpStatus.BAD_REQUEST);
      await api('get', `/configurations/${configurationId}/checkBucketAvailability/unknown`).expect(HttpStatus.BAD_REQUEST);
      await api('get', `/configurations/${configurationId}/checkBucketAvailability/user`).expect(HttpStatus.OK);
    });

    it.each([
      ['a file without id', [{}]],
      ['a file id of the wrong type', [{ id: 'abc' }]],
      ['a null file', [null]],
      ['files that are no array', { id: 1 }],
      ['files of the wrong type', 'x'],
    ])('POST/PUT messages reject %s with 400', async (_, files) => {
      await api('post', `/conversations/${conversationId}/messages/sse`)
        .send({ query: 'Hello', files })
        .expect(HttpStatus.BAD_REQUEST);
      await api('put', `/conversations/${conversationId}/messages/1/sse`)
        .send({ query: 'Hello', files })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
