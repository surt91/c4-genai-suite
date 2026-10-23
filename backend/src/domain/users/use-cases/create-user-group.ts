import { randomUUID } from 'crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { assignDefined } from '../../../lib/index.js';
import { AuditLogService, PerformedBy } from '../../audit-log/index.js';
import { UserGroupEntity, UserGroupRepository } from '../../database/index.js';
import { UserGroup } from '../interfaces.js';
import { buildUserGroup, buildUserGroupSnapshot } from './utils.js';

type Values = Pick<UserGroup, 'monthlyTokens' | 'monthlyUserTokens' | 'name'>;

export class CreateUserGroup {
  constructor(
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateUserGroupResponse {
  constructor(public readonly userGroup: UserGroup) {}
}

@CommandHandler(CreateUserGroup)
export class CreateUserGroupHandler implements ICommandHandler<CreateUserGroup, CreateUserGroupResponse> {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(request: CreateUserGroup): Promise<CreateUserGroupResponse> {
    const { values, performedBy } = request;
    const { monthlyTokens, monthlyUserTokens, name } = values;

    const entity = this.userGroups.create({ id: randomUUID() });

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { monthlyTokens, monthlyUserTokens, name });

    // Use the save method otherwise we would not get previous values.
    const created = await this.userGroups.save(entity);
    const result = buildUserGroup(created);

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: created.id,
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildUserGroupSnapshot(result),
    });

    return new CreateUserGroupResponse(result);
  }
}
