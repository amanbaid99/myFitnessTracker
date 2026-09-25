/** Turns a Supabase/PostgREST error message into something Aman can act on. */
export function describeDbError(message: string): string {
  // PostgREST's wording when the schema has not been migrated yet.
  if (/schema cache|does not exist|Could not find the (table|relation)/i.test(message)) {
    return 'The database tables are not set up yet. In GitHub: Actions > Database migrations > Run workflow, with "apply" ticked.';
  }
  return `Could not load your data: ${message}`;
}
