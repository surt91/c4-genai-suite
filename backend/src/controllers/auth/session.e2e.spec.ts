import { randomUUID } from 'crypto';
import { Server } from 'net';
import { HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { configureCookies, configureSession } from '../../config';
import { BUILTIN_USER_GROUP_DEFAULT, UserEntity, UserGroupEntity } from '../../domain/database';

const PASSWORD = 'Password1!';

function getSessionCookie(response: request.Response): string | undefined {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith('connect.sid='))?.split(';')[0];
}

function sessionIdOf(cookie: string) {
  // connect.sid=s%3A<id>.<signature>
  return decodeURIComponent(cookie.substring('connect.sid='.length)).substring(2).split('.')[0];
}

describe('Session handling', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let server: Server;
  const email = `session-${randomUUID()}@example.com`;

  // The test BASE_URL may be https, i.e. the cookie is `Secure`; express-session (proxy: true) needs the forwarded proto.
  const post = (path: string) => request(server).post(path).set('X-Forwarded-Proto', 'https');
  const get = (path: string) => request(server).get(path).set('X-Forwarded-Proto', 'https');

  const login = async (cookie?: string) => {
    const req = post('/auth/login').send({ email, password: PASSWORD });
    if (cookie) {
      void req.set('Cookie', cookie);
    }
    const response = await req;
    expect(response.status).toBeLessThan(300);
    return response;
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    await app.init();
    server = app.getHttpServer() as Server;
    dataSource = module.get<DataSource>(getDataSourceToken());

    const defaultGroup = await dataSource
      .getRepository(UserGroupEntity)
      .save({ id: BUILTIN_USER_GROUP_DEFAULT, name: 'Default', isAdmin: false, isBuiltIn: true });
    await dataSource.getRepository(UserEntity).save({
      id: randomUUID(),
      name: 'Session User',
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      userGroups: [defaultGroup],
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('issues a new session id on login (no session fixation)', async () => {
    const first = getSessionCookie(await login());
    expect(first).toBeDefined();

    const second = getSessionCookie(await login(first));
    expect(second).toBeDefined();
    expect(sessionIdOf(second!)).not.toEqual(sessionIdOf(first!));

    // The session id known before the (second) login is no longer valid.
    await get('/auth/profile').set('Cookie', first!).expect(HttpStatus.UNAUTHORIZED);
    await get('/auth/profile').set('Cookie', second!).expect(HttpStatus.OK);
  });
});
