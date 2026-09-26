import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during the server render, true in the browser. Progress weeks use
 * the viewer's own time zone, which the server (UTC) does not know.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
