"use client";

import { Button } from "@/components/ui/button";
import { resetAnalytics } from "@/lib/analytics";

/** Signs out, and forgets the account in analytics so the next person on this phone starts fresh. */
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" className="mt-8" onSubmit={() => resetAnalytics()}>
      <Button type="submit" variant="outline" size="lg" className="w-full">
        Sign out
      </Button>
    </form>
  );
}
