import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Bucket } from '../interfaces.js';
import { buildClient, callEnteredEndpoint } from './utils.js';

export class TestBucket {
  constructor(
    public readonly endpoint: string,
    public readonly headers?: string,
  ) {}
}

export class TestBucketResponse {
  constructor(public readonly bucket: Bucket) {}
}

@CommandHandler(TestBucket)
export class TestBucketHandler implements ICommandHandler<TestBucket, TestBucketResponse> {
  async execute(command: TestBucket): Promise<any> {
    const client = buildClient(command);

    //TODO add indexName here
    await callEnteredEndpoint(command.endpoint, () => client.getFiles({ query: 'Test Query', take: 10, bucket: 'test' }));
  }
}
