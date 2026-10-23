import type { MockInstance } from 'vitest';
import { AzureTranscriptionProvider } from './azure-provider.js';

describe('AzureTranscriptionProvider', () => {
  const config = { apiKey: 'key', instanceName: 'my-instance', deploymentName: 'whisper', apiVersion: '2024-06-01' };
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ text: 'hello world' }), { headers: { 'content-type': 'application/json' } }),
        ),
      );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('calls the deployment based transcription endpoint with the upload MIME type', async () => {
    const provider = new AzureTranscriptionProvider(config);

    const text = await provider.transcribe(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), 'recording.webm', 'audio/webm');

    expect(text).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://my-instance.openai.azure.com/openai/deployments/whisper/audio/transcriptions?api-version=2024-06-01',
    );
    expect((init.headers as Record<string, string>)['api-key']).toBe('key');
    const file = (init.body as FormData).get('file') as File;
    expect(file.name).toBe('audio.webm');
    expect(file.type).toBe('audio/webm');
  });

  it('wraps errors in a BadRequestException', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 400 })),
    );
    const provider = new AzureTranscriptionProvider(config);

    await expect(provider.transcribe(Buffer.from([1, 2, 3]), 'a.mp3', 'audio/mpeg')).rejects.toThrow(
      'Azure transcription failed',
    );
  });

  it('validates the configuration', () => {
    expect(() => new AzureTranscriptionProvider({ ...config, apiKey: '' })).toThrow('API key is required');
  });
});
