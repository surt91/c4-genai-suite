import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from 'src/components/Markdown';

describe('Markdown component', () => {
  it('renders table correctly', () => {
    const content = '| Header1 | Header2 |\n|---------|---------|\n| Hello   | Gaible   |';
    render(<Markdown>{content}</Markdown>);

    const markdownTable = screen.getByRole('table');
    expect(markdownTable).toBeInTheDocument();

    const header1 = screen.getByRole('columnheader', { name: 'Header1' });
    const header2 = screen.getByRole('columnheader', { name: 'Header2' });

    expect(header1).toBeInTheDocument();
    expect(header2).toBeInTheDocument();

    const cellHello = screen.getByRole('cell', { name: 'Hello' });
    const cellGaible = screen.getByRole('cell', { name: 'Gaible' });
    expect(cellHello).toBeInTheDocument();
    expect(cellGaible).toBeInTheDocument();
  });

  it('renders img correctly', () => {
    const imageUrl = 'http://example.com/image.png';
    const content = `![Image](${imageUrl})`;
    render(<Markdown>{content}</Markdown>);

    const markdownImage = screen.getByRole<HTMLImageElement>('img');
    expect(markdownImage).toBeInTheDocument();
    expect(markdownImage.src).toBe(imageUrl);
  });

  it('inline code does not have a copy button', () => {
    const content = 'This is `inline code` in a sentence.';
    render(<Markdown>{content}</Markdown>);

    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');

    const copyIcon = screen.queryByTestId('copy-code-button');
    expect(copyIcon).not.toBeInTheDocument();
  });

  it('fenced code block without language has a copy button', () => {
    const content = '```\nconst x = 42;\n```';
    render(<Markdown>{content}</Markdown>);

    expect(screen.getByText(/const x = 42/)).toBeInTheDocument();

    const copyIcon = screen.getByTestId('copy-code-button');
    expect(copyIcon).toBeInTheDocument();
  });

  it('fenced code block with language has a copy button', () => {
    const content = '```javascript\nconst greeting = "Hello";\n```';
    const { container } = render(<Markdown>{content}</Markdown>);

    expect(container.querySelector('pre code')).toHaveTextContent('const greeting = "Hello";');

    const copyIcon = screen.getByTestId('copy-code-button');
    expect(copyIcon).toBeInTheDocument();
  });

  it('highlights fenced code blocks of known languages', () => {
    const content = '```javascript\nconst greeting = "<b>Hello</b>";\n```';
    const { container } = render(<Markdown>{content}</Markdown>);

    const code = container.querySelector('pre > div > code');
    expect(code).toHaveClass('hljs', 'language-javascript');
    expect(code?.querySelector('.hljs-keyword')).toHaveTextContent('const');
    expect(code).toHaveTextContent('const greeting = "<b>Hello</b>";');
    expect(code?.querySelector('b')).toBeNull();
  });

  it('escapes code blocks of unknown languages', () => {
    const content = '```unknownlang\n<script>alert(1)</script>\n```';
    const { container } = render(<Markdown>{content}</Markdown>);

    const code = container.querySelector('pre > div > code');
    expect(code).toHaveClass('language-unknownlang');
    expect(code).toHaveTextContent('<script>alert(1)</script>');
    expect(code?.querySelector('script')).toBeNull();
  });
});
