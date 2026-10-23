/* eslint-disable react-refresh/only-export-components */
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { texts } from 'src/texts';
import { Markdown } from '../components/Markdown';
import classes from './InAppDocsProvider.module.css';

type DocsContextType = {
  isDocsButtonVisible: boolean;
  toggleDocs: () => void;
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

  const toggleDocs = () => setIsDocsOpen((prev) => !prev);
  const isDocsAvailable = query.isSuccess;
  const isDocsButtonVisible = isDocsAvailable && !isDocsOpen;

  return (
    <DocsContext.Provider value={{ isDocsButtonVisible, toggleDocs }}>
      <InAppDocsLayout docsMarkdown={query.data || ''} isDocsVisible={isDocsOpen && isDocsAvailable} toggleDocs={toggleDocs}>
        {children}
      </InAppDocsLayout>
    </DocsContext.Provider>
  );
};
