# Vaultwarden Basic Auth Proxy

Caddy reverse proxy for Railway that only exposes Vaultwarden under a secret path prefix.

Required variables:

- `PROXY_PREFIX`
- `UPSTREAM`

Do not commit the generated prefix or credentials to this repository.
