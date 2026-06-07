FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway routes its public domain to whatever port the service listens on
# (detected via $PORT or declared explicitly in the service settings) — 8080
# here matches the `listen` directive in nginx.conf.template.
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
