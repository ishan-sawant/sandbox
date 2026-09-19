# The Cloudflare account that owns every resource in this module. Supplied as
# TF_VAR_cloudflare_account_id from CLOUDFLARE_ACCOUNT_ID in dev.env, which the
# workflow also uses to build the R2 backend endpoint.
variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID owning the Worker, KV namespace and custom domain."

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_account_id))
    error_message = "cloudflare_account_id must be a 32-character lowercase hex account ID."
  }
}
