import { Button, Card, Flex, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Metric } from 'src/api/generated-eval';
import { Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { totalWithoutCount, useStepBackFromEmptyPage } from 'src/lib/pagination';
import { texts } from 'src/texts';
import { MetricsTable } from './components/MetricsTable';
import { DeleteMetricDialog } from './dialogs/DeleteMetricDialog';
import { CreateMetricDialog, UpdateMetricDialog } from './dialogs/UpsertMetricDialog';
import { PAGE_SIZE, useMetrics } from './hooks/useMetricQueries';

export function MetricsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<Metric | null>(null);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const { data: loadedMetrics, isFetching, isFetched, refetch } = useMetrics(page, query);
  // e.g. after the last item of the last page has been deleted
  useStepBackFromEmptyPage(page, setPage, isFetched, loadedMetrics?.length ?? 0);

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    void refetch();
  });

  const handleRowClick = useEventCallback((metric: Metric) => {
    // Navigate to detail page
    void navigate(`/admin/evals/metrics/${metric.id}`);
  });

  const handleEdit = useEventCallback((metric: Metric) => {
    setMetricToEdit(metric);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setMetricToEdit(null);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback((metric: Metric) => {
    setMetricToDelete(metric);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setMetricToDelete(null);
  });

  const handleDeleted = useEventCallback(() => {
    void refetch();
  });

  return (
    <>
      <Page>
        <Group justify="space-between" mb={16} wrap="nowrap">
          <Text component="h2" fz={30} lh="2.25rem">
            {texts.evals.metrics}
          </Text>

          <Flex gap="md">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.metric.create}
            </Button>
          </Flex>
        </Group>

        <Card shadow="xs" radius="md" padding={24}>
          <MetricsTable
            metrics={loadedMetrics ?? []}
            isFetching={isFetching}
            isFetched={isFetched}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={metricToDelete?.id}
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={totalWithoutCount(page, PAGE_SIZE, loadedMetrics?.length ?? 0)}
            onPage={handleChangePage}
          />
        </Card>
      </Page>

      {showCreateDialog && <CreateMetricDialog onClose={handleCloseCreateDialog} onCreate={handleCreated} />}

      {metricToEdit && (
        <UpdateMetricDialog
          target={metricToEdit}
          onClose={handleCloseEditDialog}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      )}

      {metricToDelete && (
        <DeleteMetricDialog metric={metricToDelete} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
