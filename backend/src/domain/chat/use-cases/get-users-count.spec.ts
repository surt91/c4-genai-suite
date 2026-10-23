import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { differenceInDays, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { ConversationEntity, ConversationRepository, UsagesCount } from '../../database/index.js';
import { GroupBy } from '../statistics.js';
import { GetUsersCount, GetUsersCountHandler } from './get-users-count.js';

describe('Get Users Count', () => {
  vi.useFakeTimers();
  let conversationRepository: ConversationRepository;
  let handler: GetUsersCountHandler;
  const repositoryToken = getRepositoryToken(ConversationEntity);

  beforeAll(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsersCountHandler,
        {
          provide: repositoryToken,
          useClass: ConversationRepository,
        },
      ],
    }).compile();
    conversationRepository = module.get<ConversationRepository>(repositoryToken);
    handler = module.get(GetUsersCountHandler);
  });

  it('should be defined', () => {
    expect(GetUsersCount).toBeDefined();
  });
  it('should return entries with some total values', async () => {
    const date = startOfDay(new Date());
    vi.spyOn(conversationRepository, 'getUsersCountByPeriod').mockResolvedValueOnce([
      { date: subDays(date, 1), total: 69 },
      { date: date, total: 42 },
    ]);
    const result = await handler.execute(new GetUsersCount(undefined, GroupBy.Day));

    expect(result.requests).toHaveLength(2);
    expect(result.requests[1]).toMatchObject({ date: expect.any(Date) as Date, total: 42 });
    expect(result.requests[0]).toMatchObject({ date: expect.any(Date) as Date, total: 69 });
  });
  it('should return users count of the last 2 weeks grouped by week', async () => {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeek = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    const users: UsagesCount[] = [
      { date: lastWeek, total: 10 },
      { date: currentWeek, total: 42 },
    ];
    vi.spyOn(conversationRepository, 'getUsersCountByPeriod').mockResolvedValue(users);

    const result = await handler.execute(new GetUsersCount(lastWeek, GroupBy.Week));

    expect(result.requests).toHaveLength(2);
    expect(result.requests[1]).toMatchObject({ date: expect.any(Date) as Date, total: 42 });
    expect(result.requests[0]).toMatchObject({ date: expect.any(Date) as Date, total: 10 });
  });
  it('should return users count of the last 2 months grouped by month', async () => {
    const currentMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));

    const daysAgo = differenceInDays(new Date(), lastMonth);

    const users: UsagesCount[] = [
      { date: lastMonth, total: 50 },
      { date: currentMonth, total: 100 },
    ];
    vi.spyOn(conversationRepository, 'getUsersCountByPeriod').mockResolvedValue(users);
    const since = startOfMonth(subDays(new Date(), daysAgo));
    const result = await handler.execute(new GetUsersCount(since, GroupBy.Month));

    expect(result.requests).toHaveLength(2);
    expect(result.requests[0]).toMatchObject({ date: expect.any(Date) as Date, total: 50 });
    expect(result.requests[1]).toMatchObject({ date: expect.any(Date) as Date, total: 100 });
  });
});
