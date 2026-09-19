import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  BUCKET_SECONDS,
  OTHER_LABEL,
  MAX_NAMED_SERIES,
  PINNED_COUNTRIES,
  WINDOW_HOURS,
  GRAPHQL_ENDPOINT,
  buildAnalyticsQuery,
  fetchAnalyticsMatrix,
  toPrometheusMatrix,
  windowAnchors,
  type AnalyticsGroup,
} from "./analytics.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/graphql-response.json", import.meta.url), "utf8"),
);
const groups: AnalyticsGroup[] = fixture.data.viewer.zones[0].httpRequestsAdaptiveGroups;

// The fixture is a real response, so anchor the window to its newest bucket rather than
// to "now" — otherwise these tests rot the moment the capture ages past seven days.
const newestHour = new Date(
  groups.map((g) => g.dimensions.datetimeHour).sort().at(-1)!,
);

const seriesOf = (m: ReturnType<typeof toPrometheusMatrix>) => m.data.result;

test("fixture is a real response with more countries than the palette can colour", () => {
  assert.ok(groups.length > 0, "fixture should not be empty");
  const countries = new Set(groups.map((g) => g.dimensions.clientCountryName));
  assert.ok(
    countries.size > MAX_NAMED_SERIES + 1,
    `fixture should exercise the cap; got ${countries.size} countries`,
  );
});

test("always renders exactly six series: five named plus Other", () => {
  const result = seriesOf(toPrometheusMatrix(groups, newestHour));
  assert.equal(result.length, MAX_NAMED_SERIES + 1, `got ${result.length} series`);
  assert.equal(result.at(-1)?.metric.country, OTHER_LABEL, "Other is always last");
});

test("pins AU and US at the front regardless of how little traffic they carry", () => {
  const result = seriesOf(toPrometheusMatrix(groups, newestHour));
  assert.deepEqual(
    result.slice(0, PINNED_COUNTRIES.length).map((s) => s.metric.country),
    PINNED_COUNTRIES,
    "pinned countries hold the first colours so the legend cannot reshuffle",
  );
});

test("a pinned country with zero traffic still gets a full zero-filled series", () => {
  // AU barely registers against the scanner noise, but it must never vanish.
  const withoutAu = groups.filter((g) => g.dimensions.clientCountryName !== "AU");
  const au = seriesOf(toPrometheusMatrix(withoutAu, newestHour)).find(
    (s) => s.metric.country === "AU",
  );
  assert.ok(au, "AU must still be charted");
  assert.equal(au.values.length, WINDOW_HOURS);
  assert.ok(au.values.every(([, v]) => v === "0"));
});

test("Other is present even when nothing overflows into it", () => {
  // Degenerate case: only the pinned countries have traffic, so there is nothing to fill
  // the three dynamic slots. Padding with invented country names would be worse than a
  // shorter legend, so the guarantee is "Other is always last", not "always six rows".
  const twoOnly = groups.filter((g) => ["AU", "US"].includes(g.dimensions.clientCountryName));
  const result = seriesOf(toPrometheusMatrix(twoOnly, newestHour));
  const other = result.at(-1);
  assert.equal(other?.metric.country, OTHER_LABEL);
  assert.equal(other?.values.length, WINDOW_HOURS, "still zero-filled across the window");
  assert.ok(other?.values.every(([, v]) => v === "0"));
  assert.ok(result.length <= MAX_NAMED_SERIES + 1);
});

test("every series is zero-filled across the whole window", () => {
  for (const series of seriesOf(toPrometheusMatrix(groups, newestHour))) {
    assert.equal(
      series.values.length,
      WINDOW_HOURS,
      `${series.metric.country} should have ${WINDOW_HOURS} buckets`,
    );
  }
});

test("buckets ascend in exact hourly steps", () => {
  for (const series of seriesOf(toPrometheusMatrix(groups, newestHour))) {
    for (let i = 1; i < series.values.length; i++) {
      assert.equal(
        series.values[i][0] - series.values[i - 1][0],
        BUCKET_SECONDS,
        `${series.metric.country} bucket ${i} is not one hour after its predecessor`,
      );
    }
  }
});

test("preserves the wire contract: unix seconds as number, value as string", () => {
  const [first] = seriesOf(toPrometheusMatrix(groups, newestHour));
  for (const [ts, value] of first.values) {
    assert.equal(typeof ts, "number");
    assert.equal(typeof value, "string");
    assert.ok(Number.isInteger(ts), "timestamp must be whole seconds, not millis");
    assert.ok(ts < 1e11, "timestamp must be seconds, not milliseconds");
    assert.ok(!Number.isNaN(Number(value)), `value ${value} should parse as a number`);
  }
});

test("labels series under the 'country' key the component resolves", () => {
  for (const series of seriesOf(toPrometheusMatrix(groups, newestHour))) {
    assert.deepEqual(Object.keys(series.metric), ["country"]);
  }
});

