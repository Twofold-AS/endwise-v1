#!/usr/bin/env bash
# Endwise Quick live-gateway — Ubuntu 24.04 DEV1-S PAR1 (Scaleway).
#
# Tynn HTTPS-videresending. Ikke CONNECT, ikke dump-VM 51.15.245.52, ikke JSON-synk.
# SSH inn med nøkkelen `endwise_scw`, f.eks.:
#   ssh -i ~/.ssh/endwise_scw root@<boks-ip>
#
# Av i appen = fjern QUICK_GATEWAY_URL i Vercel.
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Kjør som root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_SRC="${1:-$ROOT/quick-gateway.env}"
if [[ ! -f "$ENV_SRC" ]]; then
  echo "Mangler env-fil. cp quick-gateway.env.example quick-gateway.env og fyll inn." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_SRC"
set +a

: "${LISTEN_PORT:?LISTEN_PORT mangler}"
: "${GATEWAY_SECRET:?GATEWAY_SECRET mangler}"
: "${SSH_ALLOW_FROM:?SSH_ALLOW_FROM mangler — operator-IPv4/32, ikke hardkod uten variabel}"

if [[ "$GATEWAY_SECRET" == "changeme" || ${#GATEWAY_SECRET} -lt 16 ]]; then
  echo "GATEWAY_SECRET må byttes (minst 16 tegn). openssl rand -base64 32" >&2
  exit 1
fi

if [[ "$SSH_ALLOW_FROM" == "0.0.0.0/0" || "$SSH_ALLOW_FROM" == "::/0" || "$SSH_ALLOW_FROM" == "x.x.x.x/32" ]]; then
  echo "SSH_ALLOW_FROM må være operator-IPv4/32 — ikke 0.0.0.0/0 og ikke plassholderen." >&2
  exit 1
fi

if grep -Eiq '^[[:space:]]*(QUICK_TOKEN|QUICK_API_TOKEN|TOKEN)=' "$ENV_SRC"; then
  echo "Forbudt: Quick-token skal ikke ligge på denne boksen (CWE-922)." >&2
  exit 1
fi

TLS_CERT_PATH="${TLS_CERT_PATH:-/etc/endwise/quick-gateway.crt}"
TLS_KEY_PATH="${TLS_KEY_PATH:-/etc/endwise/quick-gateway.key}"
LISTEN_HOST="${LISTEN_HOST:-0.0.0.0}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends nodejs ufw ca-certificates openssl

id -u endwise-gateway >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin endwise-gateway

install -d -m 0755 /opt/endwise/quick-gateway
install -d -m 0750 /etc/endwise
install -m 0755 "$ROOT/gateway.mjs" /opt/endwise/quick-gateway/gateway.mjs
install -m 0644 "$ROOT/README.md" /opt/endwise/quick-gateway/README.md

if [[ ! -f "$TLS_CERT_PATH" || ! -f "$TLS_KEY_PATH" ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$TLS_KEY_PATH" \
    -out "$TLS_CERT_PATH" \
    -days 825 \
    -subj "/CN=quick-gateway"
fi
chmod 0640 "$TLS_KEY_PATH" "$TLS_CERT_PATH"
chown root:endwise-gateway "$TLS_KEY_PATH" "$TLS_CERT_PATH"

install -m 0640 -o root -g endwise-gateway "$ENV_SRC" /etc/endwise/quick-gateway.env
# Fjern SSH_ALLOW_FROM fra runtime-env — den er bare for ufw.
sed -i '/^SSH_ALLOW_FROM=/d' /etc/endwise/quick-gateway.env
# Sørg for at TLS-stier finnes i runtime-env.
grep -q '^TLS_CERT_PATH=' /etc/endwise/quick-gateway.env || echo "TLS_CERT_PATH=${TLS_CERT_PATH}" >> /etc/endwise/quick-gateway.env
grep -q '^TLS_KEY_PATH=' /etc/endwise/quick-gateway.env || echo "TLS_KEY_PATH=${TLS_KEY_PATH}" >> /etc/endwise/quick-gateway.env
install -m 0644 "$ROOT/quick-gateway.service" /etc/systemd/system/quick-gateway.service

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow from "$SSH_ALLOW_FROM" to any port 22 proto tcp comment 'ssh operator'
# Gateway-porten kan være offentlig: Vercel har ikke fast egress-IP vi kan stole på
# som eneste auth (CWE-290). Auth er GATEWAY_SECRET (og ev. mTLS).
ufw allow "${LISTEN_PORT}/tcp" comment 'quick gateway https'
ufw --force enable

systemctl daemon-reload
systemctl enable --now quick-gateway.service
systemctl --no-pager --full status quick-gateway.service || true

echo
echo "Ferdig. I Vercel (server-env, aldri NEXT_PUBLIC_):"
echo "  QUICK_GATEWAY_URL=https://<boks-host-eller-ip>:${LISTEN_PORT}"
echo "  QUICK_GATEWAY_SECRET=<samme som GATEWAY_SECRET>"
echo "Av = fjern QUICK_GATEWAY_URL (og QUICK_GATEWAY_SECRET) i Vercel."
echo "CONNECT (QUICK_HTTPS_PROXY) kan stå uset."
echo "api.endwise.no / Let's Encrypt kan komme senere — bind/host holder."
