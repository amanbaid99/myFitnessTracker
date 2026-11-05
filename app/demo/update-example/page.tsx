import { UpdateExamples } from "@/components/guide/update-examples";
export default async function Page({ searchParams }: PageProps<"/demo/update-example">) {
  return <UpdateExamples kind={(await searchParams).kind === "plans" ? "plans" : "settings"} />;
}
