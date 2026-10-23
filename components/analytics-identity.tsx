"use client";

import { useEffect } from "react";
import { identify } from "@/lib/analytics";

/** Tells analytics which account is signed in: its id only, nothing else. */
export function AnalyticsIdentity({ userId }: { userId: string }) {
  useEffect(() => identify(userId), [userId]);
  return null;
}
