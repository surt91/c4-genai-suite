import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { JsonBodyType } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BucketDto, FileDto } from 'src/api';
import { mockedAPI } from 'src/mock/factory';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { BucketsPage } from './BucketsPage';

const bucket = (id: number, name: string) =>
  ({ id, name, type: 'general', endpoint: 'http://reis', indexName: name }) as unknown as BucketDto;
const file = (id: number, fileName: string): FileDto => ({
  id,
  fileName,
  fileSize: 100,
  mimeType: 'application/pdf',
  uploadedAt: new Date('2026-01-01'),
});

describe('BucketsPage', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows the first page of the results when searching', async () => {
    const files = Array.from({ length: 25 }, (_, i) => file(100 + i, `document-${i}.pdf`));
    new mockedAPI()
      .withGet<JsonBodyType>('/api/buckets', { items: [bucket(1, 'Bucket A')] })
      .withGet<JsonBodyType>('/api/buckets/1', bucket(1, 'Bucket A'))
      .withGet<JsonBodyType>('/api/buckets/1/files', { items: files, total: files.length })
      .run();
    window.history.pushState({}, '', '/admin/files/1');

    render(
      <Routes>
        <Route path="/admin/files/*" element={<BucketsPage />} />
      </Routes>,
    );

    await screen.findByText('document-0.pdf');
    fireEvent.click(screen.getByRole('button', { name: texts.accessibility.pdf.nextPage }));
    expect(await screen.findByText(texts.common.page(2, 2))).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(texts.common.search), { target: { value: 'document-3.pdf' } });

    expect(await screen.findByText('document-3.pdf')).toBeInTheDocument();
    expect(screen.getByText(texts.common.page(1, 1))).toBeInTheDocument();
  });

  it('does not keep the selection of files when another bucket is shown', async () => {
    new mockedAPI()
      .withGet<JsonBodyType>('/api/buckets', { items: [bucket(1, 'Bucket A'), bucket(2, 'Bucket B')] })
      .withGet<JsonBodyType>('/api/buckets/1', bucket(1, 'Bucket A'))
      .withGet<JsonBodyType>('/api/buckets/2', bucket(2, 'Bucket B'))
      .withGet<JsonBodyType>('/api/buckets/1/files', { items: [file(11, 'a1.pdf'), file(12, 'a2.pdf')], total: 2 })
      .withGet<JsonBodyType>('/api/buckets/2/files', { items: [file(21, 'b1.pdf'), file(22, 'b2.pdf')], total: 2 })
      .run();
    window.history.pushState({}, '', '/admin/files/1');

    render(
      <Routes>
        <Route path="/admin/files/*" element={<BucketsPage />} />
      </Routes>,
    );

    const firstRow = (await screen.findByText('a1.pdf')).closest('tr')!;
    fireEvent.click(within(firstRow).getByRole('checkbox'));
    expect(screen.getByText(texts.common.rowsSelected(1))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Bucket B' }));

    await screen.findByText('b1.pdf');
    await waitFor(() => expect(screen.getByText(texts.common.rowsSelected(0))).toBeInTheDocument());
    expect(screen.queryByText('a1.pdf')).not.toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });
});
