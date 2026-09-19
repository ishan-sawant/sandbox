import assert from "node:assert/strict";
import { test } from "node:test";

import { DATA_PATH, KV_KEY } from "./contract.ts";
import type { Env } from "./env.ts";
import worker from "./index.ts";

const ASSET_BODY = "<!doctype html><title>spa</title>";

function makeEnv(overrides: Partial<Env> = {}, kv: Record<string, string> = {}): Env {
  return {
    METRICS_KV: {
      get: async (key: string) => (key in kv ? kv[key] : null),
      put: async () => {},
    },
    ASSETS: {
      fetch: async () => new Response(ASSET_BODY, { headers: { "content-type": "text/html" } }),
    },
    CLOUDFLARE_API_TOKEN: "test-token",
    CLOUDFLARE_ZONE_TAG: "zone123",
    SITE_HOSTNAME: "ishans.au",
    ...overrides,
  } as Env;
}

const get = (path: string, env: Env) =>
  worker.fetch(new Request(`https://ishans.au${path}`), env);

interface Matrix {
  status: string;
  data: { resultType: string; result: unknown[] };
}
const asMatrix = async (res: Response): Promise<Matrix> => (await res.json()) as Matrix;

test("serves the stored payload verbatim", async () => {
  const stored = JSON.stringify({ status: "success", data: { resultType: "matrix", result: [1] } });
  const res = await get(DATA_PATH, makeEnv({}, { [KV_KEY]: stored }));

  assert.equal(res.status, 200);
  assert.equal(await res.text(), stored, "must not re-serialise and risk drifting the shape");
});

test("sets the content type and edge cache headers the panel relies on", async () => {
  const res = await get(DATA_PATH, makeEnv({}, { [KV_KEY]: "{}" }));

  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(res.headers.get("cache-control"), "public, max-age=60");
});

test("an empty KV returns a valid empty matrix, not a 500", async () => {
  // The panel's only other state is a red "Technical Difficulties" card, so a cold
  // namespace before the first cron run must still look like a successful query.
  const res = await get(DATA_PATH, makeEnv());

  assert.equal(res.status, 200);
  const body = await asMatrix(res);
  assert.equal(body.status, "success");
  assert.equal(body.data.resultType, "matrix");
  assert.deepEqual(body.data.result, []);
});

test("a KV failure degrades to the empty matrix rather than erroring", async () => {
  const env = makeEnv({
    METRICS_KV: {
      get: async () => {
        throw new Error("KV unavailable");
      },
      put: async () => {},
    },
  });

  const res = await get(DATA_PATH, env);
  assert.equal(res.status, 200);
  assert.equal((await asMatrix(res)).status, "success");
});

test("every other path falls through to static assets", async () => {
  const env = makeEnv();
  for (const path of ["/", "/index.html", "/assets/index-abc.js", "/data/other.json"]) {
    const res = await get(path, env);
    assert.equal(await res.text(), ASSET_BODY, `${path} should be served by ASSETS`);
  }
});

test("the data path is the one the component already fetches", () => {
  assert.equal(DATA_PATH, "/data/data.json");
});

test("exports nothing but the default handler", async () => {
  // workerd treats every named export of the entrypoint as a handler or binding, so a
  // stray `export const` here fails at boot with "Incorrect type for map entry ... not
  // of type 'function or ExportedHandler'". Unit tests import this module under Node,
  // where named exports are legal, so only this assertion catches the regression.
  const mod = await import("./index.ts");
  assert.deepEqual(Object.keys(mod), ["default"]);
});
