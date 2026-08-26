/**
 * Connect-only egress-proxy for Quick ApiV2.
 * Tillater kun connect til q3.quick.no:443. Auth = Proxy-Authorization Basic
 * (delt secret) — ikke Vercel-IP-allowlist (CWE-290). Ingen TLS-terminering,
 * ingen Quick-token, ingen body-/header-logg (CWE-532).
 * Access-log (stdout): timestamp, connect-host, status. Aldri Authorization,
 * aldri URL-sti, aldri payload.
 * Av i appen = fjern QUICK_HTTPS_PROXY i Vercel.
 * SSH til boksen: nøkkel `endwise_scw`. Port 22 kun fra SSH_ALLOW_FROM
 * (install.sh) — ikke hardkodet operator-IPv4.
 */
import { timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { pathToFileURL } from 'node:url';

export const ALLOWED_CONNECT_DEST = 'q3.quick.no:443';

/**
 * @typedef {object} QuickConnectProxyOptions
 * @property {string} [user]
 * @property {string} [secret]
 * @property {(line: string) => void} [log]
 * @property {(port: number, host: string, cb: => void) => net.Socket} [connect]
 */

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const padded = Buffer.alloc(left.length);
  right.copy(padded, 0, 0, Math.min(right.length, left.length));
  const sameLength = left.length === right.length;
  return timingSafeEqual(left, padded) && sameLength;
}

function parseBasic(header) {
  if (typeof header !== 'string') return null;
  const match = /^Basic\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  return { user: decoded.slice(0, colon), secret: decoded.slice(colon + 1) };
}

function isAuthorized(req, user, secret) {
  const parsed = parseBasic(req.headers['proxy-authorization']);
  if (!parsed) return false;
  return safeEqual(parsed.user, user) && safeEqual(parsed.secret, secret);
}

function connectDest(req) {
  return String(req.url ?? '').toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function writeStatus(socket, status, extraHeaders = '') {
  const reason =
    status === 200
      ? 'Connection Established'
      : status === 407
        ? 'Proxy Authentication Required'
        : status === 403
          ? 'Forbidden'
          : 'Bad Gateway';
  socket.write(`HTTP/1.1 ${status} ${reason}\r\n${extraHeaders}\r\n`);
}

/**
 * @param {QuickConnectProxyOptions} [options]
 */
export function createQuickConnectProxy(options = {}) {
  const user = options.user ?? process.env.PROXY_USER ?? '';
  const secret = options.secret ?? process.env.PROXY_SECRET ?? '';
  const log = options.log ?? ((line) => process.stdout.write(`${line}\n`));
  const connect = options.connect ?? ((port, host, cb) => net.connect(port, host, cb));

  if (!user || !secret) {
    throw new Error('PROXY_USER og PROXY_SECRET må settes');
  }

  const server = http.createServer((_req, res) => {
    res.writeHead(405, { Allow: 'CONNECT' });
    res.end();
  });

  server.on('connect', (req, clientSocket, head) => {
    const dest = connectDest(req);
    if (!isAuthorized(req, user, secret)) {
      log(`${nowIso()} CONNECT ${dest || '-'} 407`);
      writeStatus(clientSocket, 407, 'Proxy-Authenticate: Basic realm="quick"\r\n');
      clientSocket.end();
      return;
    }
    if (dest !== ALLOWED_CONNECT_DEST) {
      log(`${nowIso()} CONNECT ${dest} 403`);
      writeStatus(clientSocket, 403);
      clientSocket.end();
      return;
    }

    const colon = dest.lastIndexOf(':');
    const host = dest.slice(0, colon);
    const port = Number(dest.slice(colon + 1));
    let established = false;
    const upstream = connect(port, host, () => {
      established = true;
      writeStatus(clientSocket, 200);
      if (head.length) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
      log(`${nowIso()} CONNECT ${dest} 200`);
    });
    upstream.on('error', () => {
      log(`${nowIso()} CONNECT ${dest} 502`);
      if (!established && !clientSocket.destroyed) {
        writeStatus(clientSocket, 502);
        clientSocket.end();
      } else {
        clientSocket.destroy();
      }
    });
    clientSocket.on('error', () => upstream.destroy?.());
  });

  return {
    /**
     * @param {number} [port]
     * @returns {Promise<{ port: number, close: => Promise<void> }>}
     */
    listen(port = 0) {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '0.0.0.0', () => {
          const addr = server.address();
          resolve({
            port: addr.port,
            close: () =>
              new Promise((res, rej) => {
                server.close((err) => (err ? rej(err) : res()));
              }),
          });
        });
      });
    },
  };
}

const isMain = Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);

if (isMain) {
  const listenPort = Number(process.env.LISTEN_PORT || 3128);
  const proxy = createQuickConnectProxy();
  const { port } = await proxy.listen(listenPort);
  process.stdout.write(`listening ${port} CONNECT ${ALLOWED_CONNECT_DEST} only\n`);
}
