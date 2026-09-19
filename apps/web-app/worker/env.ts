/**
 * Only the narrow slice of the Workers runtime this Worker touches is typed here, rather
 * than pulling in @cloudflare/workers-types. The surface is three methods, and the legacy
 * Dockerfile still runs `npm clean-install`, so wrangler's dependency tree would slow
 * that build for no benefit. CI pins `npx wrangler@<version>` instead.
 */
export interface KVNamespaceLike {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
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
