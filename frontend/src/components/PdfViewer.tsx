import { Loader } from '@mantine/core';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDocument } from 'src/hooks/api/files';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import { Alert } from './Alert';
import PdfControlBar from './PdfControlBar';
import classes from './PdfViewer.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const documentOptions = {
  wasmUrl: `${import.meta.env.BASE_URL}wasm/`,
};

/** A document referenced by an answer. */
type DocumentSource = {
  conversationId: number;
  messageId: number;
  documentUri: string;
};

interface PdfViewerProps {
  document: DocumentSource;
  // The page to show first, e.g. the first cited page.
  page?: number;
}

export function PdfViewer({ document, page }: PdfViewerProps) {
  const [scale, setScale] = useState<number>(1.0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(page ?? 1);
  const [displayPdfViewer, setDisplayPdfViewer] = useState<boolean>(true);

  const { data, isError, isPending } = useDocument(document.conversationId, document.messageId, document.documentUri);

  const isPdf = data?.type === 'application/pdf';
  const pdfFileUrl = useMemo(() => (data && isPdf ? URL.createObjectURL(data) : null), [data, isPdf]);

  useEffect(() => {
    if (data && !isPdf) {
      toast(texts.chat.sources.pdfLoadFailed);
    }
  }, [data, isPdf]);

  useEffect(() => {
    return () => {
      if (pdfFileUrl) {
        URL.revokeObjectURL(pdfFileUrl);
      }
    };
  }, [pdfFileUrl]);

  /* eslint-disable react-hooks/set-state-in-effect -- jump to the page when another page is requested */
  useEffect(() => {
    if (page) {
      setPageNumber(page);
    }
  }, [page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isError) {
    return <Alert text={texts.common.errorSourcePdfViewer} className={classes.error}></Alert>;
  }

  if (isPending) {
    return <Loader className={classes.loader} />;
  }

  return (
    <div className={classes.root}>
      <PdfControlBar
        numPages={numPages}
        pageNumber={pageNumber}
        scale={scale}
        setPageNumber={setPageNumber}
        setScale={setScale}
        showViewer={displayPdfViewer}
        setShowViewer={setDisplayPdfViewer}
      />
      {pdfFileUrl && displayPdfViewer && (
        <div className={`pdf-viewport ${classes.viewport}`}>
          {/* react-pdf loads the document and the pages with Suspense */}
          <Suspense fallback={<Loader className={classes.loader} />}>
            <Document
              file={pdfFileUrl}
              options={documentOptions}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={console.error}
            >
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </Suspense>
        </div>
      )}
    </div>
  );
}
