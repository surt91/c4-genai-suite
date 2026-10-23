import { Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-vercel';

@Module({
  imports: [ConfigModule],
})
export class OpenTelemetryModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private sdk?: NodeSDK;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    const publicKey = this.configService.get<string>('LANGFUSE_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('LANGFUSE_SECRET_KEY');
    const baseUrl = this.configService.get<string>('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com');

    if (publicKey && secretKey && baseUrl) {
      this.sdk = new NodeSDK({
        traceExporter: new LangfuseExporter(),
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
