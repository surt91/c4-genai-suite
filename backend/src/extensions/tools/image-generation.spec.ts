import { CommandBus } from '@nestjs/cqrs';
import { AuthService } from 'src/domain/auth';
import { ChatContext, NamedStructuredTool } from 'src/domain/chat';
import { UploadBlob } from 'src/domain/settings';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { AzureGPTImage1Extension } from './azure-gpt-image-1';
import { GPTImage1Extension } from './gpt-image-1';

// 1x1 transparent PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('image generation tools', () => {
  const authService = { config: { baseUrl: 'https://gaible.example' } } as unknown as AuthService;
  const i18n = { t: (key: string) => key } as unknown as I18nService;
  let commandBus: { execute: jest.Mock };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ created: 1, data: [{ b64_json: PNG_BASE64 }] }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  async function callTool(
    extension: GPTImage1Extension,
    values: Record<string, unknown>,
    args: Record<string, string>,
  ) {
    const context = {
      tools: [] as NamedStructuredTool[],
      cache: { get: (_key: string, _values: unknown, factory: () => Promise<unknown>) => factory() },
    } as unknown as ChatContext;
    const [middleware] = await extension.getMiddlewares({} as User, { values } as never);
    await middleware.invoke(
      context,
      () => context,
      () => Promise.resolve(),
    );

    return context.tools[0].execute(args);
  }

  function requestOf(call: number) {
    const [url, init] = fetchMock.mock.calls[call] as [string, RequestInit];
    return {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as Record<string, unknown>,
    };
  }

  function expectUploadedPng(result: unknown) {
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const upload = (commandBus.execute.mock.calls as UploadBlob[][])[0][0];
    expect(upload).toBeInstanceOf(UploadBlob);
    expect(upload.mimeType).toBe('image/png');
    expect(upload.fileName).toBe(`${upload.id}.png`);
    expect(upload.buffer).toEqual(Buffer.from(PNG_BASE64, 'base64'));
    expect(result).toBe(`https://gaible.example/blobs/${upload.id}`);
  }

  it('gpt-image-1 generates an image via the OpenAI API', async () => {
    const extension = new GPTImage1Extension(authService, commandBus as unknown as CommandBus, i18n);

    const result = await callTool(extension, { apiKey: 'sk-test', size: 'auto' }, { prompt: 'a dog' });

    const { body } = requestOf(0);
    expect(body).toMatchObject({ model: 'gpt-image-1', prompt: 'a dog', size: 'auto' });
    expect(body.response_format).toBeUndefined();
    expectUploadedPng(result);
  });

  it('azure gpt-image-1 uses the deployment based endpoint', async () => {
    const extension = new AzureGPTImage1Extension(authService, commandBus as unknown as CommandBus, i18n);

    const result = await callTool(
      extension,
      { apiKey: 'key', instanceName: 'my-instance', deploymentName: 'img', apiVersion: '2024-02-15-preview' },
      { prompt: 'a dog' },
    );

    const { url } = requestOf(0);
    expect(url).toBe(
      'https://my-instance.openai.azure.com/openai/deployments/img/images/generations?api-version=2024-02-15-preview',
    );
    expectUploadedPng(result);
  });

  it('returns "Failed" when the API call fails', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 400 })),
    );
    const extension = new GPTImage1Extension(authService, commandBus as unknown as CommandBus, i18n);

    const result = await callTool(extension, { apiKey: 'sk-test' }, { prompt: 'a cat' });

    expect(result).toBe('Failed');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
