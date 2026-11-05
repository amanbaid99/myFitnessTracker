import type { ReactNode } from "react";
export function StartingWeightsIntro({setup=false,children}:{setup?:boolean;children?:ReactNode}) {
  return <header className="mb-5 pr-14">{children}<h1 className="break-words text-2xl font-semibold tracking-tight">Previous records and starting weights</h1><p className="mt-1 text-sm text-muted-foreground">{setup && "Your plan is ready. "}Enter a previous set you can still lift to guide initial targets and personal records. Leave unknown exercises blank. These entries do not count towards your streak.</p></header>;
}
