import { useMemo, useState } from 'react';

// Shared search / filter / sort logic for any list view.
//   rows        : array of records
//   search      : (row) => string  — text searched by the search box
//   filters     : [{ key, match: (row, value) => bool }]
//   sortAccessors : { [key]: (row) => comparable }
//   initialSort : { key, dir }
export function useTableControls({ rows, search, filters = [], sortAccessors = {}, initialSort = { key: null, dir: 'asc' } }) {
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [sort, setSort] = useState(initialSort);

  const setFilter = (key, value) => setFilterValues((f) => ({ ...f, [key]: value }));
  const toggleSort = (key) =>
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
    const acc = sortAccessors[sort.key];
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

// Toolbar: search box + filter dropdowns + action slot + "X of Y" count.
export function TableToolbar({ query, setQuery, searchPlaceholder = 'Search…', filters = [], filterValues, setFilter, actions, count, total }) {
  return (
    <div className="p-3 border-b flex flex-wrap gap-2 items-center">
      <input placeholder={searchPlaceholder} className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[160px]"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      {filters.map((f) => (
        <select key={f.key} className="border rounded px-2 py-1.5 text-sm"
          value={filterValues[f.key] || ''} onChange={(e) => setFilter(f.key, e.target.value)}>
          <option value="">{f.allLabel || 'All'}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {actions}
      <span className="text-xs text-slate-400 ml-auto">{count} of {total}</span>
    </div>
  );
}

// Generic sortable table driven by a columns config.
//   columns : [{ key, header, sortKey?, sortable?, render: (row) => node, thClass?, tdClass? }]
export function DataTable({ columns, rows, sort, toggleSort, onRowClick, empty = 'Nothing here yet.', rowKey = (r) => r._id }) {
  const arrow = (key) => (sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
        <tr>
          {columns.map((col) => {
            const sk = col.sortKey || col.key;
            return (
              <th key={col.key}
                className={`p-3 ${col.sortable ? 'cursor-pointer select-none' : ''} ${col.thClass || ''}`}
                onClick={col.sortable ? () => toggleSort(sk) : undefined}>
                {col.header}{col.sortable ? arrow(sk) : ''}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}
            className={`border-t ${onRowClick ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((col) => <td key={col.key} className={`p-3 ${col.tdClass || ''}`}>{col.render(row)}</td>)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={columns.length} className="p-6 text-center text-sm text-slate-400">{empty}</td></tr>
        )}
      </tbody>
    </table>
  );
}

// Card wrapper so every list view looks consistent.
export function TableCard({ children }) {
  return <div className="bg-white rounded-xl shadow-sm overflow-hidden">{children}</div>;
}
