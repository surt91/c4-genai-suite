import { Markdown } from 'src/components';
import { useDocsContext } from 'src/components/InAppDocsProvider';

/** The help of the current page (formerly an own side panel). */
export function HelpView() {
  const { docsMarkdown } = useDocsContext();

  return (
    <div data-testid="inspector-help">
      <Markdown>{docsMarkdown}</Markdown>
    </div>
  );
}
