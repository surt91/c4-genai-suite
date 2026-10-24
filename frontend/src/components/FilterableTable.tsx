import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { flexRender } from '@tanstack/react-table';
import classes from './FilterableTable.module.css';
import { FileTable } from './file-table';

type FilterableTableProps = {
  table: FileTable;
};

export function FilterableTable({ table }: FilterableTableProps) {
  return (
    <div className={classes.root}>
      <table className={classes.table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th key={header.id} colSpan={header.colSpan} className={classes.th}>
                    {header.isPlaceholder ? null : (
                      <div className={classes.header}>
                        <div className={classes.headerLabel}>
                          <div className={classes.headerText}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </div>
                        <div
                          {...{
                            className: header.column.getCanSort() ? classes.sortable : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {header.column.getCanSort()
                            ? ({
                                asc: <IconSortAscending className={classes.sortActive} size={18} />,
                                desc: <IconSortDescending className={classes.sortActive} size={18} />,
                              }[header.column.getIsSorted() as string] ?? (
                                <IconSortAscending className={classes.sortInactive} size={18} />
                              ))
                            : null}
                        </div>
                      </div>
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
