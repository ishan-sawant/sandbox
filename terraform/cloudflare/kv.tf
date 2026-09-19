# Holds the rendered /data/data.json payload. The cron Worker writes it every five
# minutes and the fetch handler serves it, so the namespace has to outlive any
# individual Worker deployment — which is why it is declared here rather than left
# to wrangler.
resource "cloudflare_workers_kv_namespace" "metrics" {
  account_id = var.cloudflare_account_id
  title      = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-web-app-metrics"
}
