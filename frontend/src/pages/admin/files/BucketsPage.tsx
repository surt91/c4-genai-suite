import { ActionIcon } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { BucketDto, useApi } from 'src/api';
import { Page } from 'src/components';
import { RemountOnParam } from 'src/components/RemountOnParam';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { texts } from 'src/texts';
import { Bucket } from './Bucket';
import { EmptyPage } from './EmptyPage';
import classes from './Files.module.css';
import { FilesPage } from './FilesPage';
import { UpsertBucketDialog } from './UpsertBucketDialog';
import { useDeletingBucket } from './hooks';
import { useBucketstore } from './state';

export function BucketsPage() {
  const api = useApi();

  const navigate = useTransientNavigate();
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<BucketDto | null>(null);
  const { buckets, removeBucket, setBucket, setBuckets } = useBucketstore();

  const { data: loadedBuckets, isFetched } = useQuery({
    queryKey: ['buckets'],
    queryFn: () => api.files.getBuckets(),
  });

  useEffect(() => {
    if (loadedBuckets) {
      setBuckets(loadedBuckets.items);
    }
  }, [loadedBuckets, setBuckets]);

  const deleting = useDeletingBucket({
    apiCall: (id) => api.files.deleteBucket(id),
    removeBucket,
    navigation: () => navigate('/admin/files/'),
  });

  const doCreate = useEventCallback((bucket: BucketDto) => {
    setBucket(bucket);
    navigate(`/admin/files/${bucket.id}`);
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });
  return (
    <Page
      menu={
        <div className={classes.menu}>
          <div className={classes.menuHeader}>
            <h3 className={classes.menuTitle}>{texts.files.buckets}</h3>

            <ActionIcon variant="default" size={32} onClick={() => setToCreate(true)} aria-label={texts.files.createBucket}>
              <IconPlus size={16} />
            </ActionIcon>
          </div>

          <div className={classes.menuList}>
            <div aria-labelledby={texts.files.buckets} className={clsx('nav-menu', classes.menuEntries)}>
              {buckets.map((bucket) => (
                <Bucket key={bucket.id} bucket={bucket} onDelete={deleting.mutate} onUpdate={setToUpdate} />
              ))}
            </div>

            {buckets.length === 0 && isFetched && <div className={classes.menuEmpty}>{texts.files.bucketsEmpty}</div>}
          </div>
        </div>
      }
    >
      <Routes>
        <Route
          path=":id"
          element={
            <RemountOnParam param="id">
              <FilesPage />
            </RemountOnParam>
          }
        />
        <Route path="" element={<EmptyPage />} />
      </Routes>

      {(toCreate || toUpdate) && (
        <UpsertBucketDialog onClose={doClose} onCreate={doCreate} target={toUpdate} onUpdate={setBucket} />
      )}
    </Page>
  );
}
