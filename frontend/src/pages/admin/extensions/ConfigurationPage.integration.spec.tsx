import { fireEvent, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ConfigurationDto, ExtensionsDto } from 'src/api';
import { mockedAPI } from 'src/mock/factory';
import { render } from 'src/pages/admin/test-utils';
import { server } from '../../../../mock/node';
import { ConfigurationPage } from './ConfigurationPage';

const configuration = (id: number, name: string) =>
  ({ id, name, enabled: true, userGroupIds: [], extensions: [] }) as unknown as ConfigurationDto;

const spec = { name: 'search', title: 'Search of assistant A', type: 'tool', testable: false, arguments: {} } as const;
const extensionsOfA: ExtensionsDto = {
  configured: [{ id: 5, name: 'search', values: {}, enabled: true, changed: false, spec }],
  specs: [spec],
};

describe('ConfigurationPage', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('does not show the extensions of the previous assistant while the new ones are loaded', async () => {
    new mockedAPI()
      .withGet('/api/configurations', { items: [configuration(1, 'Assistant A'), configuration(2, 'Assistant B')] })
      .withGet('/api/configurations/1', configuration(1, 'Assistant A'))
      .withGet('/api/configurations/2', configuration(2, 'Assistant B'))
      .withGet('/api/configurations/1/extensions', extensionsOfA)
      .withGet('/api/buckets', { items: [] })
      .run();
    server.use(
      http.get(`${import.meta.env.VITE_SERVER_URL}/api/configurations/2/extensions`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    window.history.pushState({}, '', '/admin/assistants/1');

    render(
      <Routes>
        <Route path="/admin/assistants/*" element={<ConfigurationPage />} />
      </Routes>,
    );

    expect(await screen.findByText('Search of assistant A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Assistant B/ }));

    expect(await screen.findByRole('heading', { name: 'Assistant B' })).toBeInTheDocument();
    expect(screen.queryByText('Search of assistant A')).not.toBeInTheDocument();
  });
});
