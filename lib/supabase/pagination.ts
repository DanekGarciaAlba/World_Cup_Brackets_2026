type SupabasePageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchAllPages<T>(
  pageQuery: (from: number, to: number) => PromiseLike<SupabasePageResult<T>>,
  pageSize = 1000,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await pageQuery(from, to);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function insertInChunks<T extends Record<string, unknown>>(
  tableName: string,
  rows: T[],
  insertRows: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>,
  chunkSize = 500,
) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await insertRows(chunk);
    if (error) throw new Error(`${tableName}: ${error.message}`);
  }
}
