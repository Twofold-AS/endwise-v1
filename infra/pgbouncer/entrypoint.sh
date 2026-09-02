#!/bin/sh
# Én prosess: generer ini + userlist fra env, exec pgbouncer på :6432.
# Ingen hemmeligheter i bildet. PG_HOST / PG_USER / PG_PASSWORD / PG_DATABASE
# kommer fra Scaleway-containerens env (ikke git).
set -eu

: "${PG_HOST:?PG_HOST mangler}"
: "${PG_DATABASE:?PG_DATABASE mangler}"
: "${PG_USER:?PG_USER mangler}"
: "${PG_PASSWORD:?PG_PASSWORD mangler}"
PG_PORT="${PG_PORT:-5432}"

CONF_DIR="${PGBOUNCER_CONF_DIR:-/tmp/pgbouncer}"
mkdir -p "$CONF_DIR"

quote_field() {
  printf '%s' "$1" | sed 's/"/""/g'
}

AUTH_FILE="$CONF_DIR/userlist.txt"
umask 077
printf '"%s" "%s"\n' "$(quote_field "$PG_USER")" "$(quote_field "$PG_PASSWORD")" > "$AUTH_FILE"

# Host/db kan inneholde tegn som ødelegger sed — bruk | som skilletegn og
# nekte | i verdiene.
for v in "$PG_HOST" "$PG_PORT" "$PG_DATABASE" "$AUTH_FILE" "$CONF_DIR"; do
  case "$v" in
    *'|'*) echo "pgbouncer: verdi inneholder '|'" >&2; exit 1 ;;
  esac
done

sed \
  -e "s|__PG_HOST__|${PG_HOST}|g" \
  -e "s|__PG_PORT__|${PG_PORT}|g" \
  -e "s|__PG_DATABASE__|${PG_DATABASE}|g" \
  -e "s|__AUTH_FILE__|${AUTH_FILE}|g" \
  -e "s|__PIDFILE__|${CONF_DIR}/pgbouncer.pid|g" \
  -e "s|__CONF_DIR__|${CONF_DIR}|g" \
  /etc/pgbouncer/pgbouncer.ini.tpl > "$CONF_DIR/pgbouncer.ini"

exec pgbouncer "$CONF_DIR/pgbouncer.ini"
