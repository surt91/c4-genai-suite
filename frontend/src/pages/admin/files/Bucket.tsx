import { ActionIcon, Menu } from '@mantine/core';
import { IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { memo } from 'react';
import { BucketDto, BucketDtoTypeEnum } from 'src/api';
import { ConfirmDialog, TransientNavLink } from 'src/components';
import { texts } from 'src/texts';
import classes from './Files.module.css';

interface BucketProps {
  bucket: BucketDto;
  onDelete: (bucket: BucketDto) => void;
  onUpdate: (bucket: BucketDto) => void;
}

export const Bucket = memo(({ bucket, onDelete, onUpdate }: BucketProps) => {
  return (
    <li className={classes.menuItem}>
      <TransientNavLink to={`/admin/files/${bucket.id}`} className={classes.menuLink}>
        {bucket.type === BucketDtoTypeEnum.User && (
          <div className={clsx(classes.badge, classes.badgePrimary)}>{texts.common.userBucketBadge}</div>
        )}
        {bucket.type === BucketDtoTypeEnum.Conversation && <div className={clsx(classes.badge, classes.badgePrimary)}>Chat</div>}
        {bucket.name}
      </TransientNavLink>

      <Menu withInitialFocusPlaceholder={false}>
        <Menu.Target>
          <ActionIcon
            className={classes.menuActions}
            variant="subtle"
            data-testid={'more-actions'}
            aria-label={texts.common.menu}
          >
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown aria-label={texts.accessibility.storageOptions}>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onUpdate(bucket)}>
            {texts.common.edit}
          </Menu.Item>
          <ConfirmDialog
            title={texts.files.removeBucketConfirmTitle}
            text={texts.files.removeBucketConfirmText}
            onPerform={() => onDelete(bucket)}
          >
            {({ onClick }) => (
              <Menu.Item onClick={onClick} c="red.9" leftSection={<IconTrash size={14} />}>
                {texts.common.remove}
              </Menu.Item>
            )}
          </ConfirmDialog>
        </Menu.Dropdown>
      </Menu>
    </li>
  );
});
