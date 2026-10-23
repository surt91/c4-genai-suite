import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { texts } from 'src/texts';
import { Dialog } from './Dialog';

vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

describe('Dialog', () => {
  it('only hides the thanks when they are closed', () => {
    const onSubmit = vi.fn();
    render(<Dialog title="Rate" thankYouText="Thanks!" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: texts.common.yes }));
    expect(screen.getByText('Thanks!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: texts.chat.updateRating.close }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('yes');
    expect(screen.queryByText('Thanks!')).not.toBeInTheDocument();
    expect(screen.queryByText('Rate')).not.toBeInTheDocument();
  });

  it('can be dismissed', () => {
    const onSubmit = vi.fn();
    render(<Dialog title="Rate" thankYouText="Thanks!" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: texts.chat.updateRating.close }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('dismiss');
    expect(screen.queryByText('Rate')).not.toBeInTheDocument();
  });
});
