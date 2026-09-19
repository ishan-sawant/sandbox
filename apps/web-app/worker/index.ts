import { EMPTY_MATRIX } from "./analytics.ts";
import { CACHE_CONTROL, DATA_PATH, KV_KEY } from "./contract.ts";
import type { Env } from "./env.ts";
import { refreshMetrics } from "./refresh.ts";

const jsonResponse = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_CONTROL,
    },
  });

async function serveMetrics(env: Env): Promise<Response> {
  let stored: string | null = null;

  try {
    stored = await env.METRICS_KV.get(KV_KEY, { cacheTtl: 60 });
  } catch (err) {
    console.error("KV read failed for", KV_KEY, err);
  }

  return jsonResponse(stored ?? JSON.stringify(EMPTY_MATRIX));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === DATA_PATH) {
      return serveMetrics(env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await refreshMetrics(env);
  },
};
