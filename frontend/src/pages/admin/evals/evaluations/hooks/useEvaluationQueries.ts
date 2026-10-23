import { useQuery } from '@tanstack/react-query';
import { EvaluationStatus } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';

const PAGE_SIZE = 20;

/**
 * Query hook to fetch all evaluations with pagination, search, and date filtering
 */
export function useEvaluations(page: number, limit = PAGE_SIZE, query?: string, fromDate?: Date, toDate?: Date) {
  const evalApi = useEvalApi();
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['evaluations', page, limit, query, fromDate, toDate],
    queryFn: () =>
      evalApi.evaluations.evaluationsGetAll(query || undefined, fromDate || undefined, toDate || undefined, offset, limit),
  });
}

/**
 * Query hook to fetch a single evaluation by ID
 */
export function useEvaluation(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['evaluation', id],
    queryFn: () => evalApi.evaluations.evaluationsGet(id!),
    enabled: !!id,
  });
}

/**
 * Query hook to fetch detailed evaluation summary with metrics
 */
export const EVALUATION_POLL_INTERVAL = 5000;

/** Whether the evaluation is waiting or running, i.e. its status and results change. */
export const isEvaluationActive = (status?: EvaluationStatus) =>
  status === EvaluationStatus.Pending || status === EvaluationStatus.Running;

export function useEvaluationSummary(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['evaluationSummary', id],
    queryFn: () => evalApi.evaluations.evaluationsGetEvaluationDetailSummary(id!),
    enabled: !!id,
    // the evaluation runs in the background (also while it waits to be started)
    refetchInterval: (query) => (isEvaluationActive(query.state.data?.status) ? EVALUATION_POLL_INTERVAL : false),
  });
}
