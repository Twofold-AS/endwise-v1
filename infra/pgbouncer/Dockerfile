# Vår PgBouncer — Scaleway Serverless Container, samme mønster som apps/stream
# (docs/deploy-plan.md): min_scale=1, én prosess, port 6432.
# Managed PostgreSQL har ikke innebygd pooler. Ikke flytt DB til Serverless SQL.
FROM alpine:3.21

RUN apk add --no-cache pgbouncer \
  && mkdir -p /etc/pgbouncer

COPY pgbouncer.ini.tpl /etc/pgbouncer/pgbouncer.ini.tpl
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh \
  && chmod 644 /etc/pgbouncer/pgbouncer.ini.tpl

USER nobody
EXPOSE 6432
ENTRYPOINT ["/entrypoint.sh"]
