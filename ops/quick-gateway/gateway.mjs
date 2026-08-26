/**
 * Tynn live Quick-gateway (ikke connect, ikke dump-vm).
 * Vercel → HTTPS hit → denne boksen → HTTPS ut til q3.quick.no:443.
 * Historisk fikk kun kall som oppsto på Scaleway-boksen HTTP 200 hos Quick.
 * Auth Endwise→gateway: delt secret (X-Endwise-Gateway-Secret eller Bearer).
 * Ikke Vercel-IP (CWE-290). Valgfri mTLS hvis TLS_CLIENT_CA_PATH er satt.
 * Gateway kaller kun q3.quick.no og en fast allowlist av Quick-stier
 * (CWE-441/918). Ingen vilkårlig URL/proxy.
 * Forhandlerens Quick-token kommer per request (header), lever kun i
 * prosessminne, skrives aldri til disk (CWE-922).
 * Logg: statuskode + varighet. Aldri body eller headers (CWE-532).
 * Upstream mot q3.quick.no matcher working curl: User-Agent curl/8.5.0,
 * Authorization + Accept, HTTP/1.1 (https.request — ikke Node/undici H2).
 * Av i appen = fjern QUICK_GATEWAY_URL i Vercel.
 * SSH til boksen: nøkkel `endwise_scw`. Port 22 kun fra SSH_ALLOW_FROM
 * (install.sh) — ikke 0.0.0.0/0.
 */
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

export const ALLOWED_QUICK_HOST = 'q3.quick.no';
export const GATEWAY_SECRET_HEADER = 'x-endwise-gateway-secret';
export const QUICK_TOKEN_HEADER = 'x-quick-token';
/**
 * Curl-ekvivalent mot q3.quick.no. Live curl (HTTP/1.1 + denne ua) gir 200;
 * Node/undici-default (annen ua, ofte HTTP/2) har gitt 500 på samme boks.
 */
export const QUICK_CURL_USER_AGENT = 'curl/8.5.0';
export const QUICK_UPSTREAM_ALLOW_H2 = false;
export const QUICK_UPSTREAM_DISPATCHER = Object.freeze({ allowH2: QUICK_UPSTREAM_ALLOW_H2 });

/** Fast allowlist — ingen andre Quick-stier, ingen vilkårlig proxy. */
export const ALLOWED_QUICK_API_PATHS = [
  '/api/v2/client/info',
  '/api/v2/customer/batch',
  '/api/v2/item/batch',
  '/api/v2/stockentry/batch',
];

const INSTANCE = '[A-Za-z0-9_-]+';
const API_TAIL = 'api/v2/(?:client/info|customer/batch|item/batch|stockentry/batch)';
const ALLOWED_PATH_RE = new RegExp(`^/${INSTANCE}/${API_TAIL}$`);

/**
 * @typedef {object} QuickGatewayOptions
 * @property {string} [secret]
 * @property {(line: string) => void} [log]
 * @property {typeof fetch} [fetch]
 * @property {import('node:https').ServerOptions | false} [tls]
 * @property {string} [host]
 */

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const padded = Buffer.alloc(left.length);
  right.copy(padded, 0, 0, Math.min(right.length, left.length));
  const sameLength = left.length === right.length;
  return timingSafeEqual(left, padded) && sameLength;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * @param {string} rawUrl
 * @returns {{ pathname: string, search: string } | null}
 */
export function matchAllowedQuickPath(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl, `https://${ALLOWED_QUICK_HOST}`);
  } catch {
    return null;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  if (pathname.includes('..') || pathname.includes('//') || pathname.includes('\\')) {
    return null;
  }
  if (!ALLOWED_PATH_RE.test(pathname)) return null;
  return { pathname, search: parsed.search };
}

/**
 * @param {import('node:http').IncomingMessage} req
 */
function gatewaySecretFromReq(req) {
  const dedicated = req.headers[GATEWAY_SECRET_HEADER];
  if (typeof dedicated === 'string' && dedicated.length > 0) return dedicated;
  const auth = req.headers.authorization;
  if (typeof auth === 'string') {
    const match = /^Bearer\s+(\S+)$/i.exec(auth.trim());
    if (match) return match[1];
  }
  return '';
}

/**
 * Token kun fra request — aldri env/disk. Returnert streng er request-skopet.
 * @param {import('node:http').IncomingMessage} req
 */
function quickTokenFromReq(req) {
  const dedicated = req.headers[QUICK_TOKEN_HEADER];
  if (typeof dedicated === 'string' && dedicated.trim()) return dedicated.trim();
  const auth = req.headers.authorization;
  if (typeof auth === 'string') {
    const match = /^Token\s+token=(.+)$/i.exec(auth.trim());
    if (match) return match[1];
  }
  return '';
}

