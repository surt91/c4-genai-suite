import { useEffect } from 'react';

/**
 * The total for `Pagination` when the API does not return it (e.g. the eval service): a full page means that there
 * might be another one.
 *
 * @param page The current page (0-based).
 * @param itemsOnPage The number of items of the current page.
 */
export function totalWithoutCount(page: number, pageSize: number, itemsOnPage: number) {
  return itemsOnPage >= pageSize ? (page + 2) * pageSize : page * pageSize + itemsOnPage;
}

/** Goes back a page when the current one is empty, e.g. after its last item has been deleted. */
export function useStepBackFromEmptyPage(page: number, setPage: (page: number) => void, isLoaded: boolean, itemsOnPage: number) {
  useEffect(() => {
    if (isLoaded && page > 0 && itemsOnPage === 0) {
      setPage(page - 1);
    }
  }, [isLoaded, page, itemsOnPage, setPage]);
}
