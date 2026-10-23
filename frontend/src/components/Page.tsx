import { PropsWithChildren, ReactNode } from 'react';
import classes from './Page.module.css';

interface PageProps extends PropsWithChildren {
  // The optional menu.
  menu?: ReactNode;
}

export function Page(props: PageProps) {
  const { children, menu } = props;

  return (
    <div className={classes.root} data-with-menu={!!menu || undefined}>
      {menu && <div className={classes.menu}>{menu}</div>}

      <div className={classes.main}>
        <div className={classes.content}>{children}</div>
      </div>
    </div>
  );
}
