'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useLocale } from '@/lib/locale-context';
import { Table2, Code2 } from 'lucide-react';

interface ResultsTableProps {
  data: Record<string, unknown>[];
  columns: string[];
}

export function ResultsTable({ data, columns }: ResultsTableProps) {
  const { t, locale } = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: '_rowNumber',
        header: '#',
        cell: ({ row }) => (
          <span className="text-muted-foreground/50 font-mono text-xs">
            {row.index + 1}
          </span>
        ),
        enableSorting: false,
      },
      ...columns.map((col) => ({
        accessorKey: col,
        header: col,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue();
          if (value === null) return <span className="text-muted-foreground/50 italic">null</span>;
          if (value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        },
      })),
    ],
    [columns]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's useReactTable is safe to use
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('noResults')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('pretty')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'pretty'
              ? 'bg-primary/20 text-primary'
              : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
            }`}
        >
          <Table2 className="w-4 h-4" />
          {locale === 'ru' ? 'Таблица' : 'Table'}
        </button>
        <button
          onClick={() => setViewMode('raw')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'raw'
              ? 'bg-primary/20 text-primary'
              : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
            }`}
        >
          <Code2 className="w-4 h-4" />
          JSON
        </button>
      </div>

      {viewMode === 'pretty' ? (
        <>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30">
                    {table.getHeaderGroups().map((headerGroup) =>
                      headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap ${header.column.getCanSort() ? 'cursor-pointer hover:bg-secondary/50' : ''
                            } transition-colors`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm max-w-xs truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-muted-foreground">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
