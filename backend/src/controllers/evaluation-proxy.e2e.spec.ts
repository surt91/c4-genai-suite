import { randomUUID } from 'crypto';
import * as http from 'http';
import { AddressInfo } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { BUILTIN_USER_GROUP_ADMIN, UserEntity, UserGroupEntity } from '../domain/database';
import { hashApiKey } from '../lib';

const ADMIN_KEY = `admin-${randomUUID()}`;

describe('Eval service proxy', () => {
  let app: INestApplication<http.Server>;
  let upstream: http.Server;
  let received: { method?: string; url?: string; contentType?: string; body: string };

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        received = { method: req.method, url: req.url, contentType: req.headers['content-type'], body };
        res.setHeader('Content-Type', 'application/json');
        res.end('{"ok":true}');
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    process.env.EVAL_SERVICE_URL = `http://localhost:${(upstream.address() as AddressInfo).port}`;

    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const dataSource = module.get<DataSource>(getDataSourceToken());
    const adminGroup = await dataSource
      .getRepository(UserGroupEntity)
      .save({ id: BUILTIN_USER_GROUP_ADMIN, name: 'Admin', isAdmin: true, isBuiltIn: true });
    await dataSource.getRepository(UserEntity).save({
      id: randomUUID(),
      name: 'Admin',
      email: `admin-${randomUUID()}@example.com`,
      apiKey: hashApiKey(ADMIN_KEY),
      userGroups: [adminGroup],
    });
  }, 30000);

  afterAll(async () => {
    delete process.env.EVAL_SERVICE_URL;
    await app.close();
    await new Promise((resolve) => upstream.close(resolve));
  });

  const proxy = () => request(app.getHttpServer());

  it('forwards multipart bodies unchanged', async () => {
    await proxy()
      .post('/api/eval/qa-catalog/upload')
      .set('x-api-key', ADMIN_KEY)
      .attach('file', Buffer.from('question;answer'), 'catalog.csv')
      .expect(200, { ok: true });

    expect(received.url).toBe('/qa-catalog/upload');
    expect(received.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(received.body).toContain('question;answer');
    expect(received.body).toContain('filename="catalog.csv"');
  });

  it('forwards JSON bodies and repeated query parameters', async () => {
    await proxy().post('/api/eval/runs?tag=a&tag=b').set('x-api-key', ADMIN_KEY).send({ name: 'run' }).expect(200, { ok: true });

    expect(received.url).toBe('/runs?tag=a&tag=b');
    expect(JSON.parse(received.body)).toEqual({ name: 'run' });
  });
});
