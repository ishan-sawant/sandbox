/**
 * Shared constants for the /data/data.json contract.
 *
 * These deliberately live outside worker/index.ts: the Workers runtime treats every
 * named export of the entrypoint as a handler or binding, so exporting a plain string
 * from there fails at boot with
 *   "Incorrect type for map entry 'DATA_PATH': the provided value is not of type
 *    'function or ExportedHandler'".
 */

/** The path ArchitectureDiagram.tsx has always fetched, kept identical so the migration
 *  needs no client-side change. */
export const DATA_PATH = "/data/data.json";

/** Single key in the METRICS_KV namespace, rewritten by the cron. */
export const KV_KEY = "data.json";

/** Matches the cron cadence closely enough that the edge absorbs the panel's polling. */
export const CACHE_CONTROL = "public, max-age=60";
