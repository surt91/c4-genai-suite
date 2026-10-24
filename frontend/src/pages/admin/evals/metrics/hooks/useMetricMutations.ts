import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseError } from 'src/api';
import type { Metric, MetricCreate, MetricDelete, MetricUpdate } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';

/**
 * Mutation hook for creating metrics
 */
export function useCreateMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MetricCreate) => evalApi.metrics.metricsPost({ metricCreate: data }),
    onSuccess: () => {
      toast.success(texts.evals.metric.createSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to create metric:', error);
      toast.error(texts.evals.metric.createFailed);
    },
  });
}

/**
 * Mutation hook for updating metrics
 */
export function useUpdateMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MetricUpdate }) =>
      evalApi.metrics.metricsPatch({ metric_id: id, metricUpdate: data }),
    onSuccess: (metric: Metric) => {
      toast.success(texts.evals.metric.updateSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['metric', metric.id] });
    },
    onError: (error: unknown) => {
      console.error('Failed to update metric:', error);

      // Handle version conflict (409)
      if (error instanceof ResponseError && error.status === 409) {
        toast.error(texts.evals.metric.versionConflict);
      } else {
        toast.error(texts.evals.metric.updateFailed);
      }
    },
  });
}

/**
 * Mutation hook for deleting metrics
 */
export function useDeleteMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MetricDelete }) =>
      evalApi.metrics.metricsDelete({ metric_id: id, metricDelete: data }),
    onSuccess: () => {
      toast.success(texts.evals.metric.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to delete metric:', error);

      // Handle version conflict (409)
      if (error instanceof ResponseError && error.status === 409) {
        toast.error(texts.evals.metric.versionConflict);
      } else {
        toast.error(texts.evals.metric.deleteFailed);
      }
    },
  });
}
