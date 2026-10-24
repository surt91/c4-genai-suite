import { Badge, Card, Group, Modal, Select, Table } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { create } from 'jsondiffpatch';
import { format as formatHtmlDiff } from 'jsondiffpatch/formatters/html';
import { useCallback, useMemo, useState } from 'react';
import { useApi } from 'src/api';
import { AuditLogDetailDto, AuditLogDto, GetAuditLogsData } from 'src/api';
import { Page, Pagination, RowButton } from 'src/components';
import { texts } from 'src/texts';
import classes from './AuditLogPage.module.css';

const PAGE_SIZE = 20;

const diffpatcher = create({
  objectHash: (obj: object) => {
    if ('id' in obj) {
      return String(obj.id);
    }
    return JSON.stringify(obj);
  },
});

function formatDate(date: Date): string {
  // Use the browser's locale so timestamps respect the user's language/region.
  return new Intl.DateTimeFormat(navigator.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getEntityName(auditLog: AuditLogDto): string {
  const snapshot = auditLog.snapshot as Record<string, unknown>;

  // For extensions, show the assistant/configuration name
  if (auditLog.entityType === 'extension') {
    if (typeof snapshot.configurationName === 'string' && snapshot.configurationName) {
      return snapshot.configurationName;
    }
    // Fallback to extension name if no configuration name
    if (typeof snapshot.name === 'string' && snapshot.name) {
      return snapshot.name;
    }
  }

  // Try common name fields
  if (typeof snapshot.name === 'string' && snapshot.name) {
    return snapshot.name;
  }
  if (typeof snapshot.title === 'string' && snapshot.title) {
    return snapshot.title;
  }

  // Fallback for entities without names
  const fallbacks: Record<string, string> = {
    settings: texts.auditLog.settings,
    extension: texts.auditLog.extension,
    bucket: texts.auditLog.bucket,
    configuration: texts.auditLog.configuration,
    userGroup: texts.auditLog.userGroup,
    user: texts.auditLog.user,
  };

  return fallbacks[auditLog.entityType] ?? auditLog.entityType;
}

function EntityTypeBadge({ entityType }: { entityType: string }) {
  const config: Record<string, { color: string; label: string }> = {
    extension: { color: 'blue', label: texts.auditLog.extension },
    bucket: { color: 'green', label: texts.auditLog.bucket },
    configuration: { color: 'violet', label: texts.auditLog.configuration },
    settings: { color: 'pink', label: texts.auditLog.settings },
    userGroup: { color: 'cyan', label: texts.auditLog.userGroup },
    user: { color: 'grape', label: texts.auditLog.user },
  };
  const { color, label } = config[entityType] ?? { color: 'gray', label: entityType };
  return <Badge color={color}>{label}</Badge>;
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { color: string; label: string }> = {
    create: { color: 'teal', label: texts.auditLog.create },
    update: { color: 'orange', label: texts.auditLog.update },
    delete: { color: 'red', label: texts.auditLog.delete },
  };
  const { color, label } = config[action] ?? { color: 'gray', label: action };
  return <Badge color={color}>{label}</Badge>;
}

function DiffView({ currentSnapshot, previousSnapshot }: { currentSnapshot: object; previousSnapshot: object | null }) {
  const diffHtml = useMemo(() => {
    if (!previousSnapshot) {
      return null;
    }

    const delta = diffpatcher.diff(previousSnapshot, currentSnapshot);

    if (!delta) {
      return null;
    }

    return formatHtmlDiff(delta, previousSnapshot);
  }, [currentSnapshot, previousSnapshot]);

  if (!previousSnapshot) {
    return (
      <div className={classes.message} data-variant="info">
        {texts.auditLog.noPreviousSnapshot}
      </div>
    );
  }

  if (!diffHtml) {
    return (
      <div className={classes.message} data-variant="neutral">
        {texts.auditLog.noChanges}
      </div>
    );
  }

  return <div className={clsx('jsondiffpatch-unchanged-hidden', classes.diff)} dangerouslySetInnerHTML={{ __html: diffHtml }} />;
}

function DetailsModal({ auditLog, onClose }: { auditLog: AuditLogDetailDto | null; onClose: () => void }) {
  if (!auditLog) return null;

  const isCreate = auditLog.action === 'create';
  const isDelete = auditLog.action === 'delete';
  const entityName = getEntityName(auditLog);
  const snapshot = auditLog.snapshot as Record<string, unknown>;
  const isExtension = auditLog.entityType === 'extension';
  const extensionName = isExtension && typeof snapshot.name === 'string' ? snapshot.name : null;
  const configurationName = isExtension && typeof snapshot.configurationName === 'string' ? snapshot.configurationName : null;
  const configurationId =
    isExtension && (typeof snapshot.configurationId === 'string' || typeof snapshot.configurationId === 'number')
      ? String(snapshot.configurationId)
      : null;

  return (
    <Modal opened={!!auditLog} onClose={onClose} title={texts.auditLog.snapshotDetails} size="lg">
      <Group gap={16} mb={16} align="flex-start">
        <div>
          <span className={classes.label}>{texts.auditLog.entityType}:</span> <EntityTypeBadge entityType={auditLog.entityType} />
        </div>
        <div>
          <span className={classes.label}>{texts.auditLog.action}:</span> <ActionBadge action={auditLog.action} />
        </div>
      </Group>
      {isExtension && configurationName && (
        <div className={classes.row}>
          <span className={classes.label}>{texts.auditLog.configuration}:</span>{' '}
          <span className={classes.strong}>{configurationName}</span>
          {configurationId && <span className={classes.hint}>({configurationId})</span>}
        </div>
      )}
      {isExtension && extensionName && (
        <div className={classes.row}>
          <span className={classes.label}>{texts.auditLog.extension}:</span> <span>{extensionName}</span>
          <span className={classes.hint}>({auditLog.entityId})</span>
        </div>
      )}
      {!isExtension && (
        <div className={classes.row}>
          <span className={classes.label}>{texts.auditLog.entityName}:</span> <span className={classes.strong}>{entityName}</span>
          <span className={classes.hint}>({auditLog.entityId})</span>
        </div>
      )}
      <div className={classes.row}>
        <span className={classes.label}>{texts.auditLog.user}:</span> <span>{auditLog.userName || auditLog.userId}</span>
      </div>
      <div className={classes.row}>
        <span className={classes.label}>{texts.auditLog.timestamp}:</span> <span>{formatDate(auditLog.createdAt)}</span>
      </div>

      <div className={classes.details}>
        {isCreate ? (
          <div className={classes.message} data-variant="success">
            {texts.auditLog.entityCreated}
          </div>
        ) : isDelete ? (
          <div className={classes.message} data-variant="error">
            {texts.auditLog.entityDeleted}
          </div>
        ) : (
          <DiffView currentSnapshot={auditLog.snapshot} previousSnapshot={auditLog.previousSnapshot ?? null} />
        )}
      </div>
    </Modal>
  );
}

function truncateId(id: string, length: number = 6): string {
  if (id.length <= length) return id;
  return id.substring(0, length) + '…';
}

export function AuditLogPage() {
  const api = useApi();
  const [page, setPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<NonNullable<GetAuditLogsData['query']>['entityType']>(undefined);
  const [configurationFilter, setConfigurationFilter] = useState<number | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);

  const { data: configurations } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.extensions.getConfigurations(),
  });

  const { data: auditLogs, isFetched } = useQuery({
    queryKey: ['auditLogs', page, entityTypeFilter, configurationFilter],
    queryFn: () =>
      api.auditLogs.getAuditLogs({
        entityType: configurationFilter ? undefined : entityTypeFilter,
        configurationId: configurationFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  // Fetch the selected log with its previous snapshot for diff
  const { data: selectedLogDetail } = useQuery({
    queryKey: ['auditLogDetail', selectedLog?.id],
    queryFn: () => api.auditLogs.getAuditLogById({ id: selectedLog!.id }),
    enabled: !!selectedLog,
  });

  const handleChangePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((value: string | null) => {
    // Normalize '' (the "All Types" sentinel) and null both to undefined so no
    // invalid enum value is kept in state or forwarded to the backend.
    setEntityTypeFilter((value || undefined) as NonNullable<GetAuditLogsData['query']>['entityType']);
    setPage(0);
  }, []);

  const handleConfigurationFilterChange = useCallback((value: string | null) => {
    setConfigurationFilter(value ? Number(value) : undefined);
    setPage(0);
  }, []);

  const configurationOptions = useMemo(
    () =>
      configurations?.items.map((config) => ({
        value: String(config.id),
        label: config.name,
      })) ?? [],
    [configurations],
  );

  const filterOptions = [
    { value: '', label: texts.auditLog.allTypes },
    { value: 'configuration', label: texts.auditLog.configuration },
    { value: 'extension', label: texts.auditLog.extension },
    { value: 'bucket', label: texts.auditLog.bucket },
    { value: 'settings', label: texts.auditLog.settings },
    { value: 'userGroup', label: texts.auditLog.userGroup },
    { value: 'user', label: texts.auditLog.user },
  ];

  return (
    <>
      <Page>
        <Group justify="space-between" wrap="nowrap" mb={16}>
          <h2 className={classes.title}>{texts.auditLog.headline}</h2>

          <Group gap={16} wrap="nowrap" align="flex-start">
            <Select
              placeholder={texts.auditLog.filterByAssistant}
              data={configurationOptions}
              value={configurationFilter ? String(configurationFilter) : null}
              onChange={handleConfigurationFilterChange}
              clearable
              searchable
              w={256}
            />
            <Select
              placeholder={texts.auditLog.entityType}
              data={filterOptions}
              value={entityTypeFilter || ''}
              onChange={handleFilterChange}
              clearable
              disabled={!!configurationFilter}
              w={192}
            />
          </Group>
        </Group>

        <Card padding={24} radius="md" shadow="xs">
          <Table layout="fixed" fz="md" horizontalSpacing="md" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={128}>{texts.auditLog.entityType}</Table.Th>
                <Table.Th w={96}>{texts.auditLog.entityId}</Table.Th>
                <Table.Th>{texts.auditLog.entityName}</Table.Th>
                <Table.Th w={128}>{texts.auditLog.action}</Table.Th>
                <Table.Th>{texts.auditLog.user}</Table.Th>
                <Table.Th w={208}>{texts.auditLog.timestamp}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {auditLogs?.items.map((log) => (
                <Table.Tr className={classes.logRow} key={log.id} onClick={() => setSelectedLog(log)}>
                  <Table.Td>
                    <EntityTypeBadge entityType={log.entityType} />
                  </Table.Td>
                  <Table.Td className={classes.entityId} title={log.entityId}>
                    {truncateId(log.entityId)}
                  </Table.Td>
                  <Table.Td className={classes.truncate}>
                    <RowButton onClick={() => setSelectedLog(log)}>{getEntityName(log)}</RowButton>
                  </Table.Td>
                  <Table.Td>
                    <ActionBadge action={log.action} />
                  </Table.Td>
                  <Table.Td className={classes.truncate}>{log.userName || log.userId}</Table.Td>
                  <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                </Table.Tr>
              ))}

              {auditLogs?.items.length === 0 && isFetched && (
                <Table.Tr>
                  <Table.Td colSpan={6}>{texts.auditLog.empty}</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Pagination page={page} pageSize={PAGE_SIZE} total={auditLogs?.total || 0} onPage={handleChangePage} />
        </Card>
      </Page>

      <DetailsModal auditLog={selectedLogDetail ?? null} onClose={() => setSelectedLog(null)} />
    </>
  );
}
