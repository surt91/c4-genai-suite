import { Alert, Card, Container, Group, Loader, Pagination, Stack, Tabs, Title } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle, IconList } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from 'src/components';
import { texts } from 'src/texts';
import { EvaluationActionsMenu } from './components/EvaluationActionsMenu';
import { EvaluationCard } from './components/EvaluationCard';
import { EvaluationStatusChip } from './components/EvaluationStatusChip';
import { ResultsSummary } from './components/ResultsSummary';
import { TestCaseResultsTable } from './components/TestCaseResultsTable';
import { DeleteEvaluationDialog } from './dialogs/DeleteEvaluationDialog';
import { EditEvaluationNameDialog } from './dialogs/EditEvaluationNameDialog';
import { useExportEvaluationResults } from './hooks/useEvaluationMutations';
import { EVALUATION_POLL_INTERVAL, isEvaluationActive, useEvaluationSummary } from './hooks/useEvaluationQueries';
import { useGroupedResults } from './hooks/useEvaluationResultsQueries';

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [editNameDialogOpened, setEditNameDialogOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [resultsPage, setResultsPage] = useState(1);

  const exportMutation = useExportEvaluationResults();
  const t = texts.evals.evaluations.detail;

  // Fetch evaluation summary
  const { data: evaluation, isLoading, isError, error, refetch } = useEvaluationSummary(id);

  // The summary is polled while the evaluation is pending or running, the results as well while they are shown.
  const isActive = isEvaluationActive(evaluation?.status);
  const {
    data: results = [],
    isFetching: isResultsFetching,
    isFetched: isResultsFetched,
    refetch: refetchResults,
  } = useGroupedResults(id, resultsPage, 20, isActive && activeTab === 'results' ? EVALUATION_POLL_INTERVAL : undefined);

  // the final results, when the evaluation has finished
  const wasActive = useRef(isActive);
  useEffect(() => {
    if (wasActive.current && !isActive) {
      void refetchResults();
    }
    wasActive.current = isActive;
  }, [isActive, refetchResults]);

  // Handlers
  const handleExport = () => {
    if (!id) return;
    exportMutation.mutate(id);
  };

  const handleEditName = () => {
    setEditNameDialogOpened(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpened(true);
  };

  const handleDeleteSuccess = () => {
    void navigate('/admin/evals/evaluations');
  };

  const handleEditSuccess = () => {
    void refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <Page>
        <Container size="lg">
          <Stack gap="md" align="center" pt="xl">
            <Loader size="lg" />
            <Title order={3}>{t.loading}</Title>
          </Stack>
        </Container>
      </Page>
    );
  }

  // Error state
  if (isError || !evaluation) {
    return (
      <Page>
        <Container size="lg">
          <Alert icon={<IconAlertCircle size={16} />} title={texts.evals.evaluations.errorLoading} color="red">
            {error?.message || texts.evals.evaluations.errorNotFound}
          </Alert>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container size="lg">
        <Stack gap="lg">
          {/* Header with Status */}
          <Group justify="space-between">
            <Group gap="md">
              <Title order={2}>{evaluation.name}</Title>
              <EvaluationStatusChip status={evaluation.status} />
            </Group>
            <EvaluationActionsMenu
              evaluation={evaluation}
              onExport={handleExport}
              onEditName={handleEditName}
              onDelete={handleDelete}
              disabled={exportMutation.isPending}
            />
          </Group>

          {/* Status Banner for Running Evaluations */}
          {evaluation.status === 'RUNNING' && (
            <Alert color="blue" title={t.runningTitle}>
              {t.running}
            </Alert>
          )}

          {/* Status Banner for Failed Evaluations */}
          {evaluation.status === 'FAILURE' && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title={t.failedTitle}>
              {t.failed}
            </Alert>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
                {t.overview}
              </Tabs.Tab>
              <Tabs.Tab value="results" leftSection={<IconList size={16} />}>
                {t.results(evaluation.testCaseProgress.total)}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack gap="lg">
                {/* Evaluation Details Card (with pie chart on right) */}
                <EvaluationCard evaluation={evaluation} />

                {/* Metric Results - Show for SUCCESS or RUNNING with results */}
                {(evaluation.status === 'SUCCESS' ||
                  (evaluation.status === 'RUNNING' && evaluation.metricResults.length > 0)) && (
                  <ResultsSummary evaluation={evaluation} />
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="results" pt="md">
              <Stack gap="lg">
                <Card padding="lg" radius="md" withBorder>
                  <Stack gap="md">
                    <Title order={4}>{t.testCaseResults}</Title>

                    <TestCaseResultsTable
                      results={results}
                      metrics={evaluation.metrics}
                      isFetching={isResultsFetching}
                      isFetched={isResultsFetched}
                    />

                    {results.length > 0 && (
                      <Group justify="center">
                        <Pagination
                          total={Math.ceil(evaluation.testCaseProgress.total / 20)}
                          value={resultsPage}
                          onChange={setResultsPage}
                        />
                      </Group>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      {/* Dialogs */}
      {deleteDialogOpened && (
        <DeleteEvaluationDialog
          evaluation={evaluation}
          onClose={() => setDeleteDialogOpened(false)}
          onDeleted={handleDeleteSuccess}
        />
      )}

      {editNameDialogOpened && (
        <EditEvaluationNameDialog
          evaluation={evaluation}
          onClose={() => setEditNameDialogOpened(false)}
          onUpdated={handleEditSuccess}
        />
      )}
    </Page>
  );
}
