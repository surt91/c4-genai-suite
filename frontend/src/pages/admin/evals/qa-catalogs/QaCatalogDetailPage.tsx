import { Box, Button, Card, Group, Menu, Paper, Select, Skeleton, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowLeft,
  IconChevronDown,
  IconDeviceFloppy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { QACatalogVersionHistoryItem, QAPair } from 'src/api/generated-eval';
import { QACatalogStatus } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { ConfirmDialog, Page, Pagination } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { toast } from 'src/lib/notifications';
import { totalWithoutCount } from 'src/lib/pagination';
import { texts } from 'src/texts';
import { QaCatalogStatusChip } from './components/QaCatalogStatusChip';
import { QaPairsTable } from './components/QaPairsTable';
import { AddQaPairDialog } from './dialogs/AddQaPairDialog';
import { DownloadQaCatalogDialog } from './dialogs/DownloadQaCatalogDialog';
import { EditQaPairDialog } from './dialogs/EditQaPairDialog';
import { UploadQaCatalogDialog } from './dialogs/UploadQaCatalogDialog';
import { type PendingChange, useQaCatalogsStore } from './state';

const PAGE_SIZE = 20;

export function QaCatalogDetailPage() {
  const { catalogId } = useParams<{ catalogId: string }>();

  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    pendingChanges,
    addPendingChange,
    removePendingChange,
    clearPendingChanges,
    getEffectiveQaPairs,
    hasPendingChanges,
    getPendingChangeCounts,
  } = useQaCatalogsStore();

  // The pending changes belong to this catalog (version): forget changes of another one and when leaving the page.
  useEffect(() => {
    clearPendingChanges();
    return () => clearPendingChanges();
  }, [catalogId, clearPendingChanges]);

  const [page, setPage] = useState(0);
  const [editingPair, setEditingPair] = useState<QAPair | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Fetch catalog details
  const {
    data: catalog,
    isLoading: isCatalogLoading,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['qaCatalog', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGet({ catalog_id: catalogId! }),
    enabled: !!catalogId,
    refetchInterval: (query) => {
      // Poll while generating
      const data = query.state.data;
      if (data?.status === QACatalogStatus.Generating) {
        return 3000;
      }
      return false;
    },
  });

  // Fetch Q&A pairs
  const {
    data: pairsData,
    isLoading: isPairsLoading,
    refetch: refetchPairs,
  } = useQuery({
    queryKey: ['qaPairs', catalogId, page],
    queryFn: () =>
      evalApi.qaCatalog.qaCatalogGetCatalogQaPairs({ catalog_id: catalogId!, offset: page * PAGE_SIZE, limit: PAGE_SIZE }),
    enabled: !!catalogId,
  });

  // The pairs are loaded once the generation is finished (only the catalog is polled while it is generated).
  const catalogStatus = catalog?.status;
  const previousStatus = useRef(catalogStatus);
  useEffect(() => {
    if (previousStatus.current === QACatalogStatus.Generating && catalogStatus !== QACatalogStatus.Generating) {
      void queryClient.invalidateQueries({ queryKey: ['qaPairs', catalogId] });
    }
    previousStatus.current = catalogStatus;
  }, [catalogStatus, catalogId, queryClient]);

  // Fetch version history
  const { data: historyData } = useQuery({
    queryKey: ['qaCatalogHistory', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetHistory({ catalog_id: catalogId! }),
    enabled: !!catalogId,
  });

  // Save all pending changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      const additions = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'addition' }> => c.type === 'addition')
        .map((c) => c.data);

      const updates = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'update' }> => c.type === 'update')
        .map((c) => c.data);

      const deletions = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'deletion' }> => c.type === 'deletion')
        .map((c) => c.id);

      return evalApi.qaCatalog.qaCatalogEditQaCatalog({
        catalog_id: catalogId!,
        qaCatalogUpdateRequest: { additions, updates, deletions },
      });
    },
    onSuccess: (newCatalog) => {
      toast.success(texts.evals.qaCatalog.changesSaved);
      clearPendingChanges();
      void queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
      // Navigate to the new catalog ID since edit creates a new version
      if (newCatalog.id !== catalogId) {
        void navigate(`/admin/evals/qa-catalogs/${newCatalog.id}`, { replace: true });
      } else {
        void refetchCatalog();
        void refetchPairs();
        void queryClient.invalidateQueries({ queryKey: ['qaCatalogHistory', catalogId] });
      }
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.changesSaveFailed);
    },
  });

  // Delete catalog
  const deleteMutation = useMutation({
    mutationFn: () => evalApi.qaCatalog.qaCatalogDelete({ catalog_id: catalogId! }),
    onSuccess: () => {
      toast.success(texts.evals.qaCatalog.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
      void navigate('/admin/evals/qa-catalogs');
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.deleteFailed);
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingChanges is needed to trigger recomputation; getEffectiveQaPairs uses get() internally
  const effectivePairs = useMemo(() => getEffectiveQaPairs(pairsData ?? []), [getEffectiveQaPairs, pairsData, pendingChanges]);
  const pendingCounts = getPendingChangeCounts();
  const hasChanges = hasPendingChanges();

  const handleVersionChange = useEventCallback((value: string | null) => {
    if (value && value !== catalogId) {
      clearPendingChanges();
      void navigate(`/admin/evals/qa-catalogs/${value}`);
    }
  });

  const handleEdit = useEventCallback((pair: QAPair) => {
    setEditingPair(pair);
  });

  const handleDelete = useEventCallback((pair: QAPair) => {
    // Check if it's a pending addition (temp id)
    const isAddition = pendingChanges.some((c) => c.type === 'addition' && c.tempId === pair.id);

    if (isAddition) {
      removePendingChange(pair.id);
    } else {
      const original = pairsData?.find((p) => p.id === pair.id);
      if (original) {
        addPendingChange({ type: 'deletion', id: pair.id, original });
      }
    }
  });

  const handleUndo = useEventCallback((pairId: string) => {
    removePendingChange(pairId);
  });

  const handleSaveEdit = useEventCallback((pair: QAPair) => {
    // Check if it's a pending addition
    const additionIndex = pendingChanges.findIndex((c) => c.type === 'addition' && c.tempId === pair.id);

    if (additionIndex >= 0) {
      // Update the pending addition
      removePendingChange(pair.id);
      addPendingChange({
        type: 'addition',
        tempId: pair.id,
        data: {
          question: pair.question,
          expectedOutput: pair.expectedOutput,
          contexts: pair.contexts,
        },
      });
    } else {
      // It's an existing pair - find the original
      const original = pairsData?.find((p) => p.id === pair.id);
      if (original) {
        addPendingChange({ type: 'update', id: pair.id, data: pair, original });
      }
    }
    setEditingPair(null);
  });

  const handleAddPair = useEventCallback((data: { question: string; expectedOutput: string; contexts: string[] }) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addPendingChange({
      type: 'addition',
      tempId,
      data,
    });
    setShowAddDialog(false);
  });

  const handleUploadSuccess = useEventCallback(() => {
    // the upload replaces the pairs, the pending changes refer to the old ones
    clearPendingChanges();
    void refetchCatalog();
    void refetchPairs();
    void queryClient.invalidateQueries({ queryKey: ['qaCatalogHistory', catalogId] });
    setShowUploadDialog(false);
  });

  const versionOptions = useMemo(() => {
    if (!historyData?.versions) return [];
    return historyData.versions.map((v: QACatalogVersionHistoryItem) => ({
      value: v.versionId,
      label: `v${v.revision} - ${v.createdAt.toLocaleDateString()}`,
    }));
  }, [historyData]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isCatalogLoading) {
    return (
      <Page>
        <Box mb={16}>
          <Skeleton height={32} width={300} />
        </Box>
        <Card shadow="xs" padding={24} radius="md">
          <Skeleton height={400} />
        </Card>
      </Page>
    );
  }

  if (!catalog) {
    return (
      <Page>
        <Box py={48} ta="center">
          <Text fz="lg" lh="1.75rem" c="dark.3">
            {texts.evals.qaCatalog.errorNotFound}
          </Text>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            mt={16}
            onClick={() => navigate('/admin/evals/qa-catalogs')}
          >
            {texts.evals.qaCatalogs}
          </Button>
        </Box>
      </Page>
    );
  }

  return (
    <>
      <Page>
        {/* Header */}
        <Box mb={16}>
          <Group gap={8} wrap="nowrap" mb={8}>
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/admin/evals/qa-catalogs')}
            >
              {texts.evals.qaCatalogs}
            </Button>
          </Group>

          <Group justify="space-between" wrap="nowrap" gap={0}>
            <Group gap={16} wrap="nowrap">
              <Title order={2} fz={30} lh="2.25rem" fw={400}>
                {catalog.name}
              </Title>
              <QaCatalogStatusChip status={catalog.status} error={catalog.error} />
            </Group>

            <Group gap={8} wrap="nowrap">
              {/* Version selector */}
              {versionOptions.length > 0 && (
                <Select
                  placeholder={texts.evals.qaCatalog.versionSelect}
                  data={versionOptions}
                  value={catalogId}
                  onChange={handleVersionChange}
                  clearable
                  w="12rem"
                />
              )}

              {/* Actions menu */}
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="outline" rightSection={<IconChevronDown size={16} />}>
                    {texts.evals.qaCatalog.actions}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => setShowDownloadDialog(true)}>
                    {texts.evals.qaCatalog.downloadCatalog}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => setShowUploadDialog(true)}>
                    {texts.evals.qaCatalog.uploadTitle}
                  </Menu.Item>
                  <Menu.Divider />
                  <ConfirmDialog
                    title={texts.evals.qaCatalog.deleteConfirmTitle}
                    text={texts.evals.qaCatalog.deleteConfirmText(catalog.name)}
                    onPerform={() => deleteMutation.mutate()}
                  >
                    {({ onClick }) => (
                      <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onClick}>
                        {texts.evals.qaCatalog.deleteCatalog}
                      </Menu.Item>
                    )}
                  </ConfirmDialog>
                </Menu.Dropdown>
              </Menu>

              <Button leftSection={<IconPlus size={16} />} onClick={() => setShowAddDialog(true)}>
                {texts.evals.qaCatalog.addQaPair}
              </Button>
            </Group>
          </Group>

          {/* Metadata */}
          <Group component="div" gap={16} mt={8} fz="sm" lh="1.25rem" c="dark.3" wrap="nowrap">
            <span>
              {texts.evals.qaCatalog.revision}: {catalog.revision}
            </span>
            <span>
              {texts.evals.qaCatalog.createdAt}: {formatDate(catalog.createdAt)}
            </span>
            <span>
              {texts.evals.qaCatalog.updatedAt}: {formatDate(catalog.updatedAt)}
            </span>
          </Group>
        </Box>

        {/* Pending changes bar */}
        {hasChanges && (
          <Paper withBorder radius="md" p={12} mb={16} bg="yellow.0" style={{ borderColor: 'var(--mantine-color-yellow-3)' }}>
            <Group justify="space-between" wrap="nowrap" gap={0}>
              <Group gap={16} wrap="nowrap" fz="sm" lh="1.25rem">
                <Text span fz="sm" fw={500}>
                  {texts.evals.qaCatalog.pendingChanges(pendingChanges.length)}
                </Text>
                {pendingCounts.additions > 0 && (
                  <Text span fz="sm" c="green.8">
                    +{pendingCounts.additions} {texts.evals.qaCatalog.pendingAdditions(pendingCounts.additions)}
                  </Text>
                )}
                {pendingCounts.updates > 0 && (
                  <Text span fz="sm" c="blue.8">
                    ~{pendingCounts.updates} {texts.evals.qaCatalog.pendingUpdates(pendingCounts.updates)}
                  </Text>
                )}
                {pendingCounts.deletions > 0 && (
                  <Text span fz="sm" c="red.7">
                    -{pendingCounts.deletions} {texts.evals.qaCatalog.pendingDeletions(pendingCounts.deletions)}
                  </Text>
                )}
              </Group>
              <Group gap={8} wrap="nowrap">
                <ConfirmDialog
                  title={texts.evals.qaCatalog.cancelAllChanges}
                  text={texts.evals.qaCatalog.discardChangesConfirm(pendingChanges.length)}
                  onPerform={clearPendingChanges}
                >
                  {({ onClick }) => (
                    <Button variant="subtle" size="sm" leftSection={<IconX size={16} />} onClick={onClick}>
                      {texts.evals.qaCatalog.cancelAllChanges}
                    </Button>
                  )}
                </ConfirmDialog>
                <Button
                  size="sm"
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                >
                  {texts.evals.qaCatalog.saveAllChanges}
                </Button>
              </Group>
            </Group>
          </Paper>
        )}

        {/* Q&A Pairs Table */}
        <Card shadow="xs" padding={24} radius="md">
          {isPairsLoading ? (
            <Stack gap={8}>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} height={60} />
              ))}
            </Stack>
          ) : (
            <>
              <QaPairsTable
                pairs={effectivePairs}
                pendingChanges={pendingChanges}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUndo={handleUndo}
              />

              {effectivePairs.length === 0 && (
                <Box py={32} ta="center" c="dark.3">
                  {texts.evals.qaCatalog.noQaPairs}
                </Box>
              )}

              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={totalWithoutCount(page, PAGE_SIZE, pairsData?.length ?? 0)}
                onPage={setPage}
              />
            </>
          )}
        </Card>
      </Page>

      {/* Dialogs */}
      {editingPair && <EditQaPairDialog pair={editingPair} onClose={() => setEditingPair(null)} onSave={handleSaveEdit} />}

      {showAddDialog && <AddQaPairDialog onClose={() => setShowAddDialog(false)} onAdd={handleAddPair} />}

      {showDownloadDialog && (
        <DownloadQaCatalogDialog
          catalogId={catalogId!}
          catalogName={catalog.name}
          versions={historyData?.versions || []}
          onClose={() => setShowDownloadDialog(false)}
        />
      )}

      {showUploadDialog && (
        <UploadQaCatalogDialog
          catalogId={catalogId!}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}
