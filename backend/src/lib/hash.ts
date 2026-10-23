import { createHash } from 'crypto';

/** API keys are only stored as SHA-256 hex digest and looked up by it (see LocalStrategy). */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
