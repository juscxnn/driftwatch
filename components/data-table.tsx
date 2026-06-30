'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortBy?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  search?: {
    placeholder?: string;
    match: (row: T, query: string) => boolean;
    value: string;
    onChange: (v: string) => void;
  };
  emptyState?: ReactNode;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  rowClassName?: (row: T) => string | undefined;
};

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    rows,
    columns,
    rowKey,
    search,
    emptyState,
    isLoading,
    onRowClick,
    defaultSort,
    rowClassName,
  } = props;

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    defaultSort ?? null,
  );

  const query = search?.value ?? '';
  const hasQuery = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (search && hasQuery) return rows.filter((r) => search.match(r, query));
    return rows;
  }, [rows, search, query, hasQuery]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col || !col.sortBy) return filtered;
    const sel = col.sortBy;
    const mult = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sel(a);
      const bv = sel(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      const s = String(av).localeCompare(String(bv));
      if (s !== 0) return s * mult;
      return 0;
    });
  }, [filtered, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }

  if (isLoading) {
    return (
      <div className="card overflow-hidden p-0">
        {search ? (
          <div className="border-b border-border p-3">
            <SearchInput search={search} />
          </div>
        ) : null}
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-2 font-medium ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                    <span
                      aria-hidden
                      className="block h-3 w-full max-w-[200px] animate-pulse rounded bg-surface-muted"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (sorted.length === 0) {
    if (hasQuery) {
      return (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-border p-3">
            <SearchInput search={search!} />
          </div>
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            No results for &ldquo;{query}&rdquo;
          </div>
        </div>
      );
    }
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className="card overflow-hidden p-0">
      {search ? (
        <div className="border-b border-border p-3">
          <SearchInput search={search} />
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface text-left text-text-muted">
          <tr>
            {columns.map((c) => {
              const isSortable = c.sortable ?? Boolean(c.sortBy);
              const isActive = sort?.key === c.key;
              const dir = isActive ? sort!.direction : null;
              const thClass = `px-4 py-2 font-medium transition-colors ${
                isSortable ? 'cursor-pointer select-none hover:text-text' : ''
              } ${c.className ?? ''}`;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={thClass}
                  onClick={isSortable ? () => toggleSort(c.key) : undefined}
                  aria-sort={
                    isActive
                      ? dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : isSortable
                        ? 'none'
                        : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {isSortable && isActive ? <ChevronIcon direction={dir!} /> : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const extra = rowClassName?.(row);
            return (
              <tr
                key={key}
                className={`border-t border-border transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-surface-muted' : ''
                } ${extra ?? ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-top ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SearchInput<T>({ search }: { search: NonNullable<DataTableProps<T>['search']> }) {
  return (
    <div className="relative">
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <input
        type="text"
        placeholder={search.placeholder}
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        className="input pl-8"
        aria-label="Search"
      />
    </div>
  );
}

function ChevronIcon({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-text"
    >
      {direction === 'asc' ? (
        <path d="m3 6.5 2-2 2 2" />
      ) : (
        <path d="m3 3.5 2 2 2-2" />
      )}
    </svg>
  );
}
