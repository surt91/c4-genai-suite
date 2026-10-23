import { Button, Card, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi, UserGroupDto } from 'src/api';
import { Page } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { formatBoolean } from 'src/lib';
import { texts } from 'src/texts';
import listClasses from '../list.module.css';
import { CreateUserGroupDialog } from './CreateUserGroupDialog';
import { UpdateUserGroupDialog } from './UpdateUserGroupDialog';
import { useUserGroupsStore } from './state';

export function UserGroupsPage() {
  const api = useApi();

  const { removeUserGroup, setUserGroup, setUserGroups, userGroups } = useUserGroupsStore();

  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<UserGroupDto | null>(null);

  const { data: loadedGroups, isFetched } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.users.getUserGroups(),
  });

  useEffect(() => {
    if (loadedGroups) {
      setUserGroups(loadedGroups.items);
    }
  }, [loadedGroups, setUserGroups]);

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  return (
    <Page>
      <div className={listClasses.header}>
        <h2 className={listClasses.title}>{texts.userGroups.headline}</h2>

        <Group gap={16} wrap="nowrap" align="stretch">
          <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
            {texts.userGroups.create}
          </Button>
        </Group>
      </div>

      <Card radius="md" shadow="xs" padding={24}>
        <table className={listClasses.table}>
          <thead>
            <tr>
              <th>{texts.common.groupName}</th>
              <th className={listClasses.colMedium}>{texts.common.administration}</th>
              <th className={listClasses.colMedium}>{texts.common.builtIn}</th>
            </tr>
          </thead>
          <tbody>
            {userGroups.map((userGroup) => (
              <tr className={listClasses.row} key={userGroup.id} onClick={() => setToUpdate(userGroup)}>
                <td className={listClasses.cellStrong}>{userGroup.name}</td>
                <td className={listClasses.cell}>{formatBoolean(userGroup.isAdmin)}</td>
                <td className={listClasses.cell}>{formatBoolean(userGroup.isBuiltIn)}</td>
              </tr>
            ))}

            {userGroups.length === 0 && isFetched && (
              <tr>
                <td colSpan={3}>{texts.userGroups.empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {toCreate && <CreateUserGroupDialog onClose={doClose} onCreate={setUserGroup} />}
      {toUpdate && (
        <UpdateUserGroupDialog onClose={doClose} onDelete={removeUserGroup} onUpdate={setUserGroup} target={toUpdate} />
      )}
    </Page>
  );
}
