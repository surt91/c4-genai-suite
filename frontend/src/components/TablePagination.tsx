import { Button } from '@mantine/core';
import { IconChevronLeft, IconChevronLeftPipe, IconChevronRight, IconChevronRightPipe } from '@tabler/icons-react';
import { texts } from 'src/texts';
import { FileTable } from './file-table';

export function TablePagination({ table }: { table: FileTable }) {
  const labels = texts.accessibility.pdf;
  return (
    <Button.Group>
      <Button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} aria-label={labels.firstPage}>
        <IconChevronLeftPipe size={18} />
      </Button>
      <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={labels.previousPage}>
        <IconChevronLeft size={18} />
      </Button>
      <Button.GroupSection variant="subtle">
        {texts.common.page(table.state.pagination.pageIndex + 1, table.getPageCount() ? table.getPageCount() : 1)}
      </Button.GroupSection>
      <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={labels.nextPage}>
        <IconChevronRight size={18} />
      </Button>
      <Button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label={labels.lastPage}>
        <IconChevronRightPipe size={18} />
      </Button>
    </Button.Group>
  );
}
