import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/domain/auth/module';
import { BucketEntity, CacheEntity, FileEntity } from 'src/domain/database';
import { UserArgsExtension } from './dev-only/user-args';
import { ContextExtension } from './examples/show-context';
import { AzureOpenAIModelExtension } from './models/azure-open-ai';
import { BedrockModelExtension } from './models/bedrock-ai';
import { GoogleGenAIModelExtension } from './models/google-genai';
import { MistralModelExtension } from './models/mistral';
import { NvidiaModelExtension } from './models/nvidia';
import { OllamaModelExtension } from './models/ollama';
import { OpenAIModelExtension } from './models/open-ai';
import { OpenAICompatibleModelExtension } from './models/open-ai-compatible';
import { AzureTranscribeExtension } from './other/azure-transcribe';
import { CustomPromptExtension } from './other/custom';
import { SpeechToTextExtension } from './other/speech-to-text';
import { SummaryPromptExtension } from './other/summary';
import { AzureGPTImage1Extension } from './tools/azure-gpt-image-1';
import { BraveWebSearchExtension } from './tools/brave-web-search';
import { CalculatorExtension } from './tools/calculator';
import { FilesExtension } from './tools/files';
import { FilesConversationExtension } from './tools/files-conversation';
import { FilesVisionExtension } from './tools/files-vision';
import { GeminiImageExtension } from './tools/gemini-image';
import { GPTImage1Extension } from './tools/gpt-image-1';
import { MCPToolsExtension } from './tools/mcp-tools';
import { WholeFilesExtension } from './tools/whole-files-conversation';

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
