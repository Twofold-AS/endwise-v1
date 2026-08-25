#!/usr/bin/env bash
# Endwise Quick CONNECT-proxy — Ubuntu 24.04 DEV1-S PAR1 (Scaleway).
#
# Ny tynn boks. Ikke dump-VM 51.15.245.52 (død/timeout), ikke JSON-synk.
# SSH inn med nøkkelen `endwise_scw`, f.eks.:
#   ssh -i ~/.ssh/endwise_scw root@<boks-ip>
#
# Av i appen = fjern QUICK_HTTPS_PROXY i Vercel.
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Kjør som root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_SRC="${1:-$ROOT/quick-connect-proxy.env}"
if [[ ! -f "$ENV_SRC" ]]; then
  echo "Mangler env-fil. cp quick-connect-proxy.env.example quick-connect-proxy.env og fyll inn." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_SRC"
set +a

: "${LISTEN_PORT:?LISTEN_PORT mangler}"
: "${PROXY_USER:?PROXY_USER mangler}"
: "${PROXY_SECRET:?PROXY_SECRET mangler}"
: "${SSH_ALLOW_FROM:?SSH_ALLOW_FROM mangler — operator-IPv4/32, ikke hardkod uten variabel}"

if [[ "$PROXY_SECRET" == "changeme" || ${#PROXY_SECRET} -lt 16 ]]; then
  echo "PROXY_SECRET må byttes (minst 16 tegn). openssl rand -base64 32" >&2
  exit 1
fi

if [[ "$SSH_ALLOW_FROM" == "0.0.0.0/0" || "$SSH_ALLOW_FROM" == "::/0" || "$SSH_ALLOW_FROM" == "x.x.x.x/32" ]]; then
  echo "SSH_ALLOW_FROM må være operator-IPv4/32 — ikke 0.0.0.0/0 og ikke plassholderen." >&2
  exit 1
fi

if grep -Eiq '^[[:space:]]*QUICK_TOKEN=' "$ENV_SRC"; then
  echo "Forbudt: QUICK_TOKEN skal ikke ligge på denne boksen." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends nodejs ufw ca-certificates

id -u endwise-proxy >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin endwise-proxy

install -d -m 0755 /opt/endwise/quick-connect-proxy
install -d -m 0750 /etc/endwise
install -m 0755 "$ROOT/proxy.mjs" /opt/endwise/quick-connect-proxy/proxy.mjs
install -m 0644 "$ROOT/README.md" /opt/endwise/quick-connect-proxy/README.md
install -m 0640 -o root -g endwise-proxy "$ENV_SRC" /etc/endwise/quick-connect-proxy.env
# Fjern SSH_ALLOW_FROM fra runtime-env — den er bare for ufw.
sed -i '/^SSH_ALLOW_FROM=/d' /etc/endwise/quick-connect-proxy.env
install -m 0644 "$ROOT/quick-connect-proxy.service" /etc/systemd/system/quick-connect-proxy.service

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow from "$SSH_ALLOW_FROM" to any port 22 proto tcp comment 'ssh operator'
# CONNECT-porten kan være offentlig: Vercel har ikke fast egress-IP vi kan stole på
# som eneste auth (CWE-290). Auth er PROXY_SECRET.
ufw allow "${LISTEN_PORT}/tcp" comment 'quick CONNECT'
ufw --force enable

systemctl daemon-reload
systemctl enable --now quick-connect-proxy.service
systemctl --no-pager --full status quick-connect-proxy.service || true

echo
echo "Ferdig. I Vercel (server-env):"
echo "  QUICK_HTTPS_PROXY=http://${PROXY_USER}:<secret>@<boks-ip>:${LISTEN_PORT}"
echo "Av = fjern QUICK_HTTPS_PROXY i Vercel."
