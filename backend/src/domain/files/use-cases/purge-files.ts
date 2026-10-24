import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { In } from 'typeorm';
import { FileRepository } from '../../database/index.js';
import { ResponseError } from './generated/index.js';
import { buildClient } from './utils.js';

const logger = new Logger('PurgeFiles');

/** Thrown when files cannot be deleted because the RAG server (REI-S) is not reachable or fails. */
export class RagServerDeletionFailedException extends ServiceUnavailableException {
  constructor() {
    super('The deletion failed because the files could not be deleted from the RAG server (REI-S). Please try again later.');
  }
}

/**
 * Deletes the files with the given ids permanently: first their documents and chunks in the RAG server (REI-S, in the
 * index of their bucket), then the database rows (the blobs are deleted by the foreign key cascade).
 *
 * The files are deleted one after another, so a failure never leaves a file whose row is gone but whose chunks remain.
 * If the RAG server fails, a {@link RagServerDeletionFailedException} is thrown; the caller must not delete the
 * owner (conversation, user) then, so that the deletion can be retried.
 */
export async function purgeFiles(files: FileRepository, ids: number[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const entities = await files.find({ where: { id: In(ids) }, relations: { bucket: true } });
  const clients = new Map<number, ReturnType<typeof buildClient>>();

  for (const entity of entities) {
    const bucket = entity.bucket;
    if (bucket) {
      let api = clients.get(bucket.id);
      if (!api) {
        api = buildClient(bucket);
        clients.set(bucket.id, api);
      }

      try {
        await api.deleteFile(entity.id.toString(), bucket.indexName);
      } catch (error) {
        if (error instanceof ResponseError && error.response.status === 404) {
          logger.warn(`File ${entity.id} not found in the RAG server, assuming it was already deleted.`);
        } else {
          logger.error(`Failed to delete file ${entity.id} from the RAG server.`, error);
          throw new RagServerDeletionFailedException();
        }
      }
    }

    await files.delete({ id: entity.id });
  }
}

/** Purges all files of the user (personal files, conversation files and files of the responses API). */
export async function purgeFilesOfUser(files: FileRepository, userId: string): Promise<void> {
  const owned = await files.find({ where: { userId }, select: { id: true } });
  await purgeFiles(
    files,
    owned.map((x) => x.id),
  );
}
