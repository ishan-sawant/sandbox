output "kv_namespace_id" {
  description = "Binding id for METRICS_KV; copy into apps/web-app/wrangler.jsonc."
  value       = cloudflare_workers_kv_namespace.metrics.id
}
