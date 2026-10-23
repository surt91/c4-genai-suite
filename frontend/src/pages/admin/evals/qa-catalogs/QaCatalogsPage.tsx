import { ActionIcon, Button, Card, Group, Skeleton, Text, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { QACatalogPreview } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { ConfirmDialog, Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import tableClasses from '../evaluations/components/DataTable.module.css';
import { QaCatalogStatusChip } from './components/QaCatalogStatusChip';
import { CreateQaCatalogDialog } from './dialogs/CreateQaCatalogDialog';

const PAGE_SIZE = 20;

export function QaCatalogsPage() {
  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const {
    data: catalogs,
    isFetching,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: ['qaCatalogs', page, query],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetAll(query || undefined, page * PAGE_SIZE, PAGE_SIZE),
  });

  const deleteMutation = useMutation({
    mutationFn: (catalogId: string) => evalApi.qaCatalog.qaCatalogDelete(catalogId),
    onSuccess: () => {
      toast.success(texts.evals.qaCatalog.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.deleteFailed);
    },
  });

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    void refetch();
  });

  const handleRowClick = useEventCallback((catalog: QACatalogPreview) => {
    void navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Page>
        <Group justify="space-between" wrap="nowrap" mb={16}>
          <Title order={2} fz={30} lh="2.25rem" fw={400}>
            {texts.evals.qaCatalogs}
          </Title>

          <Group gap={16} wrap="nowrap">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.qaCatalog.create}
            </Button>
          </Group>
        </Group>

        <Card shadow="xs" padding={24} radius="md">
          <table className={clsx(tableClasses.table, tableClasses.fixed)}>
            <thead>
              <tr>
                <th>{texts.evals.qaCatalog.name}</th>
                <th style={{ width: '7rem' }}>{texts.evals.qaCatalog.length}</th>
                <th style={{ width: '8rem' }}>{texts.evals.qaCatalog.status}</th>
                <th style={{ width: '9rem' }}>{texts.evals.qaCatalog.createdAt}</th>
                <th style={{ width: '9rem' }}>{texts.evals.qaCatalog.updatedAt}</th>
                <th style={{ width: '5rem' }}>{texts.evals.qaCatalog.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !isFetched && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                      <td>
                        <Skeleton height={20} />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {isFetched &&
                catalogs?.map((catalog) => (
                  <tr className={tableClasses.clickableRow} key={catalog.id} onClick={() => handleRowClick(catalog)}>
                    <td className={tableClasses.truncate} style={{ fontWeight: 600 }}>
                      {catalog.name}
                    </td>
                    <td className={tableClasses.clip}>{catalog.length}</td>
                    <td className={tableClasses.clip}>
                      <QaCatalogStatusChip status={catalog.status} />
                    </td>
                    <td className={tableClasses.clip}>{formatDate(catalog.createdAt)}</td>
                    <td className={tableClasses.clip}>{formatDate(catalog.updatedAt)}</td>
                    <td className={tableClasses.clip}>
                      <ConfirmDialog
                        title={texts.evals.qaCatalog.deleteConfirmTitle}
                        text={texts.evals.qaCatalog.deleteConfirmText(catalog.name)}
                        onPerform={() => deleteMutation.mutate(catalog.id)}
                      >
                        {({ onClick }) => (
                          <ActionIcon
                            variant="subtle"
                            size="lg"
                            color="red"
                            c="red.7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClick();
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        )}
                      </ConfirmDialog>
                    </td>
                  </tr>
                ))}

              {isFetched && catalogs?.length === 0 && (
                <tr>
                  <td colSpan={6} className={tableClasses.empty}>
                    <div>
                      <Text mb={8}>{texts.evals.qaCatalog.empty}</Text>
                      <Text fz="sm">{texts.evals.qaCatalog.emptyHint}</Text>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={page} pageSize={PAGE_SIZE} total={catalogs?.length ?? 0} onPage={handleChangePage} />
        </Card>
      </Page>

      {showCreateDialog && <CreateQaCatalogDialog onClose={handleCloseCreateDialog} onCreated={handleCreated} />}
    </>
  );
}
