import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponseError } from 'src/api';
import type { LLMEndpoint, LLMEndpointCreate, LLMEndpointDelete, LLMEndpointUpdate } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';

export const UNCHANGED_API_KEY = 'd1d04d4e-38b9-441c-a6e3-68fb1e18f0c0';

/**
 * Mutation hook for creating LLM endpoints
 */
export function useCreateLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LLMEndpointCreate) => evalApi.llmEndpoints.llmEndpointsPost({ llmEndpointCreate: data }),
    onSuccess: (_endpoint: LLMEndpoint) => {
      toast.success(texts.evals.llmEndpoint.createSuccess);
      void queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to create endpoint:', error);
      toast.error(texts.evals.llmEndpoint.createFailed);
    },
  });
}

/**
 * Mutation hook for updating LLM endpoints
 */
export function useUpdateLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMEndpointUpdate }) =>
      evalApi.llmEndpoints.llmEndpointsPatch({ llm_endpoint_id: id, llmEndpointUpdate: data }),
    onSuccess: (endpoint: LLMEndpoint) => {
      toast.success(texts.evals.llmEndpoint.updateSuccess);
      void queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
      void queryClient.invalidateQueries({ queryKey: ['llmEndpoint', endpoint.id] });
    },
    onError: (error: unknown) => {
      console.error('Failed to update endpoint:', error);

      // Handle version conflict (409)
      if (error instanceof ResponseError && error.status === 409) {
        toast.error(texts.evals.llmEndpoint.versionConflict);
      } else {
        toast.error(texts.evals.llmEndpoint.updateFailed);
      }
    },
  });
}

/**
 * Mutation hook for deleting LLM endpoints
 */
export function useDeleteLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMEndpointDelete }) =>
      evalApi.llmEndpoints.llmEndpointsDelete({ llm_endpoint_id: id, llmEndpointDelete: data }),
    onSuccess: () => {
      toast.success(texts.evals.llmEndpoint.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to delete endpoint:', error);

      // Handle version conflict (409)
      if (error instanceof ResponseError && error.status === 409) {
        toast.error(texts.evals.llmEndpoint.versionConflict);
      } else {
        toast.error(texts.evals.llmEndpoint.deleteFailed);
      }
    },
  });
}
