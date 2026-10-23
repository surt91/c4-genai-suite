import { act, fireEvent, screen } from '@testing-library/react';
import { Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemountOnParam } from 'src/components/RemountOnParam';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { QaCatalogDetailPage } from './QaCatalogDetailPage';
import { useQaCatalogsStore } from './state';

const qaCatalog = {
  qaCatalogGet: vi.fn((id: string) =>
    Promise.resolve({ id, name: `Catalog ${id}`, status: 'READY', revision: 1, createdAt: new Date(), updatedAt: new Date() }),
  ),
  qaCatalogGetCatalogQaPairs: vi.fn(() => Promise.resolve([])),
  qaCatalogGetHistory: vi.fn(() => Promise.resolve({ versions: [] })),
};

vi.mock('src/api/state/apiEvalClient', () => ({
  useEvalApi: () => ({ qaCatalog }),
}));

function renderPage() {
  window.history.pushState({}, '', '/admin/evals/qa-catalogs/A');
  render(
    <>
      <Link to="/admin/evals/qa-catalogs/B">Open B</Link>
      <Routes>
        <Route
          path="/admin/evals/qa-catalogs/:catalogId"
          element={
            <RemountOnParam param="catalogId">
              <QaCatalogDetailPage />
            </RemountOnParam>
          }
        />
      </Routes>
    </>,
  );
}

describe('QaCatalogDetailPage', () => {
  beforeEach(() => {
    act(() => useQaCatalogsStore.getState().clearPendingChanges());
  });

  it('shows the number of pending additions', async () => {
    renderPage();
    await screen.findByText('Catalog A');

    act(() =>
      useQaCatalogsStore.getState().addPendingChange({
        type: 'addition',
        tempId: 'temp-1',
        data: { question: 'Q', expectedOutput: 'A', contexts: [] },
      }),
    );

    expect(await screen.findByText(`+1 ${texts.evals.qaCatalog.pendingAdditions(1)}`)).toBeInTheDocument();
  });

  it('does not take the pending changes to another catalog', async () => {
    renderPage();
    await screen.findByText('Catalog A');
    act(() =>
      useQaCatalogsStore.getState().addPendingChange({
        type: 'addition',
        tempId: 'temp-1',
        data: { question: 'Q', expectedOutput: 'A', contexts: [] },
      }),
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open B' }));

    await screen.findByText('Catalog B');
    expect(useQaCatalogsStore.getState().pendingChanges).toEqual([]);
  });
});
