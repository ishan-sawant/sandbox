import { EMPTY_MATRIX } from "./analytics.ts";
import { CACHE_CONTROL, DATA_PATH, KV_KEY } from "./contract.ts";

/**
 * Only the narrow slice of the Workers runtime this Worker actually touches is typed
 * here, rather than pulling in @cloudflare/workers-types. The surface is two methods,
 * and the legacy Docker image still runs `npm clean-install`, so adding wrangler's
 * dependency tree to devDependencies would slow that build for no benefit. CI pins
 * wrangler via `npx wrangler@<version>` instead.
 */
export interface KVNamespaceLike {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put?(key: string, value: string): Promise<void>;
}

export interface FetcherLike {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  METRICS_KV: KVNamespaceLike;
  ASSETS: FetcherLike;
  /** Zone Analytics:Read, set with `wrangler secret put`. */
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_TAG: string;
  SITE_HOSTNAME: string;
}

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
    // cacheTtl keeps repeated edge reads off the KV read quota (100k/day on free).
    stored = await env.METRICS_KV.get(KV_KEY, { cacheTtl: 60 });
  } catch (err) {
    console.error("KV read failed for", KV_KEY, err);
  }

  // A cold namespace, or a transient KV failure, must still look like a successful
  // query: the panel's only alternative state is a red "Technical Difficulties" card,
  // and "no data yet" is not an outage.
  return jsonResponse(stored ?? JSON.stringify(EMPTY_MATRIX));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === DATA_PATH) {
      return serveMetrics(env);
    }

    // Everything else is a static asset. In production `run_worker_first` means these
    // requests never reach the Worker at all — they are served directly, free and
    // unbilled — but the fallthrough keeps `wrangler dev` and any stray route honest.
    return env.ASSETS.fetch(request);
  },
};
