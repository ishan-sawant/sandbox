resource "cloudflare_workers_custom_domain" "apex" {
  account_id = var.cloudflare_account_id
  hostname   = local.env_vars[var.environment].domain_name
  zone_id    = local.env_vars[var.environment].zone_id
  service    = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-web-app"
}
