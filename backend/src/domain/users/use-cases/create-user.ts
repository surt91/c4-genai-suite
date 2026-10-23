import { randomUUID } from 'crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { assignDefined, hashApiKey } from '../../../lib/index.js';
import { AuditLogService, PerformedBy } from '../../audit-log/index.js';
import { UserEntity, UserGroupEntity, UserRepository } from '../../database/index.js';
import { User } from '../interfaces.js';
import { buildUser, buildUserSnapshot } from './utils.js';

type Values = Pick<User, 'apiKey' | 'email' | 'name' | 'userGroupIds'> & { password?: string };

export class CreateUser {
  constructor(
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateUserResponse {
  constructor(public readonly user: User) {}
}

@CommandHandler(CreateUser)
export class CreateUserHandler implements ICommandHandler<CreateUser, CreateUserResponse> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(request: CreateUser): Promise<CreateUserResponse> {
    const { values, performedBy } = request;
    const { apiKey, email, name, password, userGroupIds } = values;

    const entity = this.users.create({ id: randomUUID() });

    if (password) {
      entity.passwordHash = await bcrypt.hash(password, 10);
    }

    if (apiKey) {
      entity.apiKey = hashApiKey(apiKey);
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { email, name });
    if (userGroupIds && userGroupIds.length > 0) {
      entity.userGroups = userGroupIds.map((id) => ({ id }) as UserGroupEntity);
    } else {
      entity.userGroups = [];
    }

    // Use the save method otherwise we would not get previous values.
    const created = await this.users.save(entity);
    const result = buildUser(created);

    await this.auditLogService.createAuditLog({
      entityType: 'user',
      entityId: created.id,
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildUserSnapshot(result),
    });

    return new CreateUserResponse(result);
  }
}
