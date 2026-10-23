import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { EvaluationsPage } from './EvaluationsPage';
import { useEvaluations } from './hooks/useEvaluationQueries';

vi.mock('./hooks/useEvaluationQueries', () => ({
  useEvaluations: vi.fn(),
}));

vi.mock('./CreateEvaluationDialog', () => ({
  CreateEvaluationDialog: () => null,
}));

vi.mock('./components/EvaluationsTable', () => ({
  EvaluationsTable: () => null,
}));

describe('EvaluationsPage', () => {
  it('pages through the evaluations', () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: `${i}`, name: `Evaluation ${i}` }));
    // @ts-expect-error we just mock the needed fields of the query
    vi.mocked(useEvaluations).mockReturnValue({ data: fullPage, isFetching: false, isFetched: true });

    render(<EvaluationsPage />);
    expect(useEvaluations).toHaveBeenLastCalledWith(1, 20, undefined);

    fireEvent.click(screen.getByRole('button', { name: '»' }));

    expect(useEvaluations).toHaveBeenLastCalledWith(2, 20, undefined);
  });
});
