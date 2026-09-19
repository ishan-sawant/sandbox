/**
 * Turns Cloudflare zone HTTP analytics into the Prometheus `query_range` matrix that
 * `ArchitectureDiagram.tsx` already knows how to parse.
 *
 * Two constraints drive the shape of this module:
 *
 * 1. The panel divides every value by 1024*1024 and labels the axis MiB. We therefore
 *    report `edgeResponseBytes`, which really is bytes, and leave that arithmetic alone.
 *    Feeding it request counts would render 0.00 across the board.
 * 2. The chart has six colours. The zone sees ~38 countries a week, so anything past the
 *    top five collapses into a single "Other" series.
 */

export const BUCKET_SECONDS = 3600;
export const WINDOW_HOURS = 168; // 7 days — 76% of buckets populated at current traffic
export const TOP_N_COUNTRIES = 5; // + Other = 6 = METRICS_CHART_COLORS.length
export const OTHER_LABEL = "Other";

/** Zone analytics is zone-wide; without this filter the panel plots scanner traffic
 *  against wildcard subdomains instead of the site. */
export const DEFAULT_HOSTNAME = "ishans.au";

export interface AnalyticsGroup {
  dimensions: {
    datetimeHour: string;
    clientCountryName: string;
  };
  sum: {
    edgeResponseBytes: number;
  };
}

export interface MatrixSeries {
  metric: { country: string };
  /** [unix seconds, value as string] — the shape parsePanelMetrics() coerces. */
  values: Array<[number, string]>;
}

export interface PrometheusMatrix {
  status: "success";
  data: {
    resultType: "matrix";
    result: MatrixSeries[];
  };
}

const ANALYTICS_QUERY = `query ZoneEdgeBytes($zoneTag: string!, $start: Time!, $end: Time!, $hostname: string!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(
        limit: 5000
        filter: { datetime_geq: $start, datetime_lt: $end, clientRequestHTTPHost: $hostname }
        orderBy: [datetimeHour_ASC]
      ) {
        dimensions {
          datetimeHour
          clientCountryName
        }
        sum {
          edgeResponseBytes
        }
      }
    }
  }
}`;

export interface AnalyticsQueryVariables {
  zoneTag: string;
  hostname: string;
  start: string;
  end: string;
}

/**
 * @param end Exclusive upper bound of the query range, normally "now". The range covers
 *            exactly WINDOW_HOURS, so the response holds the 168 buckets in [start, end).
 */
export function buildAnalyticsQuery(opts: {
  zoneTag: string;
  hostname: string;
  end: Date;
}): { query: string; variables: AnalyticsQueryVariables } {
  const endMs = opts.end.getTime();
  const startMs = endMs - WINDOW_HOURS * BUCKET_SECONDS * 1000;

  return {
    query: ANALYTICS_QUERY,
    variables: {
      zoneTag: opts.zoneTag,
      hostname: opts.hostname,
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    },
  };
}

const floorToHour = (d: Date): number =>
  Math.floor(d.getTime() / 1000 / BUCKET_SECONDS) * BUCKET_SECONDS;

/**
 * @param latestBucket The newest hourly bucket to plot, inclusive. The window runs back
 *                     WINDOW_HOURS - 1 hours from it, so the series is always exactly
 *                     WINDOW_HOURS points wide regardless of how sparse the traffic is.
 */