test("Other captures the remainder — no bytes are lost or invented", () => {
  const inWindow = groups.filter((g) => {
    const ts = Date.parse(g.dimensions.datetimeHour) / 1000;
    const end = Math.floor(newestHour.getTime() / 1000);
    return ts > end - WINDOW_HOURS * BUCKET_SECONDS && ts <= end;
  });
  const expected = inWindow.reduce((n, g) => n + g.sum.edgeResponseBytes, 0);
  const actual = seriesOf(toPrometheusMatrix(groups, newestHour))
    .flatMap((s) => s.values)
    .reduce((n, [, v]) => n + Number(v), 0);
  assert.equal(actual, expected, "total bytes must survive the top-N collapse");
});

test("emits a well-formed empty matrix rather than throwing on no data", () => {
  const empty = toPrometheusMatrix([], newestHour);
  assert.equal(empty.status, "success");
  assert.equal(empty.data.resultType, "matrix");
  assert.deepEqual(empty.data.result, []);
});

test("discards buckets outside the window", () => {
  const stale: AnalyticsGroup[] = [
    {
      dimensions: { datetimeHour: "2020-01-01T00:00:00Z", clientCountryName: "ZZ" },
      sum: { edgeResponseBytes: 999_999 },
    },
  ];
  assert.deepEqual(seriesOf(toPrometheusMatrix(stale, newestHour)), []);
});

test("query pins the hostname filter and the window", () => {
  const { query, variables } = buildAnalyticsQuery({
    zoneTag: "zone123",
    hostname: "ishans.au",
    end: newestHour,
  });
  assert.match(query, /httpRequestsAdaptiveGroups/);
  assert.match(query, /datetimeHour/);
  assert.match(query, /clientCountryName/);
  assert.match(query, /edgeResponseBytes/);
  assert.equal(variables.zoneTag, "zone123");
  assert.equal(variables.hostname, "ishans.au");
  assert.equal(
    (Date.parse(variables.end) - Date.parse(variables.start)) / 1000,
    WINDOW_HOURS * BUCKET_SECONDS,
    "query window must match the chart window",
  );
});

// ---------------------------------------------------------------------------
// fetchAnalyticsMatrix — network edges. The cron must never turn a failed query
// into a successful-looking empty chart.
// ---------------------------------------------------------------------------

const okFetch = (body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

const SOURCE = {
  token: "tok",
  zoneTag: "zone123",
  hostname: "ishans.au",
  now: new Date("2026-09-19T12:34:00Z"),
};

test("window anchors align to the hour and the newest bucket is complete", () => {
  const { endExclusive, latestBucket } = windowAnchors(new Date("2026-09-19T12:34:56Z"));
  assert.equal(endExclusive.toISOString(), "2026-09-19T12:00:00.000Z");
  assert.equal(
    latestBucket.toISOString(),
    "2026-09-19T11:00:00.000Z",
    "plot the last complete hour, not the partial current one",
  );
});

test("fetches the GraphQL endpoint with bearer auth", async () => {
  let seenUrl = "";
  let seenAuth = "";
  const spy = (async (url: string, init: RequestInit) => {
    seenUrl = String(url);
    seenAuth = String((init.headers as Record<string, string>).Authorization);
    return new Response(JSON.stringify(fixture), { status: 200 });
  }) as unknown as typeof fetch;

  await fetchAnalyticsMatrix({ ...SOURCE, fetchImpl: spy });
  assert.equal(seenUrl, GRAPHQL_ENDPOINT);
  assert.equal(seenAuth, "Bearer tok");
});

test("turns a real response into a bounded, zero-filled matrix", async () => {
  const matrix = await fetchAnalyticsMatrix({ ...SOURCE, fetchImpl: okFetch(fixture) });
  assert.equal(matrix.status, "success");
  assert.equal(matrix.data.result.length, MAX_NAMED_SERIES + 1);
  for (const s of matrix.data.result) assert.equal(s.values.length, WINDOW_HOURS);
});

test("throws when GraphQL reports errors", async () => {
  const body = { data: null, errors: [{ message: "Authentication error" }] };
  await assert.rejects(() => fetchAnalyticsMatrix({ ...SOURCE, fetchImpl: okFetch(body) }));
});

test("throws on a non-200 response", async () => {
  const bad = (async () => new Response("nope", { status: 403 })) as unknown as typeof fetch;
  await assert.rejects(() => fetchAnalyticsMatrix({ ...SOURCE, fetchImpl: bad }));
});

test("throws on a malformed body rather than inventing an empty chart", async () => {
  await assert.rejects(() =>
    fetchAnalyticsMatrix({ ...SOURCE, fetchImpl: okFetch({ data: { viewer: { zones: [] } } }) }),
  );
});
