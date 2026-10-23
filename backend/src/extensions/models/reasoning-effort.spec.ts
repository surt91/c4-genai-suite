import { I18nService } from '../../localization/i18n.service.js';
import { NvidiaModelExtension } from './nvidia.js';
import { OpenAICompatibleModelExtension } from './open-ai-compatible.js';

describe('reasoning effort of OpenAI compatible models', () => {
  let requestBody: Record<string, unknown>;

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      requestBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: '1',
            created: 0,
            model: 'm',
            choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      );
    });
  });

  afterEach(() => vi.restoreAllMocks());

  const i18n = { t: (key: string) => key } as unknown as I18nService;
  const configuration = { apiKey: 'key', baseUrl: 'http://llm.internal/v1', modelName: 'm', effort: 'high' };

  it.each([
    ['openai-compatible', () => new OpenAICompatibleModelExtension(i18n)],
    ['nvidia', () => new NvidiaModelExtension(i18n)],
  ])('sends the configured effort for %s', async (_, create) => {
    await create().test(configuration as never);

    expect(requestBody.reasoning_effort).toBe('high');
  });

  it('replaces every empty tool call content for nvidia', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    const repair = new NvidiaModelExtension(i18n).repairToolCall(fetchMock);

    await repair('http://x', { body: '[{"content":"","a":1},{"content":"","b":2}]' });

    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].body).toBe('[{"content":null,"a":1},{"content":null,"b":2}]');
  });
});
