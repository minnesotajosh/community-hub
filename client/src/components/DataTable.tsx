import { useMemo, useState, type ReactNode } from 'react';
import type { SortState } from '../types';
import { Input, SelectField } from './common';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface FilterDef<T> {
  key: string;
  match: (row: T, value: string) => boolean;
}

interface UseTableControlsArgs<T> {
  rows: T[];
  search?: (row: T) => string;
  filters?: FilterDef<T>[];
  sortAccessors?: Record<string, (row: T) => string | number>;
  initialSort?: SortState;
}

export interface TableControls<T> {
  query: string;
  setQuery: (q: string) => void;
  filterValues: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  sort: SortState;
  toggleSort: (key: string) => void;
  visible: T[];
}

// Shared search / filter / sort logic for any list view.
export function useTableControls<T>({
  rows,
  search,
  filters = [],
  sortAccessors = {},
  initialSort = { key: null, dir: 'asc' },
}: UseTableControlsArgs<T>): TableControls<T> {
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(initialSort);

  const setFilter = (key: string, value: string) =>
    setFilterValues((f) => ({ ...f, [key]: value }));
  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (q && search && !search(row).toLowerCase().includes(q)) return false;
      for (const f of filters) {
        const v = filterValues[f.key];
        if (v && !f.match(row, v)) return false;
      }
      return true;
    });
    const acc = sort.key ? sortAccessors[sort.key] : undefined;
    if (acc) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const ka = acc(a), kb = acc(b);
        return ka < kb ? -dir : ka > kb ? dir : 0;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, filterValues, sort]);

  return { query, setQuery, filterValues, setFilter, sort, toggleSort, visible };
}

export interface ToolbarFilter {
  key: string;
  allLabel?: string;
  options: { value: string; label: string }[];
}

interface TableToolbarProps {
  query: string;
  setQuery: (q: string) => void;
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
  filterValues: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  actions?: ReactNode;
  count: number;
  total: number;
}

const ALL = '__all__';

// Toolbar: search box + filter dropdowns + action slot + "X of Y" count.
export function TableToolbar({
  query, setQuery, searchPlaceholder = 'Search…', filters = [], filterValues, setFilter, actions, count, total,
}: TableToolbarProps) {
  return (
    <div className="p-3 border-b flex flex-wrap gap-2 items-center">
      <Input placeholder={searchPlaceholder} className="flex-1 min-w-[160px]"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      {filters.map((f) => (
        <SelectField key={f.key} className="w-auto min-w-[150px]"
          value={filterValues[f.key] || ALL}
          onChange={(v) => setFilter(f.key, v === ALL ? '' : v)}
          options={[{ value: ALL, label: f.allLabel || 'All' }, ...f.options]} />
      ))}
      {actions}
      <span className="text-xs text-slate-400 ml-auto">{count} of {total}</span>
    </div>
  );
}

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  sortKey?: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  thClass?: string;
  tdClass?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  sort?: SortState;
  toggleSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  rowKey?: (row: T) => string;
}

// Generic sortable table driven by a columns config.
export function DataTable<T extends { _id: string }>({
  columns, rows, sort, toggleSort, onRowClick, empty = 'Nothing here yet.', rowKey = (r) => r._id,
}: DataTableProps<T>) {
  const arrow = (key: string) => (sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => {
            const sk = col.sortKey || col.key;
            return (
              <TableHead key={col.key}
                className={`${col.sortable ? 'cursor-pointer select-none' : ''} ${col.thClass || ''}`}
                onClick={col.sortable && toggleSort ? () => toggleSort(sk) : undefined}>
                {col.header}{col.sortable ? arrow(sk) : ''}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((col) => <TableCell key={col.key} className={col.tdClass || ''}>{col.render(row)}</TableCell>)}
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="p-6 text-center text-sm text-slate-400">{empty}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Card wrapper so every list view looks consistent.
export function TableCard({ children }: { children: ReactNode }) {
  return <div className="bg-white rounded-xl shadow-sm overflow-hidden">{children}</div>;
}
