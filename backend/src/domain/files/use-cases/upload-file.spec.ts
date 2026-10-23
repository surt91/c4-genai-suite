import { InternalServerErrorException } from '@nestjs/common';
import { BlobRepository, BucketRepository, FileRepository } from 'src/domain/database';
import { I18nService } from '../../../localization/i18n.service';
import { ConversationFileRepository } from '../../database/entities/conversation-file';
import { getRelevantLimit, UploadFile, UploadFileHandler } from './upload-file';
import { buildClient } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual<object>('./utils'),
  buildClient: jest.fn(),
}));

describe('Upload File', () => {
  it('should get correct limit', () => {
    const fileSizeLimits = {
      general: 1.4,
      pdf: 13,
      xlsx: 2,
      'application/pdf': 12,
    };

    expect(getRelevantLimit(fileSizeLimits, 'data.pdf', 'brokenMimeType')).toEqual(13);
    expect(getRelevantLimit(fileSizeLimits, 'brokenName', 'application/pdf')).toEqual(12);
    expect(getRelevantLimit(fileSizeLimits, 'brokenName', 'brokenMimeType')).toEqual(1.4);
    expect(getRelevantLimit(fileSizeLimits, 'data.csv', 'brokenMimeType')).toEqual(1.4);
    expect(getRelevantLimit(fileSizeLimits, 'brokenName', 'text/plain')).toEqual(1.4);
    // conflicting information will resolve to the one which has a limit specified
    expect(getRelevantLimit(fileSizeLimits, 'data.xlsx', 'text/plain')).toEqual(2);
    // MimeType beats name
    expect(getRelevantLimit(fileSizeLimits, 'data.xlsx', 'application/pdf')).toEqual(12);
  });

  describe(UploadFileHandler.name, () => {
    const bucket = { id: 1, type: 'general', indexName: 'custom-index', endpoint: 'http://reis.internal' };
    let api: Record<string, jest.Mock>;
    let files: Record<string, jest.Mock>;

    function createHandler() {
      api = {
        getFileTypes: jest.fn().mockResolvedValue({ items: [{ fileNameExtension: '.pdf' }] }),
        uploadFile: jest.fn().mockResolvedValue({}),
        processFile: jest.fn().mockResolvedValue({}),
        deleteFile: jest.fn().mockResolvedValue({}),
      };
      (buildClient as jest.Mock).mockReturnValue(api);
      files = {
        create: jest.fn(() => ({})),
        findOneBy: jest.fn().mockResolvedValue({ id: 7, bucketId: 1 }),
        save: jest.fn((entity: object) => Promise.resolve({ id: 7, ...entity })),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      };
      const blob = { delete: jest.fn().mockResolvedValue({}), save: jest.fn().mockResolvedValue({}) };
      return new UploadFileHandler(
        { findOneBy: jest.fn().mockResolvedValue(bucket) } as unknown as BucketRepository,
        files as unknown as FileRepository,
        { save: jest.fn() } as unknown as ConversationFileRepository,
        blob as unknown as BlobRepository,
        { t: (key: string) => key } as unknown as I18nService,
      );
    }

    const params = { buffer: Buffer.from('x'), mimeType: 'application/pdf', fileName: 'a.pdf', fileSize: 1, bucketId: 1 };

    it('removes the uploaded chunks again when the upload fails afterwards', async () => {
      const handler = createHandler();
      api.processFile.mockRejectedValue(new Error('conversion failed'));

      await expect(handler.execute(new UploadFile({ ...params, embedType: 'vector_and_text' }))).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );

      expect(api.uploadFile).toHaveBeenCalled();
      expect(api.deleteFile).toHaveBeenCalledWith('7', 'custom-index');
      expect(files.delete).toHaveBeenCalledWith({ id: 7 });
    });
  });
});
