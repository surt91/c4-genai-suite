import { Button, Group } from '@mantine/core';
import { texts } from 'src/texts';

interface PaginationProps {
  // The current page.
  page: number;

  // The current page size.
  pageSize: number;

  // The total number of items.
  total: number;

  // Invoked when the page has been changed.
  onPage: (page: number) => void;
}

export function Pagination(props: PaginationProps) {
  const { onPage, page, pageSize, total } = props;

  const numberOfPages = Math.ceil(total / pageSize);

  const canGoPrev = page > 0;
  const canGoNext = page < numberOfPages - 1;

  if (!canGoNext && !canGoPrev) {
    return null;
  }

  return (
    <Group justify="flex-end">
      <Button.Group mt={16}>
        <Button variant="default" size="xs" onClick={() => onPage(page - 1)} disabled={!canGoPrev}>
          «
        </Button>
        <Button variant="default" size="xs">
          {texts.common.page(page + 1, numberOfPages)}
        </Button>
        <Button variant="default" size="xs" onClick={() => onPage(page + 1)} disabled={!canGoNext}>
          »
        </Button>
      </Button.Group>
    </Group>
  );
}
