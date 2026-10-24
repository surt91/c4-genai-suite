/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError } from 'src/api';
import type { EvaluationDelete, EvaluationsPostData, EvaluationUpdate } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';

vi.mock('src/api/state/apiEvalClient');
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useExportEvaluationResults,
  useUpdateEvaluation,
} from './useEvaluationMutations';

vi.mock('src/lib/notifications', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useEvaluationMutations', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  const mockEvaluationsApi = {
    evaluationsPost: vi.fn(),
    evaluationsPatch: vi.fn(),
    evaluationsDelete: vi.fn(),
    evaluationsGetResultsExport: vi.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    });
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.mocked(useEvalApi).mockReturnValue({
      evaluations: mockEvaluationsApi as any,
    } as any);

    vi.clearAllMocks();
  });

  describe('useCreateEvaluation', () => {
    it('should create an evaluation', async () => {
      const mockResult = {
        id: '1',
        name: 'New Evaluation',
        createdAt: new Date(),
        status: 'PENDING' as any,
      };

      mockEvaluationsApi.evaluationsPost.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCreateEvaluation(), { wrapper });

      const createDto: EvaluationsPostData['body'] = {
        name: 'New Evaluation',
        catalogId: 'catalog-1',
        gaibleAssistantId: 1,
        gaibleAssistantName: 'Test Assistant',
        metrics: ['metric-1'],
        testCasesPerQaPair: 1,
        testCases: [],
      };

      result.current.mutate(createDto);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsPost).toHaveBeenCalledWith({ body: createDto });
      expect(result.current.data).toEqual(mockResult);
    });

    it('should invalidate evaluations queries on success', async () => {
      const mockResult = { id: '1', name: 'Test' };
      mockEvaluationsApi.evaluationsPost.mockResolvedValue(mockResult);

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateEvaluation(), { wrapper });

      const createDto: EvaluationsPostData['body'] = {
        name: 'Test',
        catalogId: 'catalog-1',
        gaibleAssistantId: 1,
        gaibleAssistantName: 'Test Assistant',
        metrics: ['metric-1'],
        testCasesPerQaPair: 1,
        testCases: [],
      };

      result.current.mutate(createDto);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['evaluations'] });
    });
  });

  describe('useUpdateEvaluation', () => {
    it('should update evaluation name', async () => {
      const mockResult = {
        id: '1',
        name: 'Updated Name',
        createdAt: new Date(),
      };

      mockEvaluationsApi.evaluationsPatch.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useUpdateEvaluation(), { wrapper });

      const updateData: EvaluationUpdate = {
        name: 'Updated Name',
        version: 1,
      };

      result.current.mutate({ id: '1', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsPatch).toHaveBeenCalledWith({ evaluation_id: '1', evaluationUpdate: updateData });
    });

    it('should report a version conflict', async () => {
      mockEvaluationsApi.evaluationsPatch.mockRejectedValue(new ResponseError(new Response(null, { status: 409 })));

      const { result } = renderHook(() => useUpdateEvaluation(), { wrapper });

      result.current.mutate({ id: '1', data: { name: 'Updated', version: 1 } });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(toast.error).toHaveBeenCalledWith(texts.evals.evaluations.versionConflict);
    });

    it('should invalidate related queries on success', async () => {
      const mockResult = { id: '1', name: 'Updated' };
      mockEvaluationsApi.evaluationsPatch.mockResolvedValue(mockResult);

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateEvaluation(), { wrapper });

      result.current.mutate({ id: '1', data: { name: 'Updated', version: 1 } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['evaluation', '1'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['evaluationSummary', '1'] });
    });
  });

  describe('useDeleteEvaluation', () => {
    it('should delete an evaluation', async () => {
      mockEvaluationsApi.evaluationsDelete.mockResolvedValue({});

      const { result } = renderHook(() => useDeleteEvaluation(), { wrapper });

      const deleteData: EvaluationDelete = {
        version: 1,
      };

      result.current.mutate({ id: '1', data: deleteData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsDelete).toHaveBeenCalledWith({ evaluation_id: '1', evaluationDelete: deleteData });
    });

    it('should invalidate evaluations queries on success', async () => {
      mockEvaluationsApi.evaluationsDelete.mockResolvedValue({});

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteEvaluation(), { wrapper });

      result.current.mutate({ id: '1', data: { version: 1 } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['evaluations'] });
    });
  });

  describe('useExportEvaluationResults', () => {
    it('should export evaluation results', async () => {
      const mockCsvData = 'question,answer,score\ntest,test,1.0';
      mockEvaluationsApi.evaluationsGetResultsExport.mockResolvedValue(mockCsvData);

      const { result } = renderHook(() => useExportEvaluationResults(), { wrapper });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetResultsExport).toHaveBeenCalledWith({ evaluation_id: '1' });
      expect(result.current.data).toBe(mockCsvData);
    });
  });
});
