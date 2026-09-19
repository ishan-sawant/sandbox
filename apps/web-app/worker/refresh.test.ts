import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { KV_KEY } from "./contract.ts";
import type { Env } from "./env.ts";
import { refreshMetrics } from "./refresh.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/graphql-response.json", import.meta.url), "utf8"),
);

function harness(fetchImpl: typeof fetch) {
  const writes: Array<[string, string]> = [];
  const env = {
    METRICS_KV: {
      get: async () => "PRE-EXISTING",
      put: async (k: string, v: string) => {
        writes.push([k, v]);
      },
    },
    ASSETS: { fetch: async () => new Response("") },
    CLOUDFLARE_API_TOKEN: "tok",
    CLOUDFLARE_ZONE_TAG: "zone123",
    SITE_HOSTNAME: "ishans.au",
  } as unknown as Env;
  return { env, writes, fetchImpl };
}

const ok = (async () =>
  new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

test("writes exactly one KV key on a successful refresh", async () => {
  const h = harness(ok);
  const wrote = await refreshMetrics(h.env, h.fetchImpl);

  assert.equal(wrote, true);
  assert.equal(h.writes.length, 1, "one key per run — 288 writes/day against a 1,000 cap");
  assert.equal(h.writes[0][0], KV_KEY);
});

test("the written payload is the matrix the panel expects", async () => {
  const h = harness(ok);
  await refreshMetrics(h.env, h.fetchImpl);

  const body = JSON.parse(h.writes[0][1]);
  assert.equal(body.status, "success");
  assert.equal(body.data.resultType, "matrix");
  assert.ok(body.data.result.length > 0 && body.data.result.length <= 6);
  assert.equal(typeof body.data.result[0].values[0][0], "number");
  assert.equal(typeof body.data.result[0].values[0][1], "string");
});

test("a failed query leaves the stored payload untouched", async () => {
  const boom = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;

  const h = harness(boom);
  const wrote = await refreshMetrics(h.env, h.fetchImpl);

  assert.equal(wrote, false);
  assert.equal(h.writes.length, 0, "must not write when the query failed");
});

test("a GraphQL error is a failure, not an empty chart", async () => {
  const errs = (async () =>
    new Response(JSON.stringify({ data: null, errors: [{ message: "Authentication error" }] }), {
      status: 200,
    })) as unknown as typeof fetch;

  const h = harness(errs);
  assert.equal(await refreshMetrics(h.env, h.fetchImpl), false);
  assert.equal(h.writes.length, 0);
});

test("a KV write failure is reported, not thrown", async () => {
  const h = harness(ok);
  h.env.METRICS_KV.put = async () => {
    throw new Error("KV write failed");
  };
  assert.equal(await refreshMetrics(h.env, h.fetchImpl), false);
});
