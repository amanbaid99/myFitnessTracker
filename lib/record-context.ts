/** Derive internal navigation from query parameters without accepting arbitrary URLs. */
export function recordContext(params: Record<string, string | string[] | undefined>) {
  const uuid = (v: string | string[] | undefined) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
  const workout = uuid(params.workout);
  const plan = uuid(params.plan);
  const setup = params.setup === "1";
  return {
    exercise: uuid(params.exercise), plan, setup,
    returnTo: workout ? `/workout/${workout}` : plan ? `/plans/${plan}` : setup ? "/" : "/routines",
    returnLabel: workout ? "Back to workout" : plan ? "Back to plan" : setup ? "Skip for now" : "Routines",
  };
}
