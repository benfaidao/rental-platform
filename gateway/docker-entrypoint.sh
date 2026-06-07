#!/bin/sh
set -e

# Railway assigns the public-facing port dynamically via $PORT (it is not
# necessarily 8080), and only knows the upstream service hostnames/ports at
# runtime (private networking DNS such as backend.railway.internal) — so the
# nginx config is generated from the template at container start, substituting
# only the variables below and leaving nginx's own $variables (e.g. $host,
# $remote_addr) untouched.
export PORT="${PORT:-8080}"
envsubst '${PORT} ${BACKEND_HOST} ${BACKEND_PORT} ${FRONTEND_HOST} ${FRONTEND_PORT}' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
