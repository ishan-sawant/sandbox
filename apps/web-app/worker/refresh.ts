import { fetchAnalyticsMatrix } from "./analytics.ts";
import { KV_KEY } from "./contract.ts";
import type { Env } from "./env.ts";

export async function refreshMetrics(env: Env, fetchImpl?: typeof fetch): Promise<boolean> {
  let matrix;

  try {
    matrix = await fetchAnalyticsMatrix({
      token: env.CLOUDFLARE_API_TOKEN,
      zoneTag: env.CLOUDFLARE_ZONE_TAG,
      hostname: env.SITE_HOSTNAME,
      fetchImpl,
    });
  } catch (err) {
    console.error("Analytics refresh failed; keeping the stored payload:", err);
    return false;
  }

  try {
    await env.METRICS_KV.put(KV_KEY, JSON.stringify(matrix));
  } catch (err) {
    console.error("KV write failed:", err);
    return false;
  }

  return true;
}
