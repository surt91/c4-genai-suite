import type { BucketDto, ExtensionArgumentObjectSpecDto, StreamEventHolderDto } from './generated';

// Names for schemas that are inlined in the OpenAPI specification of the backend.

/** One event of the answer stream (`POST /api/conversations/{id}/messages/sse`). */
export type StreamEventDto = StreamEventHolderDto['event'];

export type BucketDtoFileSizeLimits = BucketDto['fileSizeLimits'];

export type ExtensionArgumentObjectSpecDtoPropertiesValue = ExtensionArgumentObjectSpecDto['properties'][string];

export const BUCKET_TYPES: BucketDto['type'][] = ['general', 'user', 'conversation'];
