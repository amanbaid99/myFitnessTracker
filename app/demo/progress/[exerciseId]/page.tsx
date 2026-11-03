import { notFound } from "next/navigation";
import { ExerciseProgressView } from "@/components/progress/exercise-progress";
import { demoProgress } from "@/lib/demo";
export default async function Page({params}:PageProps<"/demo/progress/[exerciseId]">){const {exerciseId}=await params;const exercise=demoProgress().exercises.find(e=>e.id===exerciseId);if(!exercise)notFound();return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5"><ExerciseProgressView demo name={exercise.name} sessions={exercise.sessions} units="kg" /></main>}
