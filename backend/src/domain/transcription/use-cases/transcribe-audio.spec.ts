import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Mock } from 'vitest';
import { TranscribeExtensionConfiguration } from '../../../extensions/other/azure-transcribe.js';
import { User } from '../../users/index.js';
import { AzureTranscriptionProvider } from '../providers/index.js';
import { TranscribeAudio, TranscribeAudioHandler } from './transcribe-audio.js';

vi.mock('../providers/azure-provider.js');

describe('Transcribe Audio', () => {
  let handler: TranscribeAudioHandler;
  let queryBus: QueryBus;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: ['1'],
  };

  const mockConfig: TranscribeExtensionConfiguration = {
    apiKey: 'test-api-key',
    instanceName: 'test-instance',
    deploymentName: 'whisper',
    apiVersion: '2024-06-01',
  };

  const mockAudioBuffer = Buffer.from('fake-audio-data');
  const mockFileName = 'test-audio.mp3';
  const mockMimeType = 'audio/mp3';

  beforeEach(() => {
    queryBus = {
      execute: vi.fn(),
    } as unknown as QueryBus;

    handler = new TranscribeAudioHandler(queryBus);

    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully transcribe audio', async () => {
      const mockTranscription = 'This is the transcribed text';

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      const executeSpy = vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = vi.fn().mockResolvedValue(mockTranscription);
      (AzureTranscriptionProvider as Mock).mockImplementation(function () {
        return { transcribe: mockTranscribe };
      });

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      const result = await handler.execute(command);

      expect(result.text).toBe(mockTranscription);
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({ filter: { id: 1 } }));
      expect(AzureTranscriptionProvider).toHaveBeenCalledTimes(1);
      expect(mockTranscribe).toHaveBeenCalledWith(mockAudioBuffer, mockFileName, mockMimeType);
    });

    it('should throw NotFoundException when extension is not found', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: false,
          values: mockConfig,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Transcribe extension not found or not enabled');
    });

    it('should throw BadRequestException when audio file is too large', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: largeBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Audio file too large');
    });

    it('should throw BadRequestException for unsupported mime type', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Unsupported audio format');
    });

    it('should throw BadRequestException when transcription fails', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockError = new Error('Azure API error');
      const mockTranscribe = vi.fn().mockRejectedValue(mockError);
      (AzureTranscriptionProvider as Mock).mockImplementation(function () {
        return { transcribe: mockTranscribe };
      });

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Failed to transcribe audio');
    });

    it('should support all valid mime types', async () => {
      const validMimeTypes = ['audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm'];

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = vi.fn().mockResolvedValue('transcription');
      (AzureTranscriptionProvider as Mock).mockImplementation(function () {
        return { transcribe: mockTranscribe };
      });

      for (const mimeType of validMimeTypes) {
        const command = new TranscribeAudio({
          user: mockUser,
          extensionId: 1,
          audioBuffer: mockAudioBuffer,
          fileName: `test.${mimeType.split('/')[1]}`,
          mimeType,
        });

        await expect(handler.execute(command)).resolves.toBeDefined();
      }
    });

    it('should pass apiVersion to Azure provider', async () => {
      const mockTranscription = 'Transcribed text';
      const configWithCustomApiVersion = { ...mockConfig, apiVersion: '2025-03-01-preview' };

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: configWithCustomApiVersion,
        },
      };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = vi.fn().mockResolvedValue(mockTranscription);
      (AzureTranscriptionProvider as Mock).mockImplementation(function () {
        return { transcribe: mockTranscribe };
      });

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await handler.execute(command);

      expect(AzureTranscriptionProvider).toHaveBeenCalledWith(configWithCustomApiVersion);
    });
  });
});
