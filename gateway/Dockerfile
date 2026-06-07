FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway uses EXPOSE to know which port to route the public domain's
# traffic to — must match the `listen` directive in nginx.conf.template.
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
