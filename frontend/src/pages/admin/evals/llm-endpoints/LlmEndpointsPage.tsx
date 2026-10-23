import { Button, Card, Flex, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import type { LLMEndpoint } from 'src/api/generated-eval';
import { Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { totalWithoutCount, useStepBackFromEmptyPage } from 'src/lib/pagination';
import { texts } from 'src/texts';
import { LlmEndpointsTable } from './components/LlmEndpointsTable';
import { DeleteLlmEndpointDialog } from './dialogs/DeleteLlmEndpointDialog';
import { CreateLlmEndpointDialog, UpdateLlmEndpointDialog } from './dialogs/UpsertLlmEndpointDialog';
import { PAGE_SIZE, useLlmEndpoints } from './hooks/useLlmEndpointQueries';

export function LlmEndpointsPage() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [endpointToEdit, setEndpointToEdit] = useState<LLMEndpoint | null>(null);
  const [endpointToDelete, setEndpointToDelete] = useState<LLMEndpoint | null>(null);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const { data: loadedEndpoints, isFetching, isFetched, refetch } = useLlmEndpoints(page, query);
  // e.g. after the last item of the last page has been deleted
  useStepBackFromEmptyPage(page, setPage, isFetched, loadedEndpoints?.length ?? 0);

  // Data comes directly from React Query - no store sync needed
  const endpoints = loadedEndpoints ?? [];

  const effectiveTotal = totalWithoutCount(page, PAGE_SIZE, endpoints.length);

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    void refetch();
  });

  const handleRowClick = useEventCallback((endpoint: LLMEndpoint) => {
    // For now, just open edit dialog
    setEndpointToEdit(endpoint);
  });

  const handleEdit = useEventCallback((endpoint: LLMEndpoint) => {
    setEndpointToEdit(endpoint);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setEndpointToEdit(null);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback((endpoint: LLMEndpoint) => {
    setEndpointToDelete(endpoint);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setEndpointToDelete(null);
  });

  const handleDeleted = useEventCallback(() => {
    void refetch();
  });

  return (
    <>
      <Page>
        <Group justify="space-between" mb={16} wrap="nowrap">
          <Text component="h2" fz={30} lh="2.25rem">
            {texts.evals.llmEndpoints}
          </Text>

          <Flex gap="md">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.llmEndpoint.create}
            </Button>
          </Flex>
        </Group>

        <Card shadow="xs" radius="md" padding={24}>
          <LlmEndpointsTable
            endpoints={endpoints}
            isFetching={isFetching}
            isFetched={isFetched}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={!!endpointToDelete}
          />

          <Pagination page={page} pageSize={PAGE_SIZE} total={effectiveTotal} onPage={handleChangePage} />
        </Card>
      </Page>

      {showCreateDialog && <CreateLlmEndpointDialog onClose={handleCloseCreateDialog} onCreate={handleCreated} />}

      {endpointToEdit && (
        <UpdateLlmEndpointDialog
          target={endpointToEdit}
          onClose={handleCloseEditDialog}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      )}

      {endpointToDelete && (
        <DeleteLlmEndpointDialog endpoint={endpointToDelete} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
