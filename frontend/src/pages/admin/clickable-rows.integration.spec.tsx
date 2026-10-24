import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { JsonBodyType } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AuditLogDto, UserDto, UserGroupDto } from 'src/api';
import { mockedAPI } from 'src/mock/factory';
import { texts } from 'src/texts';
import { server } from '../../../mock/node';
import { AuditLogPage } from './audit-log/AuditLogPage';
import { render } from './test-utils';
import { UserGroupsPage } from './user-groups/UserGroupsPage';
import { UsersPage } from './users/UsersPage';

const userGroup: UserGroupDto = {
  id: 'readers',
  name: 'Readers',
  isAdmin: false,
  isBuiltIn: false,
  monthlyTokens: 0,
  monthlyUserTokens: 0,
};

const user: UserDto = {
  id: '7',
  name: 'Jane Reader',
  email: 'jane@example.com',
  userGroupIds: ['readers'],
  hasApiKey: false,
  hasPassword: true,
};

const auditLog: AuditLogDto = {
  id: 3,
  entityType: 'userGroup',
  entityId: 'readers',
  action: 'create',
  userId: '1',
  userName: 'Admin',
  snapshot: { name: 'Readers' },
  createdAt: new Date('2026-01-01T10:00:00Z'),
};

/** The clickable rows of the admin tables can be opened with the keyboard (P3-10). */
describe('Clickable admin table rows', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('opens a user group with the keyboard', async () => {
    new mockedAPI().withGet<JsonBodyType>('/api/user-groups', { items: [userGroup] }).run();
    render(<UserGroupsPage />);

    const button = await screen.findByRole('button', { name: 'Readers' });
    // the cell keeps its name (used by the E2E tests)
    expect(screen.getByRole('cell', { name: 'Readers' })).toContainElement(button);

    button.focus();
    await userEvent.setup().keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: texts.userGroups.update })).toBeInTheDocument();
  });

  it('opens a user with the keyboard', async () => {
    new mockedAPI()
      .withGet<JsonBodyType>('/api/users', { items: [user], total: 1 })
      .withGet<JsonBodyType>('/api/user-groups', { items: [userGroup] })
      .run();
    render(<UsersPage />);

    const button = await screen.findByRole('button', { name: 'Jane Reader' });
    button.focus();
    await userEvent.setup().keyboard(' ');

    expect(await screen.findByRole('dialog', { name: texts.users.update })).toBeInTheDocument();
  });

  it('opens an audit log entry with the keyboard', async () => {
    new mockedAPI()
      .withGet<JsonBodyType>('/api/configurations', { items: [] })
      .withGet<JsonBodyType>('/api/audit-logs', { items: [auditLog], total: 1 })
      .withGet<JsonBodyType>('/api/audit-logs/3', auditLog)
      .run();
    render(<AuditLogPage />);

    const button = await screen.findByRole('button', { name: 'Readers' });
    button.focus();
    await userEvent.setup().keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: texts.auditLog.snapshotDetails })).toBeInTheDocument();
  });

  it('still opens the row when it is clicked outside of the button', async () => {
    new mockedAPI().withGet<JsonBodyType>('/api/user-groups', { items: [userGroup] }).run();
    render(<UserGroupsPage />);

    await screen.findByRole('button', { name: 'Readers' });
    await userEvent.setup().click(screen.getAllByRole('cell', { name: texts.common.no })[0]);

    expect(await screen.findByRole('dialog', { name: texts.userGroups.update })).toBeInTheDocument();
  });
});
