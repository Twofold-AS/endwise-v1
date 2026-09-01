import { afterEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn(async () => ({ data: { id: 're_test' }, error: null }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const { createResendChannel, RESEND_FROM_KANONISK } = await import('../src/index.ts');

afterEach(() => {
  send.mockClear();
});

describe('toolkit-resend From/to-port (Mons residual)', () => {
  it('From er nøyaktig Endwise <noreply@endwise.no>', () => {
    expect(RESEND_FROM_KANONISK).toBe('Endwise <noreply@endwise.no>');
  });

  it('⛔ avviser custom from på kanalen', () => {
    expect(() =>
      createResendChannel({
        apiKey: 're_test',
        from: 'Hacker <evil@evil.no>',
        kanSendeTil: async () => true,
      } as never),
    ).toThrow(/from settes ikke/);
  });

  it('⛔ krever kanSendeTil — ingen send uten dest-port', () => {
    expect(() => createResendChannel({ apiKey: 're_test' } as never)).toThrow(/kanSendeTil/);
  });

  it('⛔ sender ikke til fremmed to', async () => {
    const kanal = createResendChannel({
      apiKey: 're_test',
      kanSendeTil: async () => false,
    });
    await expect(
      kanal.send({
        tenantId: 't',
        to: 'hvem-som-helst@evil.no',
        body: 'spam',
        idempotencyKey: 'k1',
      }),
    ).rejects.toThrow(/produkt-destinasjon/);
    expect(send).not.toHaveBeenCalled();
  });

  it('⛔ avviser flere mottakere og CR/LF i to', async () => {
    const kanal = createResendChannel({
      apiKey: 're_test',
      kanSendeTil: async () => true,
    });
    await expect(
      kanal.send({
        tenantId: 't',
        to: 'a@b.no,c@d.no',
        body: 'x',
        idempotencyKey: 'k2',
      }),
    ).rejects.toThrow(/Ugyldig to/);
    expect(send).not.toHaveBeenCalled();
  });

  it('godkjent dest fyrer med kanonisk From, aldri klient-from', async () => {
    const kanal = createResendChannel({
      apiKey: 're_test',
      kanSendeTil: async (to) => to === 'kunde@example.no',
    });
    const resultat = await kanal.send({
      tenantId: 't',
      to: 'kunde@example.no',
      subject: 'Hei\r\nBcc: x',
      body: 'ok',
      idempotencyKey: 'k3',
    });
    expect(resultat.delivered).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]?.[0] as { from: string; to: string; subject: string };
    expect(payload.from).toBe(RESEND_FROM_KANONISK);
    expect(payload.to).toBe('kunde@example.no');
    expect(payload.subject).not.toMatch(/[\r\n]/);
  });
});
