// A minimal stand-in for a supabase-js query: `eq` and `order` are accepted and ignored, `range` slices the rows, and
// awaiting it resolves to `{ data, error }` like the real builder.
type Result = { data: unknown[]; error: null };

export function mockQuery(rows: unknown[]) {
  let data = rows;
  const query = {
    eq: () => query,
    order: () => query,
    range: (from: number, to: number) => {
      data = rows.slice(from, to + 1);
      return query;
    },
    then: <T>(resolve: (result: Result) => T, reject?: (reason: unknown) => T) =>
      Promise.resolve<Result>({ data, error: null }).then(resolve, reject),
  };
  return query;
}
