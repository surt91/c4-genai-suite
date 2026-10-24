import { fireEvent, render as renderPlain, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse, JsonBodyType } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfigurationDto, ExtensionsDto } from 'src/api';
import { notify } from 'src/lib/notifications';
import { mockedAPI } from 'src/mock/factory';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { ConfigurationPage } from './ConfigurationPage';

vi.mock('src/lib/notifications', () => ({
  notify: vi.fn(),
  toast: { success: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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
      .withGet<JsonBodyType>('/api/configurations', { items: [configuration(1, 'Assistant A'), configuration(2, 'Assistant B')] })
      .withGet<JsonBodyType>('/api/configurations/1', configuration(1, 'Assistant A'))
      .withGet<JsonBodyType>('/api/configurations/2', configuration(2, 'Assistant B'))
      .withGet<JsonBodyType>('/api/configurations/1/extensions', extensionsOfA)
      .withGet<JsonBodyType>('/api/buckets', { items: [] })
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

  it('lists the extensions whose secrets must be entered again after an import', async () => {
    const imported = configuration(3, 'Imported');
    new mockedAPI()
      .withGet<JsonBodyType>('/api/configurations', { items: [configuration(1, 'Assistant A')] })
      .withGet<JsonBodyType>('/api/configurations/1', configuration(1, 'Assistant A'))
      .withGet<JsonBodyType>('/api/configurations/1/extensions', extensionsOfA)
      .withGet<JsonBodyType>('/api/configurations/3', imported)
      .withGet<JsonBodyType>('/api/configurations/3/extensions', { configured: [], specs: [] })
      .withGet<JsonBodyType>('/api/buckets', { items: [] })
      .run();
    server.use(
      http.post(`${import.meta.env.VITE_SERVER_URL}/api/configurations/import`, () =>
        HttpResponse.json({
          configuration: imported,
          warnings: [],
          missingSecrets: [{ name: 'azure', title: 'Azure OpenAI', fields: ['API Key', 'headers.secret'] }],
        }),
      ),
    );
    window.history.pushState({}, '', '/admin/assistants/1');

    const { container } = render(
      <Routes>
        <Route path="/admin/assistants/*" element={<ConfigurationPage />} />
      </Routes>,
    );

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([JSON.stringify({ name: 'Imported', description: '', enabled: false, extensions: [] })], 'a.json', {
      type: 'application/json',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(notify).toHaveBeenCalled());
    const [message, options] = vi.mocked(notify).mock.calls[0];
    expect(options).toEqual({ type: 'warning', autoClose: false });
    renderPlain(<>{message}</>);
    expect(screen.getByText(texts.extensions.importConfigurationMissingSecrets)).toBeInTheDocument();
    expect(screen.getByText('Azure OpenAI: API Key, headers.secret')).toBeInTheDocument();
  });
});
