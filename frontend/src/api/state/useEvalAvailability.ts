import { useQuery } from '@tanstack/react-query';
import { useApi } from './apiAppClient';

/**
 * Whether the evaluation service is enabled (`GET /api/eval/status`, based on the backend's `EVAL_SERVICE_ENABLED`).
 * The result is cached for 5 minutes, it is a deployment-time flag.
 *
 * Used by `AdminPage` to show or hide the evaluations. When the request fails, the evals section is hidden rather than
 * broken.
 */
export function useEvalAvailability(): { isEvalAvailable: boolean; isLoading: boolean } {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['eval-service-status'],
    queryFn: async () => {
      try {
        return await api.eval.getEvalServiceStatus();
      } catch {
        return { available: false };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    isEvalAvailable: data?.available ?? false,
    isLoading,
  };
}
