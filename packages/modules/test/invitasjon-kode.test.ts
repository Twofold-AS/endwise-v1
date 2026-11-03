import { describe, expect, it } from 'vitest';
import {
  erKodeLaast,
  genererInvitasjonskode,
  hashInvitasjonskode,
  INVITASJON_KODE_FEIL,
  InvitasjonKodeConfigError,
  KODE_GYLDIGHET_MS,
  KODE_TEGN_ANBEFALT,
  kanSendeKode,
  MAX_FORSOK,
  nesteAntallForsoek,
  nesteSendVindu,
  normaliserKode,
  SEND_MAX_PER_TIME,
  vurderInvitasjonskode,
} from '../src/invitasjon-kode/index.ts';

const PEPPER = 'test-pepper-minst-16';
const ANNEN = 'annen-pepper-minst-16';

describe('F16 / white label F0: invitasjonskode', () => {
  it('genererer 8 tegn, hash ≠ kode, og samme kode+salt+pepper gir samme hash', () => {
    const { kode, salt, hash, expiresAt } = genererInvitasjonskode({ pepper: PEPPER });
    expect(kode).toHaveLength(KODE_TEGN_ANBEFALT);
    expect(kode).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    expect(hash).not.toBe(kode);
    expect(hash).toHaveLength(64);
    expect(hashInvitasjonskode(kode, salt, PEPPER)).toBe(hash);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('normaliserer kode (mellomrom, bindestrek, små bokstaver)', () => {
    expect(normaliserKode(' ab-cd 12 ')).toBe('ABCD12');
    const { kode, salt } = genererInvitasjonskode({ pepper: PEPPER });
    const spaced = kode.split('').join(' ');
    expect(hashInvitasjonskode(spaced, salt, PEPPER)).toBe(hashInvitasjonskode(kode, salt, PEPPER));
  });

  it('annen pepper eller annet salt gir annen hash', () => {
    const { kode, salt, hash } = genererInvitasjonskode({ pepper: PEPPER });
    expect(hashInvitasjonskode(kode, salt, ANNEN)).not.toBe(hash);
    expect(hashInvitasjonskode(kode, 'annet-salt', PEPPER)).not.toBe(hash);
  });

  it('god kode innen utløp og uten bruk er ok', () => {
    const { kode, salt, hash, expiresAt } = genererInvitasjonskode({ pepper: PEPPER });
    const ut = vurderInvitasjonskode(
      kode,
      { codeHash: hash, codeSalt: salt, attempts: 0, expiresAt, usedAt: null },
      { pepper: PEPPER },
    );
    expect(ut).toEqual({ ok: true });
  });

  it('feil kode, utløpt, brukt og låst gir samme feil', () => {
    const now = new Date('2026-11-03T12:00:00.000Z');
    const { kode, salt, hash, expiresAt } = genererInvitasjonskode({
      pepper: PEPPER,
      now,
      gyldighetMs: KODE_GYLDIGHET_MS,
    });
    const rad = { codeHash: hash, codeSalt: salt, attempts: 0, expiresAt, usedAt: null };

    const feilKode = vurderInvitasjonskode('XXXXXXXX', rad, { pepper: PEPPER, now });
    const utlopt = vurderInvitasjonskode(kode, rad, {
      pepper: PEPPER,
      now: new Date(expiresAt.getTime()),
    });
    const brukt = vurderInvitasjonskode(kode, { ...rad, usedAt: now }, { pepper: PEPPER, now });
    const last = vurderInvitasjonskode(
      kode,
      { ...rad, attempts: MAX_FORSOK },
      { pepper: PEPPER, now },
    );

    expect(feilKode).toEqual({ ok: false, feil: INVITASJON_KODE_FEIL });
    expect(utlopt).toEqual(feilKode);
    expect(brukt).toEqual(feilKode);
    expect(last).toEqual(feilKode);
  });

  it('fem feil låser; sjette forsøk avvises selv med riktig kode', () => {
    expect(nesteAntallForsoek(4)).toBe(5);
    expect(erKodeLaast(4)).toBe(false);
    expect(erKodeLaast(5)).toBe(true);
  });

  it('mangler pepper eller ugyldig lengde kaster', () => {
    expect(() => genererInvitasjonskode({ pepper: 'kort' })).toThrow(InvitasjonKodeConfigError);
    expect(() => genererInvitasjonskode({ pepper: PEPPER, lengde: 5 })).toThrow(
      InvitasjonKodeConfigError,
    );
    expect(() => genererInvitasjonskode({ pepper: PEPPER, gyldighetMs: 20 * 60 * 1000 })).toThrow(
      InvitasjonKodeConfigError,
    );
  });

  it('hash i klartekst inneholder ikke koden', () => {
    const { kode, hash } = genererInvitasjonskode({ pepper: PEPPER });
    expect(hash.toLowerCase()).not.toContain(kode.toLowerCase());
  });

  it('maks 3 utsendinger per time, nytt vindu etter en time', () => {
    const now = new Date('2026-11-03T12:00:00.000Z');
    expect(kanSendeKode(null, now)).toBe(true);
    expect(nesteSendVindu(null, now)).toEqual({ sendCount: 1, windowStartedAt: now });

    const to = { sendCount: 2, windowStartedAt: now };
    expect(kanSendeKode(to, now)).toBe(true);
    expect(nesteSendVindu(to, now).sendCount).toBe(3);

    const full = { sendCount: SEND_MAX_PER_TIME, windowStartedAt: now };
    expect(kanSendeKode(full, now)).toBe(false);
    const senere = new Date(now.getTime() + 60 * 60 * 1000);
    expect(kanSendeKode(full, senere)).toBe(true);
    expect(nesteSendVindu(full, senere)).toEqual({ sendCount: 1, windowStartedAt: senere });
  });
});
