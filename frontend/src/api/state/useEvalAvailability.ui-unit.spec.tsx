import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from 'src/pages/admin/test-utils';
import { useEvalAvailability } from './useEvalAvailability';

const getEvalServiceStatus = vi.fn();

vi.mock('./apiAppClient', () => ({
  useApi: () => ({ eval: { getEvalServiceStatus } }),
}));

describe('useEvalAvailability', () => {
  it('uses the status of the eval service', async () => {
    getEvalServiceStatus.mockResolvedValue({ available: true });

    const { result } = renderHook(() => useEvalAvailability());

    expect(result.current).toEqual({ isEvalAvailable: false, isLoading: true });
    await waitFor(() => expect(result.current).toEqual({ isEvalAvailable: true, isLoading: false }));
  });

  it('hides the evals when the status cannot be loaded', async () => {
    getEvalServiceStatus.mockRejectedValue(new Error('Bad Gateway'));

    const { result } = renderHook(() => useEvalAvailability());

    await waitFor(() => expect(result.current).toEqual({ isEvalAvailable: false, isLoading: false }));
  });
});
