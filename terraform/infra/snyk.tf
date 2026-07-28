resource "aws_secretsmanager_secret" "snyk_token" {
  name       = "${local.env_vars[var.environment].project}-${local.env_vars[var.environment].env_short}-snyk-token"
  kms_key_id = aws_kms_key.key.id
}
