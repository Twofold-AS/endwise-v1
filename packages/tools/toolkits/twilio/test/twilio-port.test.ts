import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn(async () => ({ sid: 'SM_test' }));

vi.mock('twilio', () => ({
  default: () => ({
    messages: { create },
  }),
}));

const { createTwilioChannel } = await import('../src/index.ts');

afterEach(() => {
  create.mockClear();
});

const grunn = {
  accountSid: 'ACtest',
  authToken: 'token',
  from: '+4700000000',
};

describe('toolkit-twilio dest-port (Mons residual)', () => {
  it('⛔ avviser klient-to på kanalen', () => {
    expect(() =>
      createTwilioChannel({
        ...grunn,
        to: '+4799999999',
        kanSendeTil: async () => true,
      } as never),
    ).toThrow(/to settes ikke/);
  });

  it('⛔ kanSendeTil er false som default — uten predikat sendes ingenting', async () => {
    const kanal = createTwilioChannel(grunn);
    await expect(
      kanal.send({
        tenantId: 't',
        to: '+4791111111',
        body: 'spam',
        idempotencyKey: 'k0',
      }),
    ).rejects.toThrow(/produkt-destinasjon/);
    expect(create).not.toHaveBeenCalled();
  });

  it('⛔ uten tenantId sendes ingenting, også med alltid-sann predikat', async () => {
    const kanal = createTwilioChannel({
      ...grunn,
      kanSendeTil: async () => true,
    });
    await expect(
      kanal.send({
        tenantId: '',
        to: '+4791111111',
        body: 'x',
        idempotencyKey: 'k-tom',
      }),
    ).rejects.toThrow(/tenantId/);
    expect(create).not.toHaveBeenCalled();
  });

  it('⛔ annen tenants nummer er nei', async () => {
    const kanal = createTwilioChannel({
      ...grunn,
      kanSendeTil: async (to, tenantId) => tenantId === 'tenant-a' && to === '+4791111111',
    });
    await expect(
      kanal.send({
        tenantId: 'tenant-b',
        to: '+4791111111',
        body: 'stjålet',
        idempotencyKey: 'k-kryss',
      }),
    ).rejects.toThrow(/produkt-destinasjon/);
    expect(create).not.toHaveBeenCalled();
  });

  it('⛔ avviser flere mottakere og CR/LF i to', async () => {
    const kanal = createTwilioChannel({
      ...grunn,
      kanSendeTil: async () => true,
    });
    await expect(
      kanal.send({
        tenantId: 't',
        to: '+4791111111,+4792222222',
        body: 'x',
        idempotencyKey: 'k2',
      }),
    ).rejects.toThrow(/Ugyldig to/);
    expect(create).not.toHaveBeenCalled();
  });

  it('godkjent dest i samme tenant fyrer', async () => {
    const kanal = createTwilioChannel({
      ...grunn,
      kanSendeTil: async (to, tenantId) => to === '+4791111111' && tenantId === 't',
    });
    const resultat = await kanal.send({
      tenantId: 't',
      to: '+4791111111',
      body: 'ok',
      idempotencyKey: 'k3',
    });
    expect(resultat.delivered).toBe(true);
    expect(resultat.providerMessageId).toBe('SM_test');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      to: '+4791111111',
      from: '+4700000000',
    });
  });
});
