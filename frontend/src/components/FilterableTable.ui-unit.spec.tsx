import { ColumnDef, useTable } from '@tanstack/react-table';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FileDto } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { FilterableTable } from './FilterableTable';
import { fileTableFeatures } from './file-table';

const file = (id: number, fileName: string) => ({ id, fileName }) as FileDto;
const files = [file(1, 'b.pdf'), file(2, 'c.pdf'), file(3, 'a.pdf')];

const columns: ColumnDef<typeof fileTableFeatures, FileDto>[] = [
  { id: 'select', header: () => <span>Select</span>, cell: () => null },
  { accessorKey: 'fileName', header: () => <span>File name</span>, cell: (info) => info.getValue() },
];

function Table() {
  const table = useTable({ features: fileTableFeatures, data: files, columns });
  return <FilterableTable table={table} />;
}

const fileNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent);

describe('FilterableTable', () => {
  it('sorts with the keyboard and announces the order', async () => {
    render(<Table />);
    const user = userEvent.setup();

    const header = screen.getByRole('columnheader', { name: 'File name' });
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(fileNames()).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);

    const button = within(header).getByRole('button', { name: 'File name' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(fileNames()).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);

    await user.keyboard(' ');

    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(fileNames()).toEqual(['c.pdf', 'b.pdf', 'a.pdf']);
  });

  it('has no sort button for columns that cannot be sorted', () => {
    render(<Table />);

    const header = screen.getByRole('columnheader', { name: 'Select' });
    expect(header).not.toHaveAttribute('aria-sort');
    expect(within(header).queryByRole('button')).not.toBeInTheDocument();
  });
});