/**
 * Default upstream: node:https.request (alltid HTTP/1.1). Ingen undici-dep
 * på boksen (apt nodejs). Tester injiserer options.fetch og leser init.
 * @param {string} url
 * @param {{ method?: string, headers?: Record<string, string>, signal?: AbortSignal }} [init]
 * @returns {Promise<Response>}
 */
export function curlEquivalentUpstreamFetch(url, init = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method ?? 'GET',
        headers: init.headers,
      },
      (res) => {
        resolve(
          new Response(Readable.toWeb(res), {
            status: res.statusCode ?? 502,
            headers: /** @type {HeadersInit} */ (res.headers),
          }),
        );
      },
    );
    req.on('error', reject);
    const signal = init.signal;
    if (signal) {
      const onAbort = () => {
        req.destroy();
        reject(signal.reason ?? new Error('aborted'));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
      req.on('close', () => signal.removeEventListener('abort', onAbort));
    }
    req.end();
  });
}

function loadTlsFromEnv() {
  const certPath = process.env.TLS_CERT_PATH ?? '';
  const keyPath = process.env.TLS_KEY_PATH ?? '';
  if (!certPath || !keyPath) return null;
  /** @type {import('node:https').ServerOptions} */
  const tls = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  const caPath = process.env.TLS_CLIENT_CA_PATH ?? '';
  if (caPath) {
    tls.ca = fs.readFileSync(caPath);
    tls.requestCert = true;
    tls.rejectUnauthorized = true;
  }
  return tls;
}

/**
 * @param {QuickGatewayOptions} [options]
 */
export function createQuickGateway(options = {}) {
  const secret = options.secret ?? process.env.GATEWAY_SECRET ?? '';
  const log = options.log ?? ((line) => process.stdout.write(`${line}\n`));
  const fetchImpl = options.fetch ?? curlEquivalentUpstreamFetch;
  const tls = options.tls === false ? null : (options.tls ?? null);

  if (!secret) {
    throw new Error('GATEWAY_SECRET må settes');
  }

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function handle(req, res) {
    const started = Date.now();
    const finish = (status) => {
      // CWE-532: kun status + varighet. Ingen sti, headers eller body.
      log(`${nowIso()} ${status} ${Date.now() - started}ms`);
    };

    if ((req.method ?? '') !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      res.end();
      finish(405);
      return;
    }

    const presented = gatewaySecretFromReq(req);
    if (!presented || !safeEqual(presented, secret)) {
      res.writeHead(401);
      res.end();
      finish(401);
      return;
    }

    const allowed = matchAllowedQuickPath(req.url ?? '');
    if (!allowed) {
      res.writeHead(403);
      res.end();
      finish(403);
      return;
    }

    let token = quickTokenFromReq(req);
    if (!token) {
      res.writeHead(400);
      res.end();
      finish(400);
      return;
    }

    const upstreamUrl = `https://${ALLOWED_QUICK_HOST}${allowed.pathname}${allowed.search}`;
    const authorization = `Token token=${token}`;
    token = '';

    let upstream;
    try {
      upstream = await fetchImpl(upstreamUrl, {
        method: 'GET',
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'User-Agent': QUICK_CURL_USER_AGENT,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        dispatcher: QUICK_UPSTREAM_DISPATCHER,
      });
    } catch {
      res.writeHead(502);
      res.end();
      finish(502);
      return;
    }

    const headers = {};
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers['content-type'] = contentType;
    res.writeHead(upstream.status, headers);
    finish(upstream.status);

    if (!upstream.body) {
      res.end();
      return;
    }
    const stream = Readable.fromWeb(upstream.body);
    stream.on('error', () => {
      if (!res.writableEnded) res.destroy();
    });
    stream.pipe(res);
  }

  const server = tls ? https.createServer(tls, handle) : http.createServer(handle);

  return {
    /**
     * @param {number} [port]
     * @param {string} [host]
     * @returns {Promise<{ port: number, close: => Promise<void> }>}
     */
    listen(port = 0, host = options.host ?? '127.0.0.1') {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          const addr = server.address();
          resolve({
            port: addr.port,
            close: () =>
              new Promise((resClose, rej) => {
                server.close((err) => (err ? rej(err) : resClose()));
              }),
          });
        });
      });
    },
  };
}

const isMain = Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);

if (isMain) {
  const tls = loadTlsFromEnv();
  if (!tls) {
    throw new Error('TLS_CERT_PATH og TLS_KEY_PATH må settes (HTTPS-lytter)');
  }
  const listenPort = Number(process.env.LISTEN_PORT || 8443);
  const listenHost = process.env.LISTEN_HOST || '0.0.0.0';
  const gateway = createQuickGateway({ tls, host: listenHost });
  const { port } = await gateway.listen(listenPort, listenHost);
  process.stdout.write(`listening ${port} HTTPS ${ALLOWED_QUICK_HOST} allowlist only\n`);
}
