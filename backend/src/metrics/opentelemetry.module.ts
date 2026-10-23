import { Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getLangfuseConfig, LangfuseSpanExporter } from './langfuse';

@Module({
  imports: [ConfigModule],
})
export class OpenTelemetryModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private sdk?: NodeSDK;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    const langfuse = getLangfuseConfig(this.configService);

    if (langfuse) {
      this.sdk = new NodeSDK({
        traceExporter: new LangfuseSpanExporter(langfuse),
        // The only traces are the AI SDK spans (`experimental_telemetry` of `streamText`/`generateText`) and the Langfuse
        // exporter drops every span that does not come from the `ai` instrumentation scope. Spans of auto
        // instrumentations (http, express, pg, undici, ...) were never exported, so none are registered.
        instrumentations: [],
      });
      this.sdk.start();
    }
  }

  async onApplicationShutdown(_signal?: string) {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}
