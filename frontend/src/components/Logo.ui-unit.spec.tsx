import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('releases the URL of a previous preview', () => {
    const revokeObjectURL = vi.fn();
    window.URL.revokeObjectURL = revokeObjectURL;
    const first = new File(['a'], 'first.png', { type: 'image/png' });
    const second = new File(['b'], 'second.png', { type: 'image/png' });

    const { rerender, unmount } = render(<Logo previewLogo={first} />);
    rerender(<Logo previewLogo={second} />);
    expect(revokeObjectURL).toHaveBeenCalledWith('first.png');

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('second.png');
  });
});
