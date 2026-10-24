import { ActionIcon, Box, Button, Checkbox, Group, NativeSelect } from '@mantine/core';
import { IconEdit, IconLoader, IconTrash, IconUpload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, useTable } from '@tanstack/react-table';
import { clsx } from 'clsx';
import { formatDate } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { FileDto, useApi } from 'src/api';
import { ConfirmDialog, fileTableFeatures, FilterableTable, InfoByte, Search, TablePagination } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { formatFileSize } from 'src/lib';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import classes from './Files.module.css';
import { UpsertBucketDialog } from './UpsertBucketDialog';
import { useDeletingBucket, useDeletingFile, useUploadingFile } from './hooks';
import { useBucketstore, useFilesStore } from './state';

const NO_FILES: FileDto[] = [];

export function FilesPage() {
  const api = useApi();

  const bucketParam = useParams<'id'>();
  const bucketId = +bucketParam.id!;
  const [uploading, setUploading] = useState<File[]>([]);
  const filesStore = useFilesStore();
  const { removeFile, setFile, setFiles } = filesStore;
  // the store may still contain the files of the previously shown bucket
  const files = filesStore.bucketId === bucketId ? filesStore.files : NO_FILES;

  const navigate = useTransientNavigate();
  const [toUpdate, setToUpdate] = useState<boolean>();
  const { buckets, removeBucket, setBucket } = useBucketstore();

  //Tanstack Table
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data: bucket } = useQuery({
    queryKey: ['bucket', bucketId],
    queryFn: () => api.files.getBucket({ id: bucketId }),
  });

  // the bucket from the store, so that it shows the changes after editing
  const thisBucket = (bucket && buckets.find((b) => b.id == bucket.id)) || null;

  const deletingBucket = useDeletingBucket({
    apiCall: (id) => api.files.deleteBucket({ id }),
    removeBucket,
    navigation: () => navigate('/admin/files/'),
  });

  const doClose = useEventCallback(() => {
    setToUpdate(false);
  });

  const { data: loadedFiles } = useQuery({
    // we need to requery when the total changed (because we uploaded/deleted one)
    queryKey: ['files', bucketId],
    queryFn: () => api.files.getFiles({ id: bucketId }),
  });

  useEffect(() => {
    if (loadedFiles) {
      setFiles(loadedFiles.items, bucketId);
    }
  }, [loadedFiles, setFiles, bucketId]);

  const upload = useUploadingFile({
    bucketId,
    apiCall: (bucketId, file) => api.files.postFile({ id: bucketId, file }),
    setUploading,
    setFile,
  });

  const deleting = useDeletingFile({
    bucketId,
    apiCall: (bucketId, fileId) => api.files.deleteFile({ id: bucketId, fileId }),
    removeFile,
    setRowSelection,
  });

  const handleMultiRowDelete = () => {
    const originalFiles = table.getSelectedRowModel().rows.map((row) => row.original);
    originalFiles.forEach((file) => deleting.mutate(file));
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => files.forEach((file) => upload.mutate(file)),
    noClick: true,
  });

  const columns = useMemo<ColumnDef<typeof fileTableFeatures, FileDto>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            radius="sm"
            color="blue"
            {...{
              checked: table.getIsAllRowsSelected(),
              // "some" includes "all" since TanStack Table 9
              indeterminate: table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <div>
            <Checkbox
              radius="sm"
              color="blue"
              {...{
                checked: row.getIsSelected(),
                disabled: !row.getCanSelect(),
                indeterminate: row.getIsSomeSelected(),
                onChange: row.getToggleSelectedHandler(),
              }}
            />
          </div>
        ),
      },
      {
        accessorKey: 'fileName',
        cell: (info) => info.getValue(),
        header: () => <span>{texts.files.properties.fileName}</span>,
      },
      {
        accessorKey: 'mimeType',
        cell: (info) => <span className={clsx(classes.badge, classes.badgeType)}>{extractType(info.row.original)}</span>,
        header: () => <span>{texts.files.properties.fileType}</span>,
      },
      {
        id: 'fileSize',
        accessorFn: (row) => row.fileSize,
        cell: (info) => formatFileSize(Number(info.getValue())),
        header: () => <span>{texts.files.properties.fileSize}</span>,
      },
      {
        id: 'uploadedAt',
        accessorFn: (row) => row.uploadedAt,
        cell: (info) => formatDate(String(info.getValue()), 'Pp'),
        header: () => <span>{texts.files.properties.uploadedAt}</span>,
      },
    ],
    [],
  );

  const table = useTable({
    features: fileTableFeatures,
    data: files,
    columns: columns,
    state: {
      rowSelection: rowSelection,
      globalFilter: globalFilter,
      pagination: pagination,
    },
    globalFilterFn: 'includesString',
    onGlobalFilterChange: (filter: string) => {
      setGlobalFilter(filter);
      // the results start on the first page
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    // the selection must stay with the file, not with the row index
    getRowId: (file) => String(file.id),
    onPaginationChange: setPagination,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    autoResetPageIndex: false,
  });

  // Go to the last page when the current one does not exist anymore, e.g. after its files have been deleted
  // (adjusting the state while rendering instead of in an effect).
  const pageCount = table.getPageCount();
  if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) {
    setPagination((p) => ({ ...p, pageIndex: Math.max(pageCount - 1, 0) }));
  }

  return (
    <>
      {thisBucket && (
        <div className={classes.page}>
          <div className={classes.header}>
            <div className={classes.titleRow}>
              <h2 className={classes.title}>{thisBucket.name}</h2>
              <Group gap={8} wrap="nowrap" align="stretch">
                <Button leftSection={<IconEdit size={20} />} onClick={() => setToUpdate(true)}>
                  {texts.common.edit}
                </Button>
                <ConfirmDialog
                  title={texts.files.removeBucketConfirmTitle}
                  text={texts.files.removeBucketConfirmText}
                  onPerform={() => deletingBucket.mutate(thisBucket)}
                >
                  {({ onClick }) => (
                    <Button variant="light" onClick={onClick} color="red" leftSection={<IconTrash size={20} />}>
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </Group>
            </div>
            <div className={classes.infos}>
              {thisBucket.type === 'general' && <InfoByte title={texts.files.bucketType} value={'General'} />}
              {thisBucket.type === 'conversation' && <InfoByte title={texts.files.bucketType} value={'Chat'} />}
              {thisBucket.type === 'user' && <InfoByte title={texts.files.bucketType} value={texts.common.userBucketBadge} />}
              <InfoByte title={texts.common.endpoint} value={thisBucket.endpoint} />
              {thisBucket.indexName && <InfoByte title={texts.common.indexName} value={thisBucket.indexName} />}
            </div>
            <div className={classes.sectionHeader}>
              <h2 className={classes.sectionTitle}>{texts.files.headlineSearchable}</h2>
              {thisBucket.type !== 'user' && thisBucket.type !== 'conversation' && (
                <ActionIcon
                  onClick={open}
                  disabled={isDragActive || uploading.length > 0}
                  color="black"
                  size="input-sm"
                  aria-label={texts.files.uploadFiles}
                >
                  {uploading.length > 0 ? <IconLoader size={20} className={classes.spin} /> : <IconUpload size={20} />}
                </ActionIcon>
              )}
            </div>
          </div>

          <div className={classes.tableCard}>
            <Group justify="space-between" wrap="nowrap" gap={0}>
              <Search value={globalFilter ?? ''} onSearch={(value) => table.setGlobalFilter(String(value))} />
              <NativeSelect
                size="sm"
                data={['10', '15', '20', '25', '30']}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                value={String(table.state.pagination.pageSize)}
              />
            </Group>

            {thisBucket?.type !== 'user' && thisBucket?.type !== 'conversation' ? (
              <div className={isDragActive ? classes.dropActive : undefined} {...getRootProps()}>
                <input {...getInputProps()} />
                <FilterableTable table={table} />
              </div>
            ) : (
              <FilterableTable table={table} />
            )}
            <Group justify="space-between" gap={8} wrap="nowrap">
              <div className={classes.selection}>
                <Box c="dark.3">{texts.common.rowsSelected(table.getSelectedRowModel().rows.length)}</Box>
                <ConfirmDialog
                  title={texts.files.removeFilesConfirmTitle}
                  text={texts.files.removeFilesConfirmText(table.getSelectedRowModel().rows.length)}
                  onPerform={() => handleMultiRowDelete()}
                >
                  {({ onClick }) => (
                    <Button
                      variant="light"
                      color="red"
                      onClick={onClick}
                      size="xs"
                      disabled={table.getSelectedRowModel().rows.length == 0 ? true : false}
                    >
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </div>
              <TablePagination table={table} />
            </Group>
          </div>
        </div>
      )}

      {toUpdate && <UpsertBucketDialog onClose={doClose} onCreate={() => {}} target={thisBucket} onUpdate={setBucket} />}
    </>
  );
}
