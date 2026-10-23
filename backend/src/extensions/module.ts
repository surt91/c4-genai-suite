import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../domain/auth/module.js';
import { BucketEntity, CacheEntity, FileEntity } from '../domain/database/index.js';
import { UserArgsExtension } from './dev-only/user-args.js';
import { ContextExtension } from './examples/show-context.js';
import { AzureOpenAIModelExtension } from './models/azure-open-ai.js';
import { BedrockModelExtension } from './models/bedrock-ai.js';
import { GoogleGenAIModelExtension } from './models/google-genai.js';
import { MistralModelExtension } from './models/mistral.js';
import { NvidiaModelExtension } from './models/nvidia.js';
import { OllamaModelExtension } from './models/ollama.js';
import { OpenAICompatibleModelExtension } from './models/open-ai-compatible.js';
import { OpenAIModelExtension } from './models/open-ai.js';
import { AzureTranscribeExtension } from './other/azure-transcribe.js';
import { CustomPromptExtension } from './other/custom.js';
import { SpeechToTextExtension } from './other/speech-to-text.js';
import { SummaryPromptExtension } from './other/summary.js';
import { AzureGPTImage1Extension } from './tools/azure-gpt-image-1.js';
import { BraveWebSearchExtension } from './tools/brave-web-search.js';
import { CalculatorExtension } from './tools/calculator.js';
import { FilesConversationExtension } from './tools/files-conversation.js';
import { FilesVisionExtension } from './tools/files-vision.js';
import { FilesExtension } from './tools/files.js';
import { GeminiImageExtension } from './tools/gemini-image.js';
import { GPTImage1Extension } from './tools/gpt-image-1.js';
import { MCPToolsExtension } from './tools/mcp-tools.js';
import { WholeFilesExtension } from './tools/whole-files-conversation.js';

@Module({})
export class ExtensionLibraryModule {
  static register(): DynamicModule {
    // test fixtures for the E2E tests, never offered in production
    const devOnlyExtensions = process.env.NODE_ENV !== 'production' ? [UserArgsExtension] : [];

    return {
      module: ExtensionLibraryModule,
      imports: [ConfigModule, AuthModule, CqrsModule, TypeOrmModule.forFeature([CacheEntity, BucketEntity, FileEntity])],
      providers: [
        AzureGPTImage1Extension,
        AzureOpenAIModelExtension,
        BedrockModelExtension,
        BraveWebSearchExtension,
        CalculatorExtension,
        ContextExtension,
        CustomPromptExtension,
        AzureTranscribeExtension,
        FilesConversationExtension,
        FilesExtension,
        FilesVisionExtension,
        GoogleGenAIModelExtension,
        GPTImage1Extension,
        MCPToolsExtension,
        MistralModelExtension,
        GeminiImageExtension,
        NvidiaModelExtension,
        OllamaModelExtension,
        OpenAICompatibleModelExtension,
        OpenAIModelExtension,
        SpeechToTextExtension,
        SummaryPromptExtension,
        WholeFilesExtension,
        ...devOnlyExtensions,
      ],
    };
  }
}
