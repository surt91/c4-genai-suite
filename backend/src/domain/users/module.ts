import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/index.js';
import { FileEntity, UserEntity, UserGroupEntity } from '../database/index.js';
import {
  CreateUserGroupHandler,
  CreateUserHandler,
  DeleteUserGroupHandler,
  DeleteUserHandler,
  GetUserGroupsHandler,
  GetUserHandler,
  GetUsersHandler,
  UpdateUserGroupHandler,
  UpdateUserHandler,
} from './use-cases/index.js';

@Module({
  imports: [AuditLogModule, CqrsModule, TypeOrmModule.forFeature([FileEntity, UserEntity, UserGroupEntity])],
  providers: [
    CreateUserGroupHandler,
    CreateUserHandler,
    DeleteUserGroupHandler,
    DeleteUserHandler,
    GetUserGroupsHandler,
    GetUserHandler,
    GetUsersHandler,
    UpdateUserGroupHandler,
    UpdateUserHandler,
  ],
})
export class UsersModule {}
