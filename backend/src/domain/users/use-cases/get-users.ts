import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Raw } from 'typeorm';
import { UserEntity, UserRepository } from 'src/domain/database';
import { User } from '../interfaces';
import { buildUser } from './utils';

export class GetUsers {
  constructor(
    public readonly page = 0,
    public readonly pageSize = 10,
    public readonly query?: string,
  ) {}
}

export class GetUsersResponse {
  constructor(
    public readonly users: User[],
    public readonly total: number,
  ) {}
}

@QueryHandler(GetUsers)
export class GetUsersHandler implements IQueryHandler<GetUsers, GetUsersResponse> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
  ) {}

  async execute(query: GetUsers): Promise<GetUsersResponse> {
    const { page, pageSize, query: searchQuery } = query;

    // A stable order is needed for the pagination.
    const options: FindManyOptions<UserEntity> = { order: { name: 'ASC', id: 'ASC' } };

    if (searchQuery && searchQuery != '') {
      const contains = () =>
        Raw((alias) => `LOWER(${alias}) LIKE :userQuery ESCAPE '\\'`, {
          userQuery: `%${searchQuery.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`,
        });
      // the API documents the query as e-mail search, the UI shows names: search both
      options.where = [{ name: contains() }, { email: contains() }];
    }

    const total = await this.users.count(options);

    options.skip = pageSize * page;
    options.take = pageSize;

    const entities = await this.users.find(options);
    const result = entities.map(buildUser);

    return new GetUsersResponse(result, total);
  }
}
