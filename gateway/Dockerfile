FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway injects $PORT at runtime and routes its public domain to it —
# the entrypoint substitutes it into nginx's `listen` directive, so no
# fixed EXPOSE is needed here.

ENTRYPOINT ["/docker-entrypoint.sh"]
