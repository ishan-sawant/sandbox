import { fetchAnalyticsMatrix } from "./analytics.ts";
import { KV_KEY } from "./contract.ts";
import type { Env } from "./env.ts";

/**
 * Pulls the latest zone analytics and stores the rendered matrix.
 *
 * Lives outside worker/index.ts because the Workers runtime treats every named export of
 * the entrypoint as a handler or binding — see worker/contract.ts.
 *
 * @returns whether a write happened. A failed query deliberately leaves the previously
 *          stored payload alone: stale-but-good beats an empty chart that looks like the
 *          site received no traffic at all.
 */
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
