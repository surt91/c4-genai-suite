import { BadRequestException } from '@nestjs/common';
import { Agent, RequestInfo, RequestInit, fetch as undiciFetch } from 'undici';
import { parseHeaders } from '../../../lib/index.js';
import { BlobCategory, BucketEntity, FileEntity } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Bucket, UploadedFile } from '../interfaces.js';
import { Configuration, FetchError, FilesApi, HTTPHeaders, ResponseError } from './generated/index.js';

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

/**
 * Calls the RAG server at an endpoint that has been entered by an admin (e.g. to test it before saving the bucket). As the
 * endpoint is part of the input, a failing request is reported as 400 (with the reason) instead of 500.
 */
export async function callEnteredEndpoint<T>(endpoint: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof FetchError) {
      const reason = error.cause.message;
      throw new BadRequestException(`The RAG server at '${endpoint}' could not be reached: ${reason}`, { cause: error });
    }
    if (error instanceof ResponseError) {
      throw new BadRequestException(`The RAG server at '${endpoint}' responded with status ${error.response.status}.`, {
        cause: error,
      });
    }
    throw error;
  }
}

export function buildClient(bucket: Pick<BucketEntity, 'headers' | 'endpoint'>) {
  const headers: HTTPHeaders = parseHeaders(bucket.headers);

  const api = new FilesApi(
    new Configuration({
      headers,
      fetchApi: async (request, init) => {
        // FIXME we need a better concept than long lasting connections
        const timeout = 3 * 60 * 60 * 1000;
        // This method is only called from the generated API-Clients with hardcoded
        // paths, so there should be no risk of SSRF
        // nosemgrep: nodejs_scan.javascript-ssrf-rule-node_ssrf
        const result = await undiciFetch(request as RequestInfo, {
          ...(init as RequestInit),
          dispatcher: new Agent({
            bodyTimeout: timeout,
            headersTimeout: timeout,
            connect: {
              rejectUnauthorized: false,
            },
          }),
        });

        return result as unknown as Response;
      },
      basePath: bucket.endpoint,
    }),
  );

  return api;
}
