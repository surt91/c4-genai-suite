import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../test-utils.tsx';
import { texts } from 'src/texts';
import { DashboardPage } from './DashboardPage.tsx';

vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts');

  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ height, children }: { height: number; children?: ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height }}>
        {children}
      </div>
    ),
  };
});

describe('DashboardPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('should show the version hash', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('version')).toHaveTextContent(texts.dashboard.version(texts.dashboard.noVersion));
  });
});
