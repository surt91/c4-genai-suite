import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSettingsDto } from 'src/api';
import { loadPage } from 'src/lib/navigation';
import { mockedAPI } from 'src/mock/factory';
import { render } from 'src/pages/admin/test-utils';
import { LoginPage } from 'src/pages/login/LoginPage';
import { texts } from 'src/texts';
import { server } from '../../../mock/node';

vi.mock('src/lib/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/lib/navigation')>()),
  loadPage: vi.fn(),
}));

describe('LoginPage authentication', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should alert when email and password not correct', async () => {
    new mockedAPI()
      .withGet<AuthSettingsDto>('/api/auth/settings', { providers: [], enablePasswordAuth: true })
      .withPostError('/api/auth/login')
      .run();

    render(<LoginPage />);

    const user = userEvent.setup();
    const email = await screen.findByPlaceholderText('Email');
    await user.type(email, 'st1@st1.com');
    const pwd = await screen.findByPlaceholderText('Password');
    await user.type(pwd, 'abc');
    const loginBtn = screen.getAllByRole('button', { name: 'Login' });
    await user.click(loginBtn[0]);
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
  });
  it('should render auth provider', async () => {
    new mockedAPI()
      .withGet<AuthSettingsDto>('/api/auth/settings', {
        providers: [
          {
            name: 'cool_new_provider',
            color: 'black',
            displayName: 'the only',
          },
        ],
        enablePasswordAuth: faker.datatype.boolean(),
      })
      .run();

    render(<LoginPage />);
    const providerLink = await screen.findByRole('link', { name: 'Login with the only' });
    expect(providerLink).toBeInTheDocument();
    expect(providerLink).toHaveAttribute('href', expect.stringContaining('/auth/login/cool_new_provider'));
  });

  it('should login with correct email and password', async () => {
    new mockedAPI()
      .withGet<AuthSettingsDto>('/api/auth/settings', { providers: [], enablePasswordAuth: true })
      .withPost(`/api/auth/login`)
      .run();

    render(<LoginPage />);

    const user = userEvent.setup();
    const email = await screen.findByPlaceholderText('Email');
    await user.type(email, 'admin@example.com');
    const pwd = await screen.findByPlaceholderText('Password');
    await user.type(pwd, 'secret');
    const loginBtn = screen.getAllByRole('button', { name: 'Login' });
    await user.click(loginBtn[0]);

    // a full page load, which drops the data of a previous session
    await vi.waitFor(() => expect(loadPage).toHaveBeenCalledWith('/chat'));
  });

  it('should return to the page where the session expired after the login', async () => {
    document.cookie = `post-login-redirect=${encodeURIComponent('/chat/42')}; path=/`;
    new mockedAPI()
      .withGet<AuthSettingsDto>('/api/auth/settings', { providers: [], enablePasswordAuth: true })
      .withPost(`/api/auth/login`)
      .run();

    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText('Email'), 'admin@example.com');
    await user.type(await screen.findByPlaceholderText('Password'), 'secret');
    await user.click(screen.getAllByRole('button', { name: 'Login' })[0]);

    await vi.waitFor(() => expect(loadPage).toHaveBeenCalledWith('/chat/42'));
    expect(document.cookie).not.toContain('post-login-redirect=%2F');
  });

  it('should inform user that something went wrong by fetching the auth settings', async () => {
    new mockedAPI().withGetError('/api/auth/settings').run();

    render(<LoginPage />);
    expect(await screen.findByText(texts.login.authError)).toBeInTheDocument();
  });

  it('should inform user that no auth setting is provided', async () => {
    new mockedAPI().withGet<AuthSettingsDto>('/api/auth/settings', { providers: [], enablePasswordAuth: false }).run();

    render(<LoginPage />);
    expect(await screen.findByText(texts.login.emptyAuthSettings)).toBeInTheDocument();
  });
});

describe('LoginPage design', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should not display background logo if none is provided', () => {
    render(<LoginPage />);
    expect(screen.queryByAltText('Background Logo')).not.toBeInTheDocument();
  });

  it('should display background logo if is provided', () => {
    render(<LoginPage />, { theme: { backgroundLogoUrl: '/api/settings/backgroundLogo' } });
    expect(screen.getByAltText('Background Logo')).toBeInTheDocument();
  });

  it('should display link list when configured', async () => {
    render(<LoginPage />, {
      theme: {
        siteLinks: [
          { text: 'Impressum', link: 'http://example.org' },
          { text: 'Datenschutz', link: 'http://example.org' },
        ],
      },
    });

    expect(await screen.findByText('Impressum')).toHaveAttribute('href', 'http://example.org');
    expect(await screen.findByText('Datenschutz')).toHaveAttribute('href', 'http://example.org');
  });
});
