export const BUCKET_SECONDS = 3600;
export const WINDOW_HOURS = 168;
export const MAX_NAMED_SERIES = 5;
export const OTHER_LABEL = "Other";

export const PINNED_COUNTRIES = ["AU", "US"];

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

export function toPrometheusMatrix(
  groups: AnalyticsGroup[],
  latestBucket: Date,
): PrometheusMatrix {
  const endSec = floorToHour(latestBucket);
  const startSec = endSec - (WINDOW_HOURS - 1) * BUCKET_SECONDS;

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

  const dynamic = ranked
    .filter((country) => !PINNED_COUNTRIES.includes(country))
    .slice(0, MAX_NAMED_SERIES - PINNED_COUNTRIES.length);
  const named = [...PINNED_COUNTRIES, ...dynamic];
  const rest = ranked.filter((country) => !named.includes(country));

  const series: MatrixSeries[] = named.map((country) => ({
    metric: { country },
    values: renderValues(byCountry.get(country) ?? new Map(), startSec, endSec),
  }));

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

  return { status: "success", data: { resultType: "matrix", result: series } };
}

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
  endExclusive: Date;
  latestBucket: Date;
}

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
