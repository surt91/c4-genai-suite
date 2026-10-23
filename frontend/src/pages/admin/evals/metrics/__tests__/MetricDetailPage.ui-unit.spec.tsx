import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { MetricDetailPage } from '../MetricDetailPage';
import { useMetric } from '../hooks/useMetricQueries';

vi.mock('../hooks/useMetricQueries', () => ({
  useMetric: vi.fn(),
}));

describe('MetricDetailPage', () => {
  it('shows an error when the metric cannot be loaded', () => {
    // @ts-expect-error we just mock the needed fields of the query
    vi.mocked(useMetric).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    render(<MetricDetailPage />);

    expect(screen.getByText(texts.evals.metric.loadFailed)).toBeInTheDocument();
  });
});
