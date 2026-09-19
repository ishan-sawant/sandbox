terraform {
  required_version = ">= 1.14.8"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }

  # State lives in Cloudflare R2, which speaks the S3 API. The skip_* flags disable
  # AWS-specific client-side behaviour that R2 does not implement, and use_lockfile
  # replaces the DynamoDB lock table with S3 conditional writes (If-None-Match).
  #
  # bucket, key and endpoints.s3 are supplied via -backend-config so the account id
  # stays out of the repo. See .github/workflows/terraform-cloudflare.yaml.
  backend "s3" {
    region                      = "auto"
    use_lockfile                = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

# Reads CLOUDFLARE_API_TOKEN from the environment, as terraform/infra does.
provider "cloudflare" {}