export function toPrometheusMatrix(
  groups: AnalyticsGroup[],
  latestBucket: Date,
): PrometheusMatrix {
  const endSec = floorToHour(latestBucket);
  const startSec = endSec - (WINDOW_HOURS - 1) * BUCKET_SECONDS;

  // country -> bucket seconds -> bytes
  const byCountry = new Map<string, Map<number, number>>();
  const totals = new Map<string, number>();

  for (const group of groups) {
    const bucket = Math.floor(Date.parse(group.dimensions.datetimeHour) / 1000);
    if (!Number.isFinite(bucket) || bucket < startSec || bucket > endSec) continue;

    const country = group.dimensions.clientCountryName;
    const bytes = group.sum.edgeResponseBytes;

    let buckets = byCountry.get(country);
    if (!buckets) {
      buckets = new Map<number, number>();
      byCountry.set(country, buckets);
    }
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + bytes);
    totals.set(country, (totals.get(country) ?? 0) + bytes);
  }

  if (byCountry.size === 0) {
    return { status: "success", data: { resultType: "matrix", result: [] } };
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country]) => country);

  const top = ranked.slice(0, TOP_N_COUNTRIES);
  const rest = ranked.slice(TOP_N_COUNTRIES);

  const series: MatrixSeries[] = top.map((country) => ({
    metric: { country },
    values: renderValues(byCountry.get(country)!, startSec, endSec),
  }));

  // Only emit Other when something actually overflowed — an all-zero series would burn a
  // chart colour and a legend entry for nothing.
  if (rest.length > 0) {
    const merged = new Map<number, number>();
    for (const country of rest) {
      for (const [bucket, bytes] of byCountry.get(country)!) {
        merged.set(bucket, (merged.get(bucket) ?? 0) + bytes);
      }
    }
    series.push({
      metric: { country: OTHER_LABEL },
      values: renderValues(merged, startSec, endSec),
    });
  }

  return { status: "success", data: { resultType: "matrix", result: series } };
}

/** Zero-fills the window: GraphQL only returns buckets that saw traffic, and gaps make
 *  the area chart render with holes. */
function renderValues(
  buckets: Map<number, number>,
  startSec: number,
  endSec: number,
): Array<[number, string]> {
  const values: Array<[number, string]> = [];
  for (let ts = startSec; ts <= endSec; ts += BUCKET_SECONDS) {
    values.push([ts, String(buckets.get(ts) ?? 0)]);
  }
  return values;
}

export const EMPTY_MATRIX: PrometheusMatrix = {
  status: "success",
  data: { resultType: "matrix", result: [] },
};

export const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

export interface WindowAnchors {
  /** Exclusive upper bound of the query range, aligned to the hour. */
  endExclusive: Date;
  /** Newest bucket to plot, inclusive — the last *complete* hour. */
  latestBucket: Date;
}

/**
 * The current hour is always partial and would render as a dip at the right edge of the
 * chart, so the newest plotted bucket is the last complete hour. Anchoring both the
 * query and the matrix here keeps them exactly aligned: the query returns the 168
 * buckets in [endExclusive - 168h, endExclusive), and the matrix plots
 * [latestBucket - 167h, latestBucket] — the same set.
 */
export function windowAnchors(now: Date): WindowAnchors {
  const endMs = Math.floor(now.getTime() / (BUCKET_SECONDS * 1000)) * BUCKET_SECONDS * 1000;
  return {
    endExclusive: new Date(endMs),
    latestBucket: new Date(endMs - BUCKET_SECONDS * 1000),
  };
}

export interface AnalyticsSource {
  token: string;
  zoneTag: string;
  hostname: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}

/**
 * Throws on any failure. The caller must treat a throw as "keep whatever is already
 * stored" — writing an empty matrix over good data would show an empty chart and look
 * like the site had no traffic, which is worse than serving a few minutes of stale data.
 */
export async function fetchAnalyticsMatrix(src: AnalyticsSource): Promise<PrometheusMatrix> {
  const doFetch = src.fetchImpl ?? fetch;
  const { endExclusive, latestBucket } = windowAnchors(src.now ?? new Date());

  const body = buildAnalyticsQuery({
    zoneTag: src.zoneTag,
    hostname: src.hostname,
    end: endExclusive,
  });

  const response = await doFetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${src.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Analytics API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { viewer?: { zones?: Array<{ httpRequestsAdaptiveGroups?: AnalyticsGroup[] }> } };
    errors?: Array<{ message?: string }> | null;
  };

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(
      `Analytics API errors: ${payload.errors.map((e) => e.message ?? "unknown").join("; ")}`,
    );
  }

  const groups = payload.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
  if (!Array.isArray(groups)) {
    throw new Error("Analytics API response missing httpRequestsAdaptiveGroups");
  }

  return toPrometheusMatrix(groups, latestBucket);
}
