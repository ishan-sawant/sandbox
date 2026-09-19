export const POLL_INTERVAL_MS = 60_000;

export const shouldPoll = (
  activeTab: "diagram" | "metrics",
  visibility: DocumentVisibilityState,
): boolean => activeTab === "metrics" && visibility === "visible";

export const isStale = (lastFetchedAt: number, now: number, interval = POLL_INTERVAL_MS): boolean =>
  now - lastFetchedAt >= interval;
