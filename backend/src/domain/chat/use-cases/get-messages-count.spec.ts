import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { MessageEntity, MessageRepository, MessagesCount } from '../../database/index.js';
import { GroupBy } from '../statistics.js';
import { GetMessagesCount, GetMessagesCountHandler } from './get-messages-count.js';

describe('Get Messages Count', () => {
  let handler: GetMessagesCountHandler;
  let repository: MessageRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMessagesCountHandler,
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: {
            getMessageCount: vi.fn(),
          },
        },
      ],
    }).compile();
    handler = module.get(GetMessagesCountHandler);
    repository = module.get(getRepositoryToken(MessageEntity));
  });

  it('should return empty array if no messages', async () => {
    vi.spyOn(repository, 'getMessageCount').mockResolvedValue([]);
    const result = await handler.execute(new GetMessagesCount(undefined, GroupBy.Day));

    expect(result.requests.length).toBe(0);
  });

  it('should return messages sent each day', async () => {
    const date = startOfDay(new Date());
    const messages: MessagesCount[] = [
      createMessagesCount(addDays(date, -2), 3),
      createMessagesCount(addDays(date, -1), 4),
      createMessagesCount(date, 3),
    ];

    vi.spyOn(repository, 'getMessageCount').mockResolvedValue(messages);

    const result = await handler.execute(new GetMessagesCount(undefined, GroupBy.Day));

    // function returns an array with the data of the last 3 days
    expect(result.requests.length).toBe(3);

    // Today
    expect(result.requests[2].total).toBe(3);

    // 1 day before
    expect(result.requests[1].total).toBe(4);

    // 2 days before
    expect(result.requests[0].total).toBe(3);
  });

  it('should return messages sent per week', async () => {
    const messages: MessagesCount[] = [
      // 2 weeks before
      createMessagesCount(getMondayOfTwoWeeksAgo(), 17),
      // last week
      createMessagesCount(getMondayOfLastWeek(), 18),
      // this week
      createMessagesCount(getMondayOfThisWeek(), 10),
    ];

    vi.spyOn(repository, 'getMessageCount').mockResolvedValue(messages);

    const result = await handler.execute(new GetMessagesCount(undefined, GroupBy.Week));

    expect(result.requests.length).toBe(3);

    // 2 weeks ago
    expect(result.requests[0].date.getTime()).toBe(getMondayOfTwoWeeksAgo().getTime());
    expect(result.requests[0].total).toBe(17);

    // 1 week ago
    expect(result.requests[1].date.getTime()).toBe(getMondayOfLastWeek().getTime());
    expect(result.requests[1].total).toBe(18);

    // This week
    expect(result.requests[2].date.getTime()).toBe(getMondayOfThisWeek().getTime());
    expect(result.requests[2].total).toBe(10);
  });

  it('should return messages sent each month', async () => {
    const messages: MessagesCount[] = [
      // 4 months before
      createMessagesCount(getDayOfMonth(-4, 1), 20),
      // last month
      createMessagesCount(getDayOfMonth(-1, 1), 11),
      // this month
      createMessagesCount(startOfMonth(new Date()), 10),
    ];

    vi.spyOn(repository, 'getMessageCount').mockResolvedValue(messages);

    const result = await handler.execute(new GetMessagesCount(getDayOfMonth(-11, 1), GroupBy.Month));

    // function returns an array with the data of the last 12 months
    expect(result.requests.length).toBe(3);

    const expectedRequests = [
      { date: getDayOfMonth(-4, 1), total: 20 },
      { date: getDayOfMonth(-1, 1), total: 11 },
      { date: getDayOfMonth(0, 1), total: 10 },
    ];

    const actualRequests = result.requests.map((req) => ({
      date: req.date.getTime(),
      total: req.total,
    }));

    expect(actualRequests).toEqual(
      expectedRequests.map((req) => ({
        date: req.date.getTime(),
        total: req.total,
      })),
    );
  });
});

function createMessagesCount(date: Date, total: number): MessagesCount {
  return { date, total };
}

const getMondayOfThisWeek = () => startOfWeek(new Date(), { weekStartsOn: 1 });

const getMondayOfLastWeek = () => addDays(getMondayOfThisWeek(), -7);

const getMondayOfTwoWeeksAgo = () => addDays(getMondayOfLastWeek(), -7);

const getDayOfMonth = (month: number, date: number) => addDays(addMonths(startOfMonth(new Date()), month), date - 1);
