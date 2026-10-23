import { createServer, IncomingHttpHeaders, Server } from 'http';
import { AddressInfo } from 'net';
import { ConfigService } from '@nestjs/config';
import { SimpleSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import { getLangfuseConfig, LangfuseSpanExporter } from './langfuse';

interface ReceivedRequest {
  url?: string;
  headers: IncomingHttpHeaders;
  body: string;
}

interface OtlpJsonSpan {
  name: string;
  attributes: { key: string; value: { stringValue?: string } }[];
}

interface OtlpJsonBody {
  resourceSpans: { scopeSpans: { scope: { name: string }; spans: OtlpJsonSpan[] }[] }[];
}

describe('Langfuse', () => {
  describe('getLangfuseConfig', () => {
    const configOf = (values: Record<string, string>) =>
      getLangfuseConfig({ get: (key: string) => values[key] } as unknown as ConfigService);

    it('is disabled without keys', () => {
      expect(configOf({})).toBeUndefined();
      expect(configOf({ LANGFUSE_PUBLIC_KEY: 'pk' })).toBeUndefined();
      expect(configOf({ LANGFUSE_SECRET_KEY: 'sk' })).toBeUndefined();
    });

    it('uses the Langfuse cloud by default', () => {
      expect(configOf({ LANGFUSE_PUBLIC_KEY: 'pk', LANGFUSE_SECRET_KEY: 'sk' })).toEqual({
        publicKey: 'pk',
        secretKey: 'sk',
        baseUrl: 'https://cloud.langfuse.com',
      });
    });

    it('reads the base URL from LANGFUSE_BASEURL or LANGFUSE_BASE_URL', () => {
      const keys = { LANGFUSE_PUBLIC_KEY: 'pk', LANGFUSE_SECRET_KEY: 'sk' };
      expect(configOf({ ...keys, LANGFUSE_BASEURL: 'https://a.example' })?.baseUrl).toBe('https://a.example');
      expect(configOf({ ...keys, LANGFUSE_BASE_URL: 'https://b.example' })?.baseUrl).toBe('https://b.example');
    });
  });

  describe('LangfuseSpanExporter', () => {
    let server: Server;
    let baseUrl: string;
    let requests: ReceivedRequest[];

    beforeEach(async () => {
      requests = [];
      server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          requests.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{}');
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    });

    afterEach(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('sends only AI SDK spans to the OTLP endpoint of Langfuse', async () => {
      const exporter = new LangfuseSpanExporter({ publicKey: 'pk-lf-1', secretKey: 'sk-lf-2', baseUrl });
      const provider = new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] });

      provider.getTracer('@opentelemetry/instrumentation-http').startSpan('GET /api/conversations').end();
      provider
        .getTracer('ai')
        .startSpan('ai.streamText', {
          attributes: { 'ai.telemetry.metadata.conversationId': 42, 'ai.telemetry.metadata.assistantName': 'Bot' },
        })
        .end();
      await provider.forceFlush();
      await provider.shutdown();

      expect(requests).toHaveLength(1);
      const [request] = requests;
      expect(request.url).toBe('/api/public/otel/v1/traces');
      expect(request.headers.authorization).toBe(`Basic ${Buffer.from('pk-lf-1:sk-lf-2').toString('base64')}`);

      const body = JSON.parse(request.body) as OtlpJsonBody;
      const scopeSpans = body.resourceSpans.flatMap((x) => x.scopeSpans);
      expect(scopeSpans.map((x) => x.scope.name)).toEqual(['ai']);
      const spans = scopeSpans.flatMap((x) => x.spans);
      expect(spans.map((x) => x.name)).toEqual(['ai.streamText']);
      const attributes = Object.fromEntries(spans[0].attributes.map((x) => [x.key, x.value]));
      expect(attributes['langfuse.session.id']).toEqual({ stringValue: '42' });
      expect(attributes['ai.telemetry.metadata.assistantName']).toEqual({ stringValue: 'Bot' });
    });

    it('does not call Langfuse when there are no AI SDK spans', async () => {
      const exporter = new LangfuseSpanExporter({ publicKey: 'pk', secretKey: 'sk', baseUrl });
      const provider = new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] });

      provider.getTracer('@opentelemetry/instrumentation-pg').startSpan('pg.query').end();
      await provider.forceFlush();
      await provider.shutdown();

      expect(requests).toHaveLength(0);
    });
  });
});
