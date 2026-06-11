#!/bin/bash
# First-time Let's Encrypt certificate setup for mobiliscar.com
# Run once on the server before starting the full stack.
# Prerequisites:
#   - DNS A record for mobiliscar.com and www.mobiliscar.com pointing to this server
#   - Port 80 and 443 open on the server firewall
#   - Docker and Docker Compose installed

set -e

DOMAIN="mobiliscar.com"
EMAIL="oussama.benfaida@gmail.com"   # used for expiry notices from Let's Encrypt
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Checking DNS (mobiliscar.com must resolve to this server)"
SERVER_IP=$(curl -s https://api.ipify.org)
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -1)
if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
  echo "WARNING: $DOMAIN resolves to $DOMAIN_IP but this server is $SERVER_IP"
  echo "Make sure the DNS is propagated before continuing."
  read -p "Continue anyway? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
fi

echo "==> Backing up current nginx config"
cp nginx.prod.conf nginx.prod.conf.bak

echo "==> Starting nginx in HTTP-only mode (no SSL) for ACME challenge"
cat > nginx.prod-init.conf << 'NGINXEOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / { return 200 "OK"; }
    }
}
NGINXEOF

# Temporarily use the init config
cp nginx.prod.conf.bak nginx.prod.conf.ssl
cp nginx.prod-init.conf nginx.prod.conf

echo "==> Bringing up nginx (HTTP only)"
docker compose -f "$COMPOSE_FILE" up -d nginx

echo "==> Waiting for nginx to be ready..."
sleep 3

echo "==> Requesting certificate from Let's Encrypt"
docker compose -f "$COMPOSE_FILE" run --rm certbot \
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

echo "==> Restoring HTTPS nginx config"
cp nginx.prod.conf.ssl nginx.prod.conf
rm nginx.prod-init.conf nginx.prod.conf.ssl

echo "==> Reloading nginx with HTTPS config"
docker compose -f "$COMPOSE_FILE" up -d nginx
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo ""
echo "✓ HTTPS is ready! Your site is now available at https://$DOMAIN"
echo ""
echo "Auto-renewal runs every 12h via the certbot service."
echo "To check renewal status:  docker compose -f $COMPOSE_FILE logs certbot"
