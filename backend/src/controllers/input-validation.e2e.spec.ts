import { createHash, randomUUID } from 'crypto';
import { Server } from 'net';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { configureCookies, configureSession, configureValidation } from '../config/index.js';
import { BUILTIN_USER_GROUP_ADMIN, UserEntity, UserGroupEntity } from '../domain/database/index.js';
import { GetConfigurations, GetConfigurationsResponse } from '../domain/extensions/index.js';
import { ResponseCreateDto } from './responses/dtos/index.js';

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

  it('POST /conversations rejects starting a conversation without any assistant with 409', async () => {
    // the database of the worker is shared with other test files, so pretend that there is no assistant
    const queryBus = app.get(QueryBus);
    const execute = queryBus.execute.bind(queryBus) as (query: unknown) => Promise<unknown>;
    const spy = vi
      .spyOn(queryBus, 'execute')
      .mockImplementation((query: unknown) =>
        query instanceof GetConfigurations ? Promise.resolve(new GetConfigurationsResponse([])) : execute(query),
      );
    try {
      const response = await api('post', '/conversations').send({}).expect(HttpStatus.CONFLICT);
      expect((response.body as { message: string }).message).toBe('There is no assistant to start a conversation with.');
    } finally {
      spy.mockRestore();
    }
  });

  describe('buckets', () => {
    it('POST /buckets/:id/files rejects a request without a file with 400', async () => {
      await api('post', '/buckets/1/files').field('other', 'x').expect(HttpStatus.BAD_REQUEST);
      await api('post', '/buckets/1/files').attach('other', Buffer.from('x'), 'a.txt').expect(HttpStatus.BAD_REQUEST);
      await api('post', '/buckets/1/files').send({}).expect(HttpStatus.BAD_REQUEST);
    });

    it.each([
      ['no endpoint', {}],
      ['an empty endpoint', { endpoint: '' }],
      ['multiple endpoints', { endpoint: ['http://a', 'http://b'] }],
      ['multiple headers', { endpoint: 'http://a', headers: ['a=b', 'c=d'] }],
    ])('GET /buckets/fileTypes rejects %s with 400', async (_, query) => {
      await api('get', '/buckets/fileTypes').query(query).expect(HttpStatus.BAD_REQUEST);
    });

    it('rejects an unreachable RAG server with 400', async () => {
      // nothing listens on port 1
      const endpoint = 'http://127.0.0.1:1';
      const fileTypes = await api('get', '/buckets/fileTypes').query({ endpoint }).expect(HttpStatus.BAD_REQUEST);
      expect((fileTypes.body as { message: string }).message).toContain(`The RAG server at '${endpoint}' could not be reached`);
      await api('get', '/buckets/fileTypes').query({ endpoint: 'not a url' }).expect(HttpStatus.BAD_REQUEST);
      await api('post', '/buckets/test').send({ endpoint }).expect(HttpStatus.BAD_REQUEST);
    });
  });

  it.each(['/users', '/audit-logs', '/buckets/1/files', '/user-files'])(
    'GET %s rejects invalid paging with 400',
    async (path) => {
      for (const query of [{ page: '-1' }, { pageSize: '-1' }, { page: '99999999999', pageSize: '99999999999' }, { page: 'x' }]) {
        await api('get', path).query(query).expect(HttpStatus.BAD_REQUEST);
      }
      // valid paging passes the validation (the result may be 404, e.g. there is no bucket 1)
      const valid = await api('get', path).query({ page: '0', pageSize: '10' });
      expect(valid.status).not.toBe(HttpStatus.BAD_REQUEST);
    },
  );

  it.each([
    ['tokens of the wrong type', { monthlyTokens: 'x' }],
    ['user tokens of the wrong type', { monthlyUserTokens: '' }],
    ['negative tokens', { monthlyTokens: -1 }],
    ['too many tokens', { monthlyTokens: 1e12 }],
  ])('POST /user-groups rejects %s with 400', async (_, body) => {
    await api('post', '/user-groups')
      .send({ name: `input-validation-${randomUUID()}`, ...body })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('POST /configurations/import rejects data that is no object with 400', async () => {
    await api('post', '/configurations/import').send({ data: [] }).expect(HttpStatus.BAD_REQUEST);
  });

  describe('POST /public/assistants/:id/responses', () => {
    it.each([
      ['an empty body', undefined],
      ['an empty object', {}],
      ['an input of the wrong type', { input: 1 }],
      ['an input object', { input: { role: 'user', content: 'hi' } }],
      ['an input item that is no object', { input: [1] }],
      ['a null input item', { input: [null] }],
      ['an input item that is an array', { input: [[]] }],
      ['an input item without content', { input: [{ role: 'user' }] }],
      ['an input item with an unknown role', { input: [{ role: 'x', content: 'hi' }] }],
      ['an input item with an unknown type', { input: [{ role: 'user', content: 'hi', type: 'x' }] }],
      ['content of the wrong type', { input: [{ role: 'user', content: 1 }] }],
      ['a null content part', { input: [{ role: 'user', content: [null] }] }],
      ['a content part without type', { input: [{ role: 'user', content: [{ text: 'hi' }] }] }],
      ['a content part of an unknown type', { input: [{ role: 'user', content: [{ type: 'x' }] }] }],
      ['a text part without text', { input: [{ role: 'user', content: [{ type: 'input_text' }] }] }],
      ['an image part without detail', { input: [{ role: 'user', content: [{ type: 'input_image', file_id: '1' }] }] }],
      ['a file part with data of the wrong type', { input: [{ role: 'user', content: [{ type: 'input_file', file_data: 1 }] }] }],
      ['a model of the wrong type', { model: 1, input: 'hi' }],
      ['a temperature of the wrong type', { input: 'hi', temperature: 'hot' }],
      ['instructions of the wrong type', { input: 'hi', instructions: [] }],
    ])('rejects %s with 400', async (_, body) => {
      // the assistant is checked by the handler after the validation, so any id is fine
      const response = await api('post', '/public/assistants/1/responses').send(body).expect(HttpStatus.BAD_REQUEST);
      expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    });

    it.each([
      ['a string input', { input: 'hi' }],
      ['all options', { model: 'gpt-4o', input: 'hi', instructions: 'Be brief.', temperature: 0.5, stream: false, store: true }],
      [
        'messages',
        {
          input: [
            { role: 'system', content: 'Be brief.' },
            { role: 'user', content: 'hi', type: 'message' },
          ],
        },
      ],
      [
        'content parts',
        {
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: 'hi' },
                { type: 'input_image', detail: 'auto', file_id: '1', image_url: null },
                { type: 'input_file', file_data: 'data:text/plain;base64,aGk=', filename: 'a.txt' },
                { type: 'input_file', file_id: '1' },
              ],
            },
          ],
        },
      ],
    ])('accepts %s', async (_, body) => {
      await expect(new ValidationPipe().transform(body, { type: 'body', metatype: ResponseCreateDto })).resolves.toEqual(body);
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

    it('POST /conversations starts a conversation with the default assistant without a body', async () => {
      await api('post', '/conversations').expect(201);
    });

    it.each([
      ['a null assistant', { configurationId: null }],
      ['an assistant id of the wrong type', { configurationId: 'x' }],
      ['a null isNameSetManually', { isNameSetManually: null }],
    ])('PATCH /conversations/:id rejects %s with 400', async (_, body) => {
      await api('patch', `/conversations/${conversationId}`).send(body).expect(HttpStatus.BAD_REQUEST);
    });

    it('PATCH /conversations/:id accepts a request without a body', async () => {
      await api('patch', `/conversations/${conversationId}`).expect(HttpStatus.OK);
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
