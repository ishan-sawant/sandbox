# Attaches the Worker to the zone apex, replacing the proxied CNAME that currently points
# at the torn-down ALB and answers 530.
#
# NOTE: terraform/infra/cloudflare.tf still *declares* cloudflare_dns_record.cname_root for
# this hostname. That module is not applied while AWS is abandoned, but the declaration is
# a latent conflict and should be removed in the decommission PR.
#
# The `*` wildcard record is deliberately left alone here. It still points at the dead ALB,
# so www and every scanner-probed subdomain keep returning 530 until that PR.
resource "cloudflare_workers_custom_domain" "apex" {
  account_id = var.cloudflare_account_id
  hostname   = local.env_vars[var.environment].domain_name
  zone_id    = local.env_vars[var.environment].zone_id
  service    = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-web-app"
}
