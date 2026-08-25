import { readFileSync } from 'node:fs';
import { type AddressInfo, createConnection, createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createQuickConnectProxy } from '../../../../../ops/quick-connect-proxy/proxy.mjs';

const USER = 'endwise';
const SECRET = 'test-secret-ikke-ekte';

function basic(user: string, secret: string): string {
  return `${user}:${secret}`;
}

async function sendConnect(opts: {
  port: number;
  dest: string;
  auth?: string;
}): Promise<{ status: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ port: opts.port, host: '127.0.0.1' }, () => {
      let req = `CONNECT ${opts.dest} HTTP/1.1\r\nHost: ${opts.dest}\r\n`;
      if (opts.auth) {
        req += `Proxy-Authorization: Basic ${Buffer.from(opts.auth).toString('base64')}\r\n`;
      }
      req += '\r\n';
      socket.write(req);
    });
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      if (buf.includes('\r\n\r\n')) {
        const status = Number(buf.split(' ')[1]);
        socket.end();
        resolve({ status, raw: buf });
      }
    });
    socket.on('error', reject);
    socket.setTimeout(2000, () => {
      socket.destroy();
      reject(new Error('CONNECT timeout'));
    });
  });
}

async function sendGet(port: number, auth?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      let req = 'GET http://q3.quick.no/api/v2/client/info HTTP/1.1\r\nHost: q3.quick.no\r\n';
      if (auth) {
        req += `Proxy-Authorization: Basic ${Buffer.from(auth).toString('base64')}\r\n`;
      }
      req += '\r\n';
      socket.write(req);
    });
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      if (buf.includes('\r\n\r\n')) {
        socket.end();
        resolve(Number(buf.split(' ')[1]));
      }
    });
    socket.on('error', reject);
  });
}

afterEach(() => {
  delete process.env.PROXY_USER;
  delete process.env.PROXY_SECRET;
});

describe('ops/quick-connect-proxy — dest-lås + secret-auth', () => {
  it('CONNECT q3.quick.no:443 med gyldig Basic → 200 (uten å nå live Quick)', async () => {
    const upstream: { host: string; port: number }[] = [];
    const dummy = createServer((socket) => socket.end());
    await new Promise<void>((resolve) => dummy.listen(0, '127.0.0.1', resolve));
    const dummyPort = (dummy.address() as AddressInfo).port;
    const proxy = createQuickConnectProxy({
      user: USER,
      secret: SECRET,
      log: () => undefined,
      connect: (port, host, cb) => {
        upstream.push({ host, port });
        return createConnection({ port: dummyPort, host: '127.0.0.1' }, cb);
      },
    });
    const { port, close } = await proxy.listen(0);
    try {
      const res = await sendConnect({
        port,
        dest: 'q3.quick.no:443',
        auth: basic(USER, SECRET),
      });
      expect(res.status).toBe(200);
      expect(upstream).toEqual([{ host: 'q3.quick.no', port: 443 }]);
    } finally {
      await close();
      await new Promise<void>((resolve, reject) =>
        dummy.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it('CONNECT til annet dest → 403, ingen upstream (CWE-441/918)', async () => {
    const upstream: unknown[] = [];
    const proxy = createQuickConnectProxy({
      user: USER,
      secret: SECRET,
      log: () => undefined,
      connect: (port, host, cb) => {
        upstream.push({ host, port });
        queueMicrotask(() => cb());
        return createConnection({ port: 9, host: '127.0.0.1' });
      },
    });
    const { port, close } = await proxy.listen(0);
    try {
      for (const dest of [
        'google.com:443',
        'q3.quick.no:80',
        '127.0.0.1:443',
        'q3.quick.no:8443',
      ]) {
        const res = await sendConnect({ port, dest, auth: basic(USER, SECRET) });
        expect(res.status, dest).toBe(403);
      }
      expect(upstream).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it('CONNECT uten/feil auth → 407 (CWE-290, ikke IP-only)', async () => {
    const proxy = createQuickConnectProxy({
      user: USER,
      secret: SECRET,
      log: () => undefined,
    });
    const { port, close } = await proxy.listen(0);
    try {
      const none = await sendConnect({ port, dest: 'q3.quick.no:443' });
      expect(none.status).toBe(407);
      const wrong = await sendConnect({
        port,
        dest: 'q3.quick.no:443',
        auth: basic(USER, 'feil'),
      });
      expect(wrong.status).toBe(407);
    } finally {
      await close();
    }
  });

  it('vanlig HTTP GET gjennom proxy → 405 (kun CONNECT)', async () => {
    const proxy = createQuickConnectProxy({
      user: USER,
      secret: SECRET,
      log: () => undefined,
    });
    const { port, close } = await proxy.listen(0);
    try {
      expect(await sendGet(port, basic(USER, SECRET))).toBe(405);
    } finally {
      await close();
    }
  });

  it('access-log er kun timestamp, CONNECT-host og status — aldri secret/path/Authorization', async () => {
    const lines: string[] = [];
    const proxy = createQuickConnectProxy({
      user: USER,
      secret: SECRET,
      log: (line) => lines.push(line),
    });
    const { port, close } = await proxy.listen(0);
    try {
      await sendConnect({
        port,
        dest: 'evil.example:443',
        auth: basic(USER, SECRET),
      });
      await sendConnect({ port, dest: 'q3.quick.no:443' });
    } finally {
      await close();
    }
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T.* CONNECT /);
      expect(line).not.toMatch(/test-secret-ikke-ekte/);
      expect(line).not.toMatch(/Authorization/i);
      expect(line).not.toMatch(/\/api\/v2/);
      expect(line).not.toMatch(/client\/info/);
      expect(line).not.toMatch(/Proxy-Authorization/i);
    }
    expect(lines.some((l) => l.includes('CONNECT evil.example:443 403'))).toBe(true);
    expect(lines.some((l) => l.includes('CONNECT q3.quick.no:443 407'))).toBe(true);
  });
});

describe('ops/quick-connect-proxy.service — Node/V8 + MDWE', () => {
  const unit = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../../../ops/quick-connect-proxy/quick-connect-proxy.service'),
    'utf8',
  );

  it('har ikke MemoryDenyWriteExecute=yes (V8 JIT trenger kjørbare sider)', () => {
    expect(unit).not.toMatch(/^\s*MemoryDenyWriteExecute\s*=\s*yes\s*$/m);
    expect(unit).toMatch(/Node\/V8.*MemoryDenyWriteExecute/);
  });

  it('beholder øvrig systemd-herding', () => {
    expect(unit).toMatch(/^\s*NoNewPrivileges=yes\s*$/m);
    expect(unit).toMatch(/^\s*PrivateTmp=yes\s*$/m);
    expect(unit).toMatch(/^\s*ProtectSystem=strict\s*$/m);
    expect(unit).toMatch(/^\s*ProtectHome=yes\s*$/m);
    expect(unit).toMatch(/^\s*ProtectKernelTunables=yes\s*$/m);
    expect(unit).toMatch(/^\s*ProtectControlGroups=yes\s*$/m);
    expect(unit).toMatch(/^\s*RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX\s*$/m);
    expect(unit).toMatch(/^\s*RestrictNamespaces=yes\s*$/m);
    expect(unit).toMatch(/^\s*LockPersonality=yes\s*$/m);
    expect(unit).toMatch(/^\s*SystemCallArchitectures=native\s*$/m);
  });
});
