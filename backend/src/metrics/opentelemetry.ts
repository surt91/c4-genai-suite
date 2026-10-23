import { LegacyOpenTelemetry } from '@ai-sdk/otel';

/**
 * The OpenTelemetry integration of the AI SDK, passed to the calls with telemetry (it is not registered globally, so
 * the other calls are not traced). The legacy integration emits the `ai.*` spans of the `ai` tracer that the Langfuse
 * exporter forwards (see LangfuseSpanExporter). Without the Langfuse configuration no tracer provider is registered
 * (see OpenTelemetryModule) and the spans are dropped.
 */
export const aiSdkTelemetry = new LegacyOpenTelemetry();
