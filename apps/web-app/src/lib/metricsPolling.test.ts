import assert from "node:assert/strict";
import { test } from "node:test";

import { POLL_INTERVAL_MS, isStale, shouldPoll } from "./metricsPolling.ts";

test("polls only while the metrics tab is open and the document is visible", () => {
  assert.equal(shouldPoll("metrics", "visible"), true);
  assert.equal(shouldPoll("metrics", "hidden"), false, "backgrounded tab must not poll");
  assert.equal(shouldPoll("diagram", "visible"), false, "chart is not on screen");
  assert.equal(shouldPoll("diagram", "hidden"), false);
});

test("interval matches the edge cache so polls are absorbed rather than billed", () => {
  assert.equal(POLL_INTERVAL_MS, 60_000);
});

test("throttles refetches so rapid tab switching cannot storm the origin", () => {
  const t0 = 1_000_000;
  assert.equal(isStale(t0, t0 + 59_999), false, "within the window — reuse what we have");
  assert.equal(isStale(t0, t0 + 60_000), true, "window elapsed — refresh");
  assert.equal(isStale(t0, t0 + 600_000), true);
});

test("treats a never-fetched panel as stale so the first load always runs", () => {
  assert.equal(isStale(0, 1_000_000), true);
});
