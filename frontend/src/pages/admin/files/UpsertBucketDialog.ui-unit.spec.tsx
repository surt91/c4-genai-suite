import { useForm } from '@mantine/form';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketDto, UpsertBucketDto } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { FileSizeDynamicFields, UpsertBucketDialog } from './UpsertBucketDialog';

const getFileTypes = vi.fn(() => Promise.resolve({ items: [{ value: '.pdf', label: 'PDF' }] }));
const getBucketDefaults = vi.fn(() => Promise.resolve<{ endpoint?: string }>({}));

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => ({ files: { getFileTypes, getBucketDefaults } }),
}));

describe('UpsertBucketDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the file types with the endpoint and the headers', async () => {
    render(<UpsertBucketDialog onClose={vi.fn()} onCreate={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(texts.common.endpoint, { exact: false }), { target: { value: 'http://reis' } });
    await waitFor(() => expect(getFileTypes).toHaveBeenCalledWith({ endpoint: 'http://reis', headers: '' }));
    fireEvent.change(screen.getByLabelText(texts.common.headers, { exact: false }), { target: { value: 'x-api-key=secret' } });

    await waitFor(() => expect(getFileTypes).toHaveBeenLastCalledWith({ endpoint: 'http://reis', headers: 'x-api-key=secret' }));
  });

  it('prefills the default endpoint for new buckets and loads its file types', async () => {
    getBucketDefaults.mockResolvedValueOnce({ endpoint: 'http://reis:3201' });

    render(<UpsertBucketDialog onClose={vi.fn()} onCreate={vi.fn()} onUpdate={vi.fn()} />);

    const endpoint = screen.getByLabelText(texts.common.endpoint, { exact: false });
    await waitFor(() => expect(endpoint).toHaveValue('http://reis:3201'));
    await waitFor(() => expect(getFileTypes).toHaveBeenCalledWith({ endpoint: 'http://reis:3201', headers: '' }));
    expect(await screen.findAllByText('PDF')).not.toHaveLength(0);
  });

  it('does not prefill the endpoint when updating a bucket', async () => {
    const target = {
      id: 1,
      name: 'Bucket',
      type: 'general',
      endpoint: 'http://existing',
      headers: '',
      indexName: '',
      isDefault: false,
      perUserQuota: 20,
      allowedFileNameExtensions: ['.pdf'],
      fileSizeLimits: { general: 1 },
    } as unknown as BucketDto;

    render(<UpsertBucketDialog target={target} onClose={vi.fn()} onCreate={vi.fn()} onUpdate={vi.fn()} />);

    await waitFor(() => expect(getFileTypes).toHaveBeenCalledWith({ endpoint: 'http://existing', headers: '' }));
    expect(screen.getByLabelText(texts.common.endpoint, { exact: false })).toHaveValue('http://existing');
    expect(getBucketDefaults).not.toHaveBeenCalled();
  });
});

describe('FileSizeDynamicFields component', () => {
  it('should add a new field when clicking the add button', () => {
    const { result } = renderHook(() =>
      useForm<UpsertBucketDto>({
        initialValues: {
          name: '',
          endpoint: '',
          indexName: '',
          headers: '',
          isDefault: false,
          perUserQuota: 20,
          allowedFileNameExtensions: [],
          fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
        },
      }),
    );

    const form = result.current;
    render(<FileSizeDynamicFields form={form} name="fileSizeLimits" label="File Size Limit" suffix="MB" />);

    const addButton = screen.getByTestId('fileSizeLimitsDynamic.add');
    fireEvent.click(addButton);

    // Find the newly added key input field (it's the last one)
    const keyInputs = screen.getAllByPlaceholderText('pdf');
    const newKeyInput = keyInputs[keyInputs.length - 1];
    fireEvent.change(newKeyInput, { target: { value: 'xlsx' } });

    // Find the newly added value input field (it's the last one)
    const valueInputs = screen.getAllByPlaceholderText('10');
    const newValueInput = valueInputs[valueInputs.length - 1];
    fireEvent.change(newValueInput, { target: { value: '13' } });

    const formValues = form.getValues();
    expect(formValues.fileSizeLimits).toBeDefined();
    expect(formValues.fileSizeLimits.xlsx).toBe(13);
  });

  it('should remove a field when clicking the remove button', () => {
    const { result } = renderHook(() =>
      useForm<UpsertBucketDto>({
        initialValues: {
          name: '',
          endpoint: '',
          indexName: '',
          headers: '',
          isDefault: false,
          perUserQuota: 20,
          allowedFileNameExtensions: [],
          fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
        },
      }),
    );

    const form = result.current;
    render(<FileSizeDynamicFields form={form} name="fileSizeLimits" label="File Size Limit" suffix="MB" />);

    const rows = screen.getAllByTestId(/fileSizeLimitsDynamic\.\d+\.row/);
    const rowToRemove = rows.find((row) => {
      const keyInput = within(row).getByTestId(/fileSizeLimitsDynamic\.\d+\.key/);
      return (keyInput as HTMLInputElement).value === 'pptx';
    });

    const removeButton = within(rowToRemove!).getByTestId(/fileSizeLimitsDynamic\.\d+\.remove/);
    fireEvent.click(removeButton);

    const formValues = form.getValues();
    expect(formValues.fileSizeLimits.pptx).toBeUndefined();
  });
});
