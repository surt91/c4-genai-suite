import { Button, Card, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useApi, UserDto, UserGroupDto } from 'src/api';
import { Page, Pagination, RowButton, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { formatBoolean } from 'src/lib';
import { texts } from 'src/texts';
import listClasses from '../list.module.css';
import { CreateUserDialog, UpdateUserDialog } from './UpsertUserDialog';
import classes from './Users.module.css';
import { useUsersStore } from './state';

const EMPTY_USER_GROUPS: UserGroupDto[] = [];

export function UsersPage() {
  const api = useApi();

  const { removeUser, setUser, setUsers, users } = useUsersStore();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<UserDto | null>(null);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const { data: loadedUsers, isFetched } = useQuery({
    queryKey: ['users', page, query],
    queryFn: () => api.users.getUsers({ page, pageSize: 20, query }),
  });

  const { data: loadedGroups } = useQuery({
    queryKey: ['userGroups'],
    queryFn: async () => await api.users.getUserGroups(),
  });

  useEffect(() => {
    if (loadedUsers) {
      setUsers(loadedUsers.items);
    }
  }, [loadedUsers, setUsers]);

  const doChangePage = useEventCallback((page: number) => {
    setPage(page);
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  const userGroups = loadedGroups?.items || EMPTY_USER_GROUPS;

  return (
    <>
      <Page>
        <div className={listClasses.header}>
          <h2 className={listClasses.title}>{texts.users.headline}</h2>

          <Group gap={16} wrap="nowrap" align="stretch">
            <Search value={query} onSearch={handleSearch} />

            <Button onClick={() => setToCreate(true)}>
              <IconPlus className={classes.createIcon} /> {texts.users.create}
            </Button>
          </Group>
        </div>

        <Card radius="md" shadow="xs" padding={24}>
          <table className={listClasses.table}>
            <thead>
              <tr>
                <th>{texts.common.name}</th>
                <th>{texts.common.email}</th>
                <th>{texts.common.userGroups}</th>
                <th className={listClasses.colSmall}>{texts.common.apiKey}</th>
                <th className={listClasses.colSmall}>{texts.common.password}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className={listClasses.row} key={user.id} onClick={() => setToUpdate(user)}>
                  <td className={listClasses.cellStrong}>
                    <RowButton onClick={() => setToUpdate(user)}>{user.name}</RowButton>
                  </td>
                  <td className={listClasses.cellTruncate}>{user.email}</td>
                  <td className={listClasses.cell}>
                    {userGroups
                      .filter((x) => user.userGroupIds.includes(x.id))
                      .map((group) => group.name)
                      .join(', ')}
                  </td>
                  <td className={listClasses.cell}>{formatBoolean(user.hasApiKey)}</td>
                  <td className={listClasses.cell}>{formatBoolean(user.hasPassword)}</td>
                </tr>
              ))}

              {users.length === 0 && isFetched && (
                <tr>
                  <td colSpan={4}>{texts.users.empty}</td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={page} pageSize={20} total={loadedUsers?.total || 0} onPage={doChangePage} />
        </Card>
      </Page>
      {toCreate && <CreateUserDialog userGroups={userGroups} onClose={doClose} onCreate={setUser} />}
      {toUpdate && (
        <UpdateUserDialog onClose={doClose} onDelete={removeUser} onUpdate={setUser} target={toUpdate} userGroups={userGroups} />
      )}
    </>
  );
}
