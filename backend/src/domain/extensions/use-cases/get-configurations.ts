import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { BUILTIN_USER_GROUP_ADMIN, ConfigurationEntity, ConfigurationRepository, ConfigurationStatus } from 'src/domain/database';
import { User } from 'src/domain/users';
import { ConfigurationModel } from '../interfaces';
import { ExplorerService } from '../services';
import { buildConfiguration } from './utils';

/** Admins can use every configuration, other users those without user groups or with one of their groups. */
export function hasUserGroupAccess(user: Pick<User, 'userGroupIds'>, configurationUserGroupIds: string[] | undefined) {
  return (
    !!user.userGroupIds?.includes(BUILTIN_USER_GROUP_ADMIN) ||
    !configurationUserGroupIds?.length ||
    !!user.userGroupIds?.some((id) => configurationUserGroupIds.includes(id))
  );
}

export class GetConfigurations {
  constructor(
    public readonly user: User,
    public readonly enabled: boolean,
    public readonly withExtensions: boolean = false,
  ) {}
}

export class GetConfigurationsResponse {
  constructor(public readonly configurations: ConfigurationModel[]) {}
}

@QueryHandler(GetConfigurations)
export class GetConfigurationsHandler implements IQueryHandler<GetConfigurations, GetConfigurationsResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    private readonly extensionExplorer: ExplorerService,
  ) {}

  async execute(request: GetConfigurations): Promise<GetConfigurationsResponse> {
    const { enabled, user, withExtensions } = request;

    let entities = await this.configurations.find({
      where: { status: Not(ConfigurationStatus.DELETED) },
      order: {
        name: 'ASC',
      },
      relations: withExtensions ? ['extensions'] : [],
    });
    entities = entities.filter((e) => hasUserGroupAccess(user, e.userGroupIds));

    if (enabled) {
      entities = entities.filter((e) => e.status === ConfigurationStatus.ENABLED);
    }

    const result = await Promise.all(entities.map((e) => buildConfiguration(e, this.extensionExplorer, withExtensions, enabled)));
    return new GetConfigurationsResponse(result);
  }
}
