import { UnstyledButton } from '@mantine/core';
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { flexRender } from '@tanstack/react-table';
import { clsx } from 'clsx';
import classes from './FilterableTable.module.css';
import { FileTable } from './file-table';

type FilterableTableProps = {
  table: FileTable;
};

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

export function FilterableTable({ table }: FilterableTableProps) {
  return (
    <div className={classes.root}>
      <table className={classes.table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                const label = (
                  <div className={classes.headerLabel}>
                    <div className={classes.headerText}>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                  </div>
                );

                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={classes.th}
                    aria-sort={canSort ? (sorted ? ARIA_SORT[sorted] : 'none') : undefined}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      // the whole header is the sort button, so that its label is the accessible name
                      <UnstyledButton
                        className={clsx(classes.header, classes.sortable)}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                        {sorted === 'desc' ? (
                          <IconSortDescending className={classes.sortActive} size={18} aria-hidden="true" />
                        ) : (
                          <IconSortAscending
                            className={sorted ? classes.sortActive : classes.sortInactive}
                            size={18}
                            aria-hidden="true"
                          />
                        )}
                      </UnstyledButton>
                    ) : (
                      <div className={classes.header}>{label}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr key={row.id} className={classes.row}>
                {row.getAllCells().map((cell) => {
                  return (
                    <td key={cell.id} className={classes.td}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
