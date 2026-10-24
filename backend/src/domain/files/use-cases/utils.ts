import { BadRequestException } from '@nestjs/common';
import { Agent, fetch as undiciFetch } from 'undici';
import { parseHeaders } from '../../../lib/index.js';
import { BlobCategory, BucketEntity, FileEntity } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Bucket, UploadedFile } from '../interfaces.js';
import { createClient } from './generated/client/index.js';
import { FilesApi } from './generated/index.js';

export function buildBucket(source: BucketEntity): Bucket {
  return source;
}

export function buildBucketSnapshot(bucket: Bucket): Record<string, unknown> {
  // Explicitly pick only non-sensitive bucket fields.
  // Headers are omitted because they can contain credentials (Authorization/API keys).
  // A boolean flag records whether headers were configured so diffs remain meaningful.
  const snapshot = {
    id: bucket.id,
    name: bucket.name,
    endpoint: bucket.endpoint,
    indexName: bucket.indexName,
    isDefault: bucket.isDefault,
    perUserQuota: bucket.perUserQuota,
    allowedFileNameExtensions: bucket.allowedFileNameExtensions,
    type: bucket.type,
    fileSizeLimits: bucket.fileSizeLimits,
    headersConfigured: !!bucket.headers,
  };
  return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

export function buildFile(source: FileEntity): UploadedFile {
  // the bucket is only used for its type (it contains secrets like headers)
  const { createdAt: uploadedAt, bucket, ...other } = source;

  return {
    uploadedAt,
    ...other,
    bucketType: bucket?.type,
    content: source.blobs?.map((x) => ({
      buffer: x.buffer,
      original: x.category === BlobCategory.FILE_ORIGINAL,
      type: x.type,
    })),
  };
}

export function getBucketId(bucket: BucketEntity, user?: User, conversationId?: number) {
  let ragBucket = bucket.id.toString();

  if (user) {
    ragBucket = `${bucket.id}/${user.id}`;
  }

  if (conversationId) {
    ragBucket += `/${conversationId}`;
  }

  return ragBucket;
}

/** The RAG server answered with an error status. */
export class ResponseError extends Error {
  override name = 'ResponseError';

  constructor(
    public readonly response: Response,
    /** The parsed (JSON) or textual body of the error response. */
    public readonly body?: unknown,
  ) {
    super(`The RAG server responded with status ${response.status}.`);
  }

  get status() {
    return this.response.status;
  }
}

/** The body of a request that is sent as it is (e.g. a file), with the content type of the blob. */
export function rawBody(body: Blob) {
  return { body, bodySerializer: null };
}

/**
 * Calls the RAG server at an endpoint that has been entered by an admin (e.g. to test it before saving the bucket). As the
 * endpoint is part of the input, a failing request is reported as 400 (with the reason) instead of 500.
 */
export async function callEnteredEndpoint<T>(endpoint: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ResponseError) {
      throw new BadRequestException(`The RAG server at '${endpoint}' responded with status ${error.status}.`, {
        cause: error,
      });
    }
    if (error instanceof TypeError) {
      // fetch reports network errors as TypeError('fetch failed') with the reason as cause
      const reason = error.cause instanceof Error ? error.cause.message : error.message;
      throw new BadRequestException(`The RAG server at '${endpoint}' could not be reached: ${reason}`, { cause: error });
    }
    throw error;
  }
}

export function buildClient(bucket: Pick<BucketEntity, 'headers' | 'endpoint'>) {
  // FIXME we need a better concept than long lasting connections
  const timeout = 3 * 60 * 60 * 1000;
  const dispatcher = new Agent({
    bodyTimeout: timeout,
    headersTimeout: timeout,
    connect: {
      rejectUnauthorized: false,
    },
  });

  const client = createClient({
    baseUrl: bucket.endpoint,
    throwOnError: true,
    // The REI-S API has no JSON request bodies: without the default 'Content-Type: application/json' the type of the
    // uploaded blob is sent.
    headers: { 'Content-Type': null, ...parseHeaders(bucket.headers) },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      // undici's fetch does not accept the Request of the global fetch, so it is passed as URL and init.
      // The requests are only built by the generated client with hardcoded paths, so there should be no risk of SSRF
      // nosemgrep: nodejs_scan.javascript-ssrf-rule-node_ssrf
      const result = await undiciFetch(request.url, {
        method: request.method,
        headers: [...request.headers],
        body: request.body ? Buffer.from(await request.arrayBuffer()) : undefined,
        signal: request.signal,
        dispatcher,
      });
      return result as unknown as Response;
    },
  });
  // Network errors (without a response) are thrown as they are.
  client.interceptors.error.use((error, response) => (response && !response.ok ? new ResponseError(response, error) : error));

  return new FilesApi({ client });
}
