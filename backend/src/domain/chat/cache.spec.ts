import { ChatCacheImpl } from './cache.js';

describe(ChatCacheImpl.name, () => {
  it('distinguishes values that differ only in nested objects', async () => {
    const cache = new ChatCacheImpl();

    const a = await cache.get('mcp', { schema: { tool: { enabled: true } } }, () => 'a');
    const b = await cache.get('mcp', { schema: { tool: { enabled: false } } }, () => 'b');
    const again = await cache.get('mcp', { schema: { tool: { enabled: true } } }, () => 'other');

    expect([a, b, again]).toEqual(['a', 'b', 'a']);
  });
});
