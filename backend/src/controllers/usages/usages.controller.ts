import { Controller, Get, ParseEnumPipe, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard, Role, RoleGuard } from '../../domain/auth/index.js';
import { GetMessagesCount, GetMessagesCountResponse, GetUsersCount, GetUsersCountResponse } from '../../domain/chat/index.js';
import { GroupBy } from '../../domain/chat/statistics.js';
import {
  GetAssistantsCount,
  GetAssistantsCountResponse,
  GetRatings,
  GetRatingsResponse,
  GetUsage,
  GetUsageResponse,
} from '../../domain/chat/use-cases/index.js';
import { BUILTIN_USER_GROUP_ADMIN } from '../../domain/database/index.js';
import { ParseDatePipe } from '../shared.js';
import { AssistantsCountsDto, MessagesCountsDto, RatingsDto, UsagesDto, UsersCountsDto } from './dtos/index.js';

@Controller('usages')
@ApiTags('usages')
@UseGuards(LocalAuthGuard)
export class UsagesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('tokens')
  @ApiOperation({ operationId: 'getTokenUsage', description: 'Gets the token usage.' })
  @ApiOkResponse({ type: UsagesDto })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Since when should the results be shown',
    type: Date,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group the results by day, week, or month',
    enum: GroupBy,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getTokenUsage(
    @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
    @Query('groupBy', new ParseEnumPipe(GroupBy, { optional: true })) groupBy: GroupBy = GroupBy.Day,
  ) {
    const result: GetUsageResponse = await this.queryBus.execute(new GetUsage(since, groupBy));
    return UsagesDto.fromDomain(result.usage);
  }

  @Get('ratings')
  @ApiOperation({ operationId: 'getRatings', description: 'Gets the ratings over time.' })
  @ApiOkResponse({ type: RatingsDto })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Since when should the results be shown',
    type: Date,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group the results by day, week, or month',
    enum: GroupBy,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getRatings(
    @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
    @Query('groupBy', new ParseEnumPipe(GroupBy, { optional: true })) groupBy: GroupBy = GroupBy.Day,
  ) {
    const result: GetRatingsResponse = await this.queryBus.execute(new GetRatings(since, groupBy));
    return RatingsDto.fromDomain(result.ratings);
  }

  @Get('messages-count')
  @ApiOperation({ operationId: 'getMessagesCount', description: 'Retrieve the total count of messages' })
  @ApiOkResponse({ type: MessagesCountsDto })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Since when should the results be shown',
    type: Date,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group the results by day, week, or month',
    enum: GroupBy,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getMessagesCount(
    @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
    @Query('groupBy', new ParseEnumPipe(GroupBy, { optional: true })) groupBy: GroupBy = GroupBy.Day,
  ) {
    const result: GetMessagesCountResponse = await this.queryBus.execute(new GetMessagesCount(since, groupBy));
    return MessagesCountsDto.fromDomain(result.requests);
  }

  @Get('users-count')
  @ApiOperation({ operationId: 'getUsersCount', description: 'Retrieve the total count of users per day, week or month' })
  @ApiOkResponse({ type: UsersCountsDto })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Since when should the results be shown',
    type: Date,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group the results by day, week, or month',
    enum: GroupBy,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getUsersCount(
    @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
    @Query('groupBy', new ParseEnumPipe(GroupBy, { optional: true })) groupBy: GroupBy = GroupBy.Day,
  ) {
    const result: GetUsersCountResponse = await this.queryBus.execute(new GetUsersCount(since, groupBy));
    return UsersCountsDto.fromDomain(result.requests);
  }

  @Get('assistants-count')
  @ApiOperation({
    operationId: 'getAssistantsCount',
    description: 'Retrieve the total count of assistant requests per day, week or month',
  })
  @ApiOkResponse({ type: AssistantsCountsDto })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Since when should the results be shown',
    type: Date,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group the results by day, week, or month',
    enum: GroupBy,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getAssistantsCount(
    @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
    @Query('groupBy', new ParseEnumPipe(GroupBy, { optional: true })) groupBy: GroupBy = GroupBy.Day,
  ) {
    const result: GetAssistantsCountResponse = await this.queryBus.execute(new GetAssistantsCount(since, groupBy));
    return AssistantsCountsDto.fromDomain(result.result);
  }
}
