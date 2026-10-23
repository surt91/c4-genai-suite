/* eslint-disable react-refresh/only-export-components */
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { texts } from 'src/texts';
import { Markdown } from '../components/Markdown';
import classes from './InAppDocsProvider.module.css';

/**
 * A page that shows the documentation itself, e.g. the chat shows it in its inspector (the one side panel of the chat).
 * When a host is registered, the provider does not render its own panel.
 */
type DocsHost = {
  toggle: () => void;
  isOpen: boolean;
};

type DocsContextType = {
  isDocsButtonVisible: boolean;
  toggleDocs: () => void;
  // The markdown of the documentation of the current page (empty if there is none).
  docsMarkdown: string;
  setDocsHost: (host: DocsHost | undefined) => void;
};

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export const useDocsContext = () => {
  const context = useContext(DocsContext);
  if (context === undefined) throw new Error('useDocsContext must be used within InAppDocsProvider');
  return context;
};

type InAppDocsLayoutProps = {
  docsMarkdown: string;
  isDocsVisible: boolean;
  toggleDocs: () => void;
  children: React.ReactNode;
};

const InAppDocsLayout: React.FC<InAppDocsLayoutProps> = ({ docsMarkdown, isDocsVisible, toggleDocs, children }) => {
  return (
    <div className={classes.root}>
      <div className={classes.layout}>
        <div className={classes.content} data-docs-visible={isDocsVisible || undefined}>
          {children}
        </div>
        {isDocsVisible && (
          <div className={classes.docs}>
            <div className={classes.docsHeader}>
              <h2 className={classes.docsTitle}>{texts.common.docsHeader}</h2>
              <ActionIcon onClick={toggleDocs} size="xl" mr="xs" variant="subtle" color="primary-content">
                <Tooltip label={texts.common.hide(texts.common.docs)}>
                  <IconX data-testid="close-icon" />
                </Tooltip>
              </ActionIcon>
            </div>
            <div className={classes.docsBody}>
              <Markdown>{docsMarkdown}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * @description This is a combined context provider for the useDocsContext hook and a layout component which displays the docs penal on the right.
 */
export const InAppDocsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fetchMarkdown = async (urlPath: string): Promise<string> => {
    const urlPathWithoutIds = urlPath.replace(/\/[0-9]+$/, '');
    const response = await fetch(`/docs${urlPathWithoutIds}/index.md`);
    const contentType = response.headers.get('content-type') || '';
    const markdownDocsFileExists = !contentType.includes('html');
    if (!markdownDocsFileExists) throw new Error('Failed to fetch documentation.');
    return response.text();
  };

  const location = useLocation();
  const query = useQuery<string, unknown>({
    queryKey: ['docs', location.pathname],
    queryFn: () => fetchMarkdown(location.pathname),
  });
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [docsHost, setDocsHost] = useState<DocsHost>();

  const isDocsAvailable = query.isSuccess;
  const toggleDocs = useCallback(() => {
    if (docsHost) {
      docsHost.toggle();
    } else {
      setIsDocsOpen((prev) => !prev);
    }
  }, [docsHost]);
  const isDocsButtonVisible = isDocsAvailable && !(docsHost ? docsHost.isOpen : isDocsOpen);
  const docsMarkdown = isDocsAvailable ? (query.data ?? '') : '';

  const context = useMemo(
    () => ({ isDocsButtonVisible, toggleDocs, docsMarkdown, setDocsHost }),
    [isDocsButtonVisible, toggleDocs, docsMarkdown],
  );

  return (
    <DocsContext.Provider value={context}>
      <InAppDocsLayout
        docsMarkdown={docsMarkdown}
        isDocsVisible={!docsHost && isDocsOpen && isDocsAvailable}
        toggleDocs={toggleDocs}
      >
        {children}
      </InAppDocsLayout>
    </DocsContext.Provider>
  );
};
