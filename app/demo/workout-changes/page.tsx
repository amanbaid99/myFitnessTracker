import { WorkoutChangesSample } from "@/components/guide/workout-changes-sample";

export default async function Page({ searchParams }: PageProps<"/demo/workout-changes">) {
  const kind = (await searchParams).kind === "dumbbells" ? "dumbbells" : "one";
  return <WorkoutChangesSample key={kind} kind={kind} />;
}
