import {
  DashboardApi,
  EvaluationResultsApi,
  EvaluationsApi,
  LlmEndpointsApi,
  MetricsApi,
  QaCatalogApi,
} from 'src/api/generated-eval';
import { createClient } from 'src/api/generated-eval/client';
import { useTransientNavigate } from 'src/hooks';
import { configureClient } from './client';
import { useEvalClientStore } from './zustand/evalClientStore';

export function useEvalApi() {
  const navigate = useTransientNavigate();
  return useEvalClientStore((state) => state.getEvalClient(navigate));
}

export class EvalClient {
  public readonly dashboard: DashboardApi;
  public readonly evaluationResults: EvaluationResultsApi;
  public readonly evaluations: EvaluationsApi;
  public readonly llmEndpoints: LlmEndpointsApi;
  public readonly metrics: MetricsApi;
  public readonly qaCatalog: QaCatalogApi;

  constructor(
    public readonly url: string,
    onUnauthorized: () => void = () => {},
  ) {
    const client = configureClient(createClient({ baseUrl: url }), onUnauthorized);

    this.dashboard = new DashboardApi({ client });
    this.evaluationResults = new EvaluationResultsApi({ client });
    this.evaluations = new EvaluationsApi({ client });
    this.llmEndpoints = new LlmEndpointsApi({ client });
    this.metrics = new MetricsApi({ client });
    this.qaCatalog = new QaCatalogApi({ client });
  }
}
