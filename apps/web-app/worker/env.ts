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
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_TAG: string;
  SITE_HOSTNAME: string;
}
