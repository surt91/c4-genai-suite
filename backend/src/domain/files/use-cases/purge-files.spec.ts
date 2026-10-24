import type { Mock } from 'vitest';
import { FileRepository } from '../../database/index.js';
import { purgeFiles, purgeFilesOfUser, RagServerDeletionFailedException } from './purge-files.js';
import { buildClient, ResponseError } from './utils.js';

vi.mock('./utils.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildClient: vi.fn(),
}));

describe('purgeFiles', () => {
  const deleteFile = vi.fn();
  const files = { find: vi.fn(), delete: vi.fn() };
  const repository = files as unknown as FileRepository;
  const bucket = { id: 1, indexName: 'my-index', endpoint: 'http://reis' };

  beforeEach(() => {
    vi.clearAllMocks();
    deleteFile.mockResolvedValue(undefined);
    (buildClient as Mock).mockReturnValue({ deleteFile });
  });

  it('deletes the REI-S documents in the index of the bucket before the rows', async () => {
    files.find.mockResolvedValue([
      { id: 1, bucket },
      { id: 2, bucket: null },
      { id: 3, bucket },
    ]);

    await purgeFiles(repository, [1, 2, 3]);

    expect(buildClient).toHaveBeenCalledTimes(1);
    expect(deleteFile.mock.calls).toEqual([[{ file_id: '1', indexName: 'my-index' }], [{ file_id: '3', indexName: 'my-index' }]]);
    expect(files.delete.mock.calls).toEqual([[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]]);
    expect(deleteFile.mock.invocationCallOrder[0]).toBeLessThan(files.delete.mock.invocationCallOrder[0]);
  });

  it('ignores documents that are already gone', async () => {
    files.find.mockResolvedValue([{ id: 1, bucket }]);
    deleteFile.mockRejectedValue(new ResponseError(new Response(null, { status: 404 })));

    await purgeFiles(repository, [1]);

    expect(files.delete).toHaveBeenCalledWith({ id: 1 });
  });

  it('keeps the file and fails when REI-S is not reachable', async () => {
    files.find.mockResolvedValue([{ id: 1, bucket }]);
    deleteFile.mockRejectedValue(new TypeError('fetch failed'));

    await expect(purgeFiles(repository, [1])).rejects.toBeInstanceOf(RagServerDeletionFailedException);

    expect(files.delete).not.toHaveBeenCalled();
  });

  it('does nothing without files', async () => {
    await purgeFiles(repository, []);

    expect(files.find).not.toHaveBeenCalled();
  });

  it('purges all files of the user', async () => {
    files.find.mockResolvedValueOnce([{ id: 5 }]).mockResolvedValueOnce([{ id: 5, bucket }]);

    await purgeFilesOfUser(repository, 'user');

    expect(files.find).toHaveBeenNthCalledWith(1, { where: { userId: 'user' }, select: { id: true } });
    expect(deleteFile).toHaveBeenCalledWith({ file_id: '5', indexName: 'my-index' });
    expect(files.delete).toHaveBeenCalledWith({ id: 5 });
  });
});
