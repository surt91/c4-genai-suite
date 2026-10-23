import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { useUpdateEvaluation } from '../hooks/useEvaluationMutations';
import { EditEvaluationNameDialog } from './EditEvaluationNameDialog';

vi.mock('../hooks/useEvaluationMutations', () => ({
  useUpdateEvaluation: vi.fn(),
}));

describe('EditEvaluationNameDialog', () => {
  it('does not accept a name of only spaces', async () => {
    const mutate = vi.fn();
    // @ts-expect-error we just mock the needed fields of the mutation
    vi.mocked(useUpdateEvaluation).mockReturnValue({ mutate, isPending: false, error: null });
    const evaluation = { id: '1', name: 'Evaluation', version: 1 } as EvaluationDetailSummary;

    render(<EditEvaluationNameDialog evaluation={evaluation} onClose={vi.fn()} />);
    const input = screen.getByDisplayValue('Evaluation');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText(texts.evals.evaluations.nameRequired)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
