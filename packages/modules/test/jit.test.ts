import { describe, expect, it } from 'vitest';
import {
  byggJitVarsel,
  endwiseAktor,
  erAktiv,
  erApen,
  erEndwiseAktivitet,
  erEndwiseAktor,
  JIT_FEIL,
  JIT_GODKJENNINGER,
  JIT_VARIGHET_DEFAULT,
  type JitRad,
  kanGodkjenne,
  markerUtlopt,
  nesteEtterAvvisning,
  nesteEtterGodkjenning,
  nesteEtterTrekk,
  vurderBegrunnelse,
  vurderVarighet,
} from '../src/jit/index.ts';

const NOW = new Date('2026-11-03T12:00:00.000Z');

function rad(del: Partial<JitRad> = {}): JitRad {
  return {
    id: 'g1',
    tenantId: 't1',
    soktAv: 'support-1',
    begrunnelse: 'Kunden får ikke booket fordi timeplanen henger. Trenger å rette én sak.',
    omfang: 'skriv',
    varighetMinutter: 60,
    status: 'venter',
    godkjenner1: null,
    godkjenner2: null,
    godkjentAt: null,
    utloperAt: null,
    ...del,
  };
}

describe('F22 / white label F5b: JIT', () => {
  it('krever begrunnelse på minst 20 tegn og varighet 15–240', () => {
    expect(vurderBegrunnelse('for kort').ok).toBe(false);
    expect(vurderBegrunnelse('x'.repeat(501)).ok).toBe(false);
    const ok = vurderBegrunnelse('  Må rette en hengende booking i Bergen  ');
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.tekst.startsWith('Må rette')).toBe(true);
    expect(vurderVarighet(undefined)).toEqual({ ok: true, minutter: JIT_VARIGHET_DEFAULT });
    expect(vurderVarighet(14).ok).toBe(false);
    expect(vurderVarighet(241).ok).toBe(false);
    expect(vurderVarighet(15).ok).toBe(true);
    expect(vurderVarighet(240).ok).toBe(true);
  });

  it('krever to ulike admin, ikke søker selv', () => {
    expect(JIT_GODKJENNINGER).toBe(2);
    expect(kanGodkjenne({ rad: rad(), godkjennerId: 'support-1', rolle: 'endwise_admin' })).toBe(
      false,
    );
    expect(kanGodkjenne({ rad: rad(), godkjennerId: 'adm-1', rolle: 'endwise_support' })).toBe(
      false,
    );
    const forste = nesteEtterGodkjenning({
      rad: rad(),
      godkjennerId: 'adm-1',
      rolle: 'endwise_admin',
      now: NOW,
    });
    expect(forste.ok).toBe(true);
    if (!forste.ok) return;
    expect(forste.aktivert).toBe(false);
    expect(forste.neste.status).toBe('venter');
    expect(
      nesteEtterGodkjenning({
        rad: forste.neste,
        godkjennerId: 'adm-1',
        rolle: 'endwise_admin',
        now: NOW,
      }).ok,
    ).toBe(false);
    const andre = nesteEtterGodkjenning({
      rad: forste.neste,
      godkjennerId: 'adm-2',
      rolle: 'endwise_admin',
      now: NOW,
    });
    expect(andre.ok).toBe(true);
    if (!andre.ok) return;
    expect(andre.aktivert).toBe(true);
    expect(andre.neste.status).toBe('godkjent');
    expect(erAktiv(andre.neste, NOW)).toBe(true);
    expect(erAktiv(andre.neste, new Date(NOW.getTime() + 60 * 60_000))).toBe(false);
  });

  it('utløper, avviser og trekker uten å lekke hvorfor', () => {
    const aktiv = rad({
      status: 'godkjent',
      godkjenner1: 'adm-1',
      godkjenner2: 'adm-2',
      godkjentAt: NOW,
      utloperAt: new Date(NOW.getTime() + 60_000),
    });
    expect(erApen(aktiv, NOW)).toBe(true);
    const utlopt = markerUtlopt(aktiv, new Date(NOW.getTime() + 120_000));
    expect(utlopt?.status).toBe('utlopt');
    expect(
      nesteEtterAvvisning({ rad: rad(), aktorId: 'support-1', rolle: 'endwise_admin' }).ok,
    ).toBe(false);
    expect(nesteEtterAvvisning({ rad: rad(), aktorId: 'adm-1', rolle: 'endwise_admin' }).ok).toBe(
      true,
    );
    expect(
      nesteEtterTrekk({ rad: rad(), aktorId: 'support-1', rolle: 'endwise_support', now: NOW }).ok,
    ).toBe(true);
    expect(
      nesteEtterTrekk({ rad: rad(), aktorId: 'annen', rolle: 'endwise_support', now: NOW }).ok,
    ).toBe(false);
    expect(JIT_FEIL).toBe('Ikke tillatt');
  });

  it('merker Endwise-aktivitet og bygger varsel uten dealer-host', () => {
    expect(endwiseAktor('u1')).toBe('endwise:u1');
    expect(erEndwiseAktor('endwise:u1')).toBe(true);
    expect(erEndwiseAktivitet({ action: 'jit.sokt', actor: 'endwise:u1' })).toBe(true);
    expect(erEndwiseAktivitet({ action: 'booking.cancelled', actor: 'dealer-1' })).toBe(false);
    const brev = byggJitVarsel({
      forhandler: 'Bergen MC',
      minutter: 60,
      begrunnelse: 'Retter hengende booking.',
      utloper: NOW,
    });
    expect(brev.subject).toMatch(/Bergen MC/);
    expect(brev.text).toMatch(/Organisasjon → Aktivitet fra Endwise/);
    expect(brev.text).not.toMatch(/impersonat|cookie|forhandlervert/i);
    expect(brev.text).toMatch(/Ingen fra Endwise logger inn/);
  });
});
