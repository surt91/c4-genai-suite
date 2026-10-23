import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResponseError } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { RouteWhenPrivate } from './RouteWhenPrivate';

const getProfile = vi.fn();

vi.mock('src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/api')>()),
  useApi: () => ({ auth: { getProfile } }),
}));

describe('RouteWhenPrivate', () => {
  it('shows an error instead of a white page when the profile cannot be loaded', async () => {
    getProfile.mockRejectedValueOnce(new ResponseError(new Response(null, { status: 502 })));
    getProfile.mockResolvedValueOnce({ id: '1', name: 'User', email: 'user@example.com', isAdmin: false });

    render(
      <RouteWhenPrivate>
        <div>Private page</div>
      </RouteWhenPrivate>,
    );

    expect(await screen.findByText(texts.common.loadFailed)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.common.tryAgain }));

    expect(await screen.findByText('Private page')).toBeInTheDocument();
  });
});
