/**
 * Reads History rows with optional parts that may not be in the database
 * yet: custom workout names (their table) and quick-log titles (their
 * column). Each missing part is dropped and the query retried. Pure apart
 * from the query it is given.
 */
export async function withOptionalHistoryCols<T extends { error: { code: string; message: string } | null }>(
  base: string,
  run: (cols: string) => PromiseLike<T>,
): Promise<T> {
  let custom = true;
  let title = true;
  for (;;) {
    const res = await run(`${base}${title ? ", title" : ""}${custom ? ", workout_customizations(name)" : ""}`);
    if (res.error && title && res.error.code === "42703") title = false;
    else if (res.error && custom && ["PGRST200", "PGRST205", "42P01"].includes(res.error.code)) custom = false;
    else return res;
  }
}
