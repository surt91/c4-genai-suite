import { Fragment, PropsWithChildren } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Mounts the page again when the given route parameter changes (e.g. another bucket is selected), so that no state of
 * the previous entity (selection, filter, page, pending changes) is used for the new one.
 */
export function RemountOnParam({ param, children }: PropsWithChildren<{ param: string }>) {
  const params = useParams();
  return <Fragment key={params[param]}>{children}</Fragment>;
}
