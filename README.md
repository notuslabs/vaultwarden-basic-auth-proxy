# Vaultwarden Basic Auth Proxy

Caddy reverse proxy for Railway with HTTP Basic Auth configured through environment variables.

Required variables:

- `BASIC_AUTH_USER`
- `BASIC_AUTH_HASH`
- `UPSTREAM`

Do not commit plaintext credentials or generated password hashes to this repository.
