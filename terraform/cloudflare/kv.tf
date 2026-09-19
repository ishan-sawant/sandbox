resource "cloudflare_workers_kv_namespace" "metrics" {
  account_id = var.cloudflare_account_id
  title      = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-web-app-metrics"
}
