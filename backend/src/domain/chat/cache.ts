import { Injectable } from '@nestjs/common';
import { is } from '../../lib/index.js';
import { ChatCache } from './interfaces.js';

type TTLValue<V> = {
  value: V;
  expiresAt: number;
};

class TTLMap<TKey, TValue = any> {
  private store = new Map<TKey, TTLValue<TValue>>();
  private readonly ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  set<V extends TValue>(key: TKey, value: V): V {
    const expiresAt = Date.now() + this.ttl;
    this.store.set(key, { value, expiresAt });
    return value;
  }

  get<V extends TValue>(key: TKey): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    return entry.value as V;
  }

  clean(): void {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.store.entries()) {
      if (expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

@Injectable()
export class ChatCacheImpl implements ChatCache {
  private cache = new TTLMap<string>(10 * 60 * 1000);

  async get<T>(key: string, args: Record<string, any>, resolver: () => Promise<T> | T): Promise<T> {
    // JSON, because `${value}` would map all objects (e.g. MCP schema settings) to the same `[object Object]`.
    const cacheKey = `EXTENSION_${key}_${JSON.stringify(args)}`;

    const value = this.cache.get<T>(cacheKey);
    if (value) {
      return value;
    }

    const resolve = await resolver();
    return this.cache.set(cacheKey, is(resolve, Promise) ? await resolve : resolve);
  }

  clean() {
    this.cache.clean();
  }
}
