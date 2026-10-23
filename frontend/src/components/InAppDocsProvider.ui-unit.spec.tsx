import { MantineProvider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { texts } from 'src/texts';
import { InAppDocsProvider, useDocsContext } from './InAppDocsProvider';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/test-path' })), // Ensure pathname is defined
  useNavigate: vi.fn(() => {}),
}));

const docsMarkdownMock = 'Mock Markdown Content';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: docsMarkdownMock,
    isSuccess: true,
  })),
}));

const TestComponent = () => {
  const { isDocsButtonVisible, toggleDocs } = useDocsContext();
  return (
    <button data-testid="test-button" onClick={toggleDocs}>
      {isDocsButtonVisible ? 'show docs button' : 'hide docs button'}
    </button>
  );
};

describe('InAppDocsProvider', () => {
  it('formatted provider is missing error is shown if needed', () => {
    expect(() => render(<TestComponent />)).toThrowError('useDocsContext must be used within InAppDocsProvider');
  });

  it('initially shows docs button and hide docs panel', () => {
    render(
      <MantineProvider>
        <InAppDocsProvider>
          <TestComponent />
        </InAppDocsProvider>
      </MantineProvider>,
    );

    expect(screen.queryByTestId('test-button')!.textContent).toBe('show docs button');
    expect(screen.queryByText(docsMarkdownMock)).not.toBeInTheDocument();
  });

  it('after toggle: hides docs button and shows docs panel', () => {
    render(
      <MantineProvider>
        <InAppDocsProvider>
          <TestComponent />
        </InAppDocsProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.queryByTestId('test-button')!);
    expect(screen.queryByTestId('test-button')!.textContent).toBe('hide docs button');
    expect(screen.getByText(docsMarkdownMock)).toBeInTheDocument();
  });

  it('close button: shows docs button and hides docs panel', () => {
    render(
      <MantineProvider>
        <InAppDocsProvider>
          <TestComponent />
        </InAppDocsProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.queryByTestId('test-button')!);
    fireEvent.click(screen.queryByTestId('close-icon')!);
    expect(screen.queryByTestId('test-button')!.textContent).toBe('show docs button');
    expect(screen.queryByText(docsMarkdownMock)).not.toBeInTheDocument();
  });

  it('loads the documentation once for all pages of the same kind', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/chat/42' } as ReturnType<typeof useLocation>);

    render(
      <MantineProvider>
        <InAppDocsProvider>
          <TestComponent />
        </InAppDocsProvider>
      </MantineProvider>,
    );

    expect(useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: ['docs', '/chat'] }));
  });

  it('has an accessible close button', () => {
    render(
      <MantineProvider>
        <InAppDocsProvider>
          <TestComponent />
        </InAppDocsProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByTestId('test-button'));

    expect(screen.getByRole('button', { name: texts.common.hide(texts.common.docs) })).toBeInTheDocument();
  });
});
