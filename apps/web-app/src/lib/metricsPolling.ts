/**
 * Polling predicates for the live metrics panel, kept out of the component so they can
 * be tested directly.
 *
 * The Worker rewrites the payload every five minutes and serves it with
 * `Cache-Control: public, max-age=60`, so a 60s poll is absorbed by the edge cache
 * rather than costing a Worker invocation each time.
 */

export const POLL_INTERVAL_MS = 60_000;

/** Never poll a chart nobody is looking at: the panel has to be the open tab *and* the
 *  document has to be visible. A backgrounded tab polling forever is pure waste. */
export const shouldPoll = (
  activeTab: "diagram" | "metrics",
  visibility: DocumentVisibilityState,
): boolean => activeTab === "metrics" && visibility === "visible";

/** Guards against a fetch storm when someone flips between tabs repeatedly: a refetch
 *  only happens once the interval has actually elapsed. */
export const isStale = (lastFetchedAt: number, now: number, interval = POLL_INTERVAL_MS): boolean =>
  now - lastFetchedAt >= interval;
