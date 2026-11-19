const PAGE = 1000

// Supabase returns at most 1000 rows per request, so read in pages.
// `build` must return a fresh, deterministically ordered query each call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAll<T>(build: () => any, maxRows = Infinity): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; from < maxRows; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return rows
}
