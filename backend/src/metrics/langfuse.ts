import { ConfigService } from '@nestjs/config';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';

export interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * Langfuse tracing is enabled when both keys are set. The base URL is read from `LANGFUSE_BASEURL` (the variable of the
 * Langfuse SDKs) or `LANGFUSE_BASE_URL`.
 */
export function getLangfuseConfig(configService: ConfigService): LangfuseConfig | undefined {
  const publicKey = configService.get<string>('LANGFUSE_PUBLIC_KEY');
  const secretKey = configService.get<string>('LANGFUSE_SECRET_KEY');
  const baseUrl =
    configService.get<string>('LANGFUSE_BASEURL') ||
    configService.get<string>('LANGFUSE_BASE_URL') ||
    'https://cloud.langfuse.com';

  return publicKey && secretKey ? { publicKey, secretKey, baseUrl } : undefined;
}

// instrumentation scope of the spans of the AI SDK (`experimental_telemetry`)
const AI_SDK_SCOPE = 'ai';

// trace-level attributes of the Langfuse OpenTelemetry ingestion, set from the `experimental_telemetry` metadata
const TRACE_ATTRIBUTES: Record<string, string> = {
  'ai.telemetry.metadata.conversationId': 'langfuse.session.id',
};

/**
 * Exports the AI SDK spans to the OTLP endpoint of Langfuse (`<baseUrl>/api/public/otel`). Like the former
 * `langfuse-vercel` exporter all other spans are dropped. The conversation is mapped to the Langfuse session.
 */
export class LangfuseSpanExporter implements SpanExporter {
  private readonly exporter: SpanExporter;

  constructor(config: LangfuseConfig, exporter?: SpanExporter) {
    const auth = Buffer.from(`${config.publicKey}:${config.secretKey}`).toString('base64');

    this.exporter =
      exporter ??
      new OTLPTraceExporter({
        url: `${config.baseUrl.replace(/\/+$/, '')}/api/public/otel/v1/traces`,
        headers: { Authorization: `Basic ${auth}` },
      });
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const aiSpans = spans.filter((span) => span.instrumentationScope.name === AI_SDK_SCOPE).map(withTraceAttributes);

    if (aiSpans.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    this.exporter.export(aiSpans, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() ?? Promise.resolve();
  }
}

function withTraceAttributes(span: ReadableSpan): ReadableSpan {
  const extra = Object.fromEntries(
    Object.entries(TRACE_ATTRIBUTES)
      .filter(([source, target]) => span.attributes[source] != null && span.attributes[target] == null)
      .map(([source, target]) => [target, String(span.attributes[source])]),
  );

  if (Object.keys(extra).length === 0) {
    return span;
  }

  return {
    name: span.name,
    kind: span.kind,
    spanContext: () => span.spanContext(),
    parentSpanContext: span.parentSpanContext,
    startTime: span.startTime,
    endTime: span.endTime,
    status: span.status,
    attributes: { ...span.attributes, ...extra },
    links: span.links,
    events: span.events,
    duration: span.duration,
    ended: span.ended,
    resource: span.resource,
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}
