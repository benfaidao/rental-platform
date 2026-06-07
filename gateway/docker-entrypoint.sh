#!/bin/sh
set -e

# Railway only knows the upstream service hostnames/ports at runtime (private
# networking DNS such as backend.railway.internal), so the nginx config is
# generated from the template at container start, substituting only the four
# variables below — leaving nginx's own $variables (e.g. $host, $remote_addr)
# untouched.
envsubst '${BACKEND_HOST} ${BACKEND_PORT} ${FRONTEND_HOST} ${FRONTEND_PORT}' \
  < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
