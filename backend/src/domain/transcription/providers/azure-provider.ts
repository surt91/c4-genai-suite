import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure';
import { BadRequestException, Logger } from '@nestjs/common';
import { experimental_transcribe as transcribe } from 'ai';
import { TranscribeExtensionConfiguration } from '../../../extensions/other/azure-transcribe';

export class AzureTranscriptionProvider {
  private readonly logger = new Logger(AzureTranscriptionProvider.name);
  private readonly model: ReturnType<AzureOpenAIProvider['transcription']>;

  constructor(config: TranscribeExtensionConfiguration) {
    if (!config.apiKey) {
      throw new BadRequestException('API key is required');
    }
    if (!config.instanceName) {
      throw new BadRequestException('Instance name is required');
    }
    if (!config.deploymentName) {
      throw new BadRequestException('Deployment name is required');
    }
    if (!config.apiVersion) {
      throw new BadRequestException('API version is required');
    }

    // https://<instance>.openai.azure.com/openai/deployments/<deploymentName>/audio/transcriptions?api-version=<apiVersion>
    this.model = createAzure({
      apiKey: config.apiKey,
      apiVersion: config.apiVersion,
      resourceName: config.instanceName,
      useDeploymentBasedUrls: true,
    }).transcription(config.deploymentName);
  }

  async transcribe(audioBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const model = this.model;
      const result = await transcribe({
        // `transcribe` sniffs the media type from the audio bytes and falls back to `audio/wav`, which is wrong
        // for formats without a known signature (e.g. webm recordings of the browser). The service derives the
        // format from the file extension, so pass the known MIME type of the upload instead.
        model: {
          specificationVersion: model.specificationVersion,
          provider: model.provider,
          modelId: model.modelId,
          doGenerate: (options) => model.doGenerate({ ...options, mediaType: mimeType }),
        },
        audio: new Uint8Array(audioBuffer),
      });

      this.logger.log(`Azure transcription successful, file: ${fileName}, text length: ${result.text.length}`);
      return result.text;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Azure transcription error: ${error.message}`, error.stack);
        throw new BadRequestException(`Azure transcription failed: ${error.message}`);
      }
      throw new BadRequestException('Azure transcription failed');
    }
  }
}
