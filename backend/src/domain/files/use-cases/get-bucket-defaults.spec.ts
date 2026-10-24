import { ConfigService } from '@nestjs/config';
import { BucketRepository } from '../../database/index.js';
import { GetBucketDefaults, GetBucketDefaultsHandler } from './get-bucket-defaults.js';

describe(GetBucketDefaultsHandler.name, () => {
  const setup = (configured: string | undefined, endpoints: string[]) => {
    const getRawMany = vi.fn(() => Promise.resolve(endpoints.map((endpoint) => ({ endpoint }))));
    const queryBuilder = { select: vi.fn(), limit: vi.fn(), getRawMany };
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.limit.mockReturnValue(queryBuilder);
    const buckets = { createQueryBuilder: vi.fn(() => queryBuilder) } as unknown as BucketRepository;
    const config = { get: vi.fn(() => configured) } as unknown as ConfigService;

    return { handler: new GetBucketDefaultsHandler(config, buckets), getRawMany };
  };

  it('returns the configured endpoint', async () => {
    const { handler, getRawMany } = setup(' http://reis:3201 ', ['http://other']);

    const result = await handler.execute(new GetBucketDefaults());

    expect(result.endpoint).toBe('http://reis:3201');
    expect(getRawMany).not.toHaveBeenCalled();
  });

  it('returns the endpoint of the existing buckets when they all use the same one', async () => {
    const { handler } = setup(undefined, ['http://reis.internal']);

    expect((await handler.execute(new GetBucketDefaults())).endpoint).toBe('http://reis.internal');
  });

  it('returns no endpoint when the existing buckets use different ones', async () => {
    const { handler } = setup('', ['http://a', 'http://b']);

    expect((await handler.execute(new GetBucketDefaults())).endpoint).toBeUndefined();
  });

  it('returns no endpoint without configuration and buckets', async () => {
    const { handler } = setup(undefined, []);

    expect((await handler.execute(new GetBucketDefaults())).endpoint).toBeUndefined();
  });
});
