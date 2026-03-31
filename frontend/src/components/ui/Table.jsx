export default function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found.",
  loading = false,
}) {
  return (
    <div className="rounded-xl border border-white/8 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#12121A] border-b border-white/8">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-mono text-zinc-500 tracking-widest uppercase whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex justify-center">
                  <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-amber-500 animate-spin" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-zinc-600"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? row.ArticleID ?? row.AuthorID ?? row.UserID ?? i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-white/5 last:border-0 transition-colors duration-150
                  ${onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-zinc-300 align-middle"
                  >
                    {col.render ? col.render(row) : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
