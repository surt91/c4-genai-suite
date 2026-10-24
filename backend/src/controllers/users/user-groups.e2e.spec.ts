import { randomUUID } from 'crypto';
import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module.js';
import {
  BUILTIN_USER_GROUP_ADMIN,
  BUILTIN_USER_GROUP_DEFAULT,
  UserEntity,
  UserGroupEntity,
} from '../../domain/database/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { UserGroupDto, UserGroupsDto } from './dtos/index.js';
import { UserGroupsController } from './user-groups.controller.js';

describe('User Group', () => {
  let controller: UserGroupsController;
  let app: INestApplication<Server>;
  let notRemovableGroup: UserGroupEntity;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(UserGroupsController);

    const initialized = await initAppWithDataBaseAndValidUser(module);
    app = initialized.app;
    notRemovableGroup = await seedTestData(initialized.dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUserGroup(name: string) {
    const newUserGroup = { name, monthlyTokens: 1000, monthlyUserTokens: 1000 };
    const response = await request(app.getHttpServer()).post('/user-groups').send(newUserGroup).expect(201);
    return response.body as UserGroupDto;
  }

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should get all user groups', async () => {
    const response = await request(app.getHttpServer()).get('/user-groups').expect(200);

    const typedBody = response.body as UserGroupsDto;

    expect(typedBody.items.map((x) => x.id)).toEqual(
      expect.arrayContaining([BUILTIN_USER_GROUP_ADMIN, BUILTIN_USER_GROUP_DEFAULT, notRemovableGroup.id]),
    );
  });
  it('should create user group', async () => {
    const name = `test-group-${randomUUID()}`;

    const typedBody = await createUserGroup(name);

    expect(typedBody.id).toBeDefined();
    expect(typedBody.name).toBe(name);
    expect(typedBody.monthlyTokens).toBe(1000);
    expect(typedBody.monthlyUserTokens).toBe(1000);
    expect(typedBody.isAdmin).toBe(false);
    expect(typedBody.isBuiltIn).toBe(false);
  });
  it('should update user group', async () => {
    const userGroupToUpdate = await createUserGroup(`test-group-${randomUUID()}`);

    const updatedUserGroup = {
      name: userGroupToUpdate.name,
      monthlyTokens: 2000,
      monthlyUserTokens: 2000,
    };

    const response = await request(app.getHttpServer())
      .put(`/user-groups/${userGroupToUpdate.id}`)
      .send(updatedUserGroup)
      .expect(200);

    const typedBody = response.body as UserGroupDto;
    expect(typedBody.id).toBe(userGroupToUpdate.id);
    expect(typedBody.name).toBe(updatedUserGroup.name);
    expect(typedBody.monthlyTokens).toBe(updatedUserGroup.monthlyTokens);
    expect(typedBody.monthlyUserTokens).toBe(updatedUserGroup.monthlyUserTokens);
    expect(typedBody.isAdmin).toBe(false);
    expect(typedBody.isBuiltIn).toBe(false);
  });
  it('should remove user group without users', async () => {
    const removableGroup = await createUserGroup(`removable-${randomUUID()}`);

    await request(app.getHttpServer()).delete(`/user-groups/${removableGroup.id}`).expect(200);
  });
  it('should not remove user group with users', async () => {
    const response = await request(app.getHttpServer()).delete(`/user-groups/${notRemovableGroup.id}`).expect(400);

    const typedBody = response.body as { message: string[] };
    expect(typedBody.message).toBe('Cannot delete a user group with existing users.');
  });
});

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  const userGroupRepository = dataSource.getRepository(UserGroupEntity);

  const notRemovableGroup = await createUserGroupEntity('not removable', userGroupRepository);
  await createUserEntities('user1', notRemovableGroup, userRepository);
  await createUserEntities('user2', notRemovableGroup, userRepository);
  return notRemovableGroup;
}

async function createUserEntities(
  name: string,
  userGroup: UserGroupEntity,
  userRepository: Repository<UserEntity>,
): Promise<UserEntity> {
  const userEntity = new UserEntity();
  userEntity.id = randomUUID();
  userEntity.name = name;
  userEntity.email = `${name}-${userEntity.id}@test.com`;
  userEntity.userGroups = [userGroup];
  return userRepository.save(userEntity);
}

async function createUserGroupEntity(name: string, userGroupRepository: Repository<UserGroupEntity>): Promise<UserGroupEntity> {
  const userGroupEntity: UserGroupEntity = new UserGroupEntity();
  userGroupEntity.id = randomUUID();
  userGroupEntity.name = `${name} ${userGroupEntity.id}`;
  return userGroupRepository.save(userGroupEntity);
}
