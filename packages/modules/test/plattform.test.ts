import { describe, expect, it } from 'vitest';
import {
  erForhandlerRutePaaPlattform,
  erPlatformRolle,
  erPlattformTenant,
  invitasjonstekst,
  isVerkstedInspectPath,
  kanFjerneEllerEndreNiva,
  kanSePlatformTeam,
  kanSeVerkstedet,
  LESING_TITLE,
  landingForPlatform,
  PLATFORM_KONTEKST,
  plattformToast,
  remapHrefTilInspect,
  resolvePlatformNiva,
  rolleForPlatformNiva,
  tilbakeHref,
  verkstedSlugFromPath,
} from '../src/plattform/index.ts';

describe('erPlattformTenant', () => {
  it('treffer kind=platform og slug endwise', () => {
    expect(erPlattformTenant({ kind: 'platform', slug: 'endwise' })).toBe(true);
    expect(erPlattformTenant({ kind: 'platform', slug: 'annet' })).toBe(true);
    expect(erPlattformTenant({ kind: 'live', slug: 'endwise' })).toBe(true);
  });

  it('slipper ekte forhandlere gjennom som ikke-plattform', () => {
    expect(erPlattformTenant({ kind: 'live', slug: 'verksted-a' })).toBe(false);
    expect(erPlattformTenant({ kind: 'demo', slug: 'yamaha-bergen' })).toBe(false);
  });
});

describe('plattformnivå', () => {
  it('skiller eier, administrator og support uten F1-10-funksjoner', () => {
    expect(resolvePlatformNiva({ rolle: 'endwise_admin', erEier: true })).toBe('eier');
    expect(resolvePlatformNiva({ rolle: 'endwise_admin', erEier: false })).toBe('administrator');
    expect(resolvePlatformNiva({ rolle: 'endwise_support' })).toBe('support');
    expect(resolvePlatformNiva({ rolle: 'dealer_staff' })).toBeNull();
    expect(rolleForPlatformNiva('administrator')).toBe('endwise_admin');
    expect(rolleForPlatformNiva('support')).toBe('endwise_support');
  });

  it('eier kan ikke fjernes eller endres i UI', () => {
    expect(
      kanFjerneEllerEndreNiva({ erEier: true, userId: 'mikael', kallendeUserId: 'admin' }),
    ).toBe(false);
    expect(
      kanFjerneEllerEndreNiva({ erEier: false, userId: 'support', kallendeUserId: 'admin' }),
    ).toBe(true);
  });

  it('support ser ikke team, men kan Se verkstedet', () => {
    expect(kanSePlatformTeam('support')).toBe(false);
    expect(kanSePlatformTeam('administrator')).toBe(true);
    expect(kanSeVerkstedet('support')).toBe(true);
  });
});

describe('landing og kopi', () => {
  it('plattform-rolle lander på /endwise, aldri /dashboard', () => {
    expect(landingForPlatform('endwise_admin')).toBe('/endwise');
    expect(landingForPlatform('endwise_support')).toBe('/endwise');
    expect(landingForPlatform('dealer_admin')).toBeNull();
    expect(erPlatformRolle('endwise_support')).toBe(true);
  });

  it('invitasjon sier Endwise-support, aldri eier av verksted', () => {
    expect(invitasjonstekst('support').subject).toBe('Du er invitert til Endwise-support');
    expect(invitasjonstekst('administrator').subject).toMatch(/som administrator/);
    expect(invitasjonstekst('support').ingress).not.toMatch(/eier av/);
    expect(invitasjonstekst('administrator').side).not.toMatch(/eier av/);
  });

  it('stale forhandler-kontekst får plattform-toast', () => {
    expect(plattformToast()).toBe('Endwise er plattformen, ikke et verksted.');
    expect(erForhandlerRutePaaPlattform('/dashboard')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/endwise')).toBe(false);
    expect(erForhandlerRutePaaPlattform('/endwise/verksted/yamaha/dashboard')).toBe(false);
    expect(erForhandlerRutePaaPlattform('/innstillinger')).toBe(false);
    expect(erForhandlerRutePaaPlattform('/innstillinger/profil')).toBe(false);
    expect(erForhandlerRutePaaPlattform('/innstillinger/team')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/innstillinger/tjenestekatalog')).toBe(true);
  });
});

describe('Se verkstedet — URL, ikke sesjon', () => {
  it('remap persisterer under /endwise/verksted/[slug]', () => {
    expect(remapHrefTilInspect('/dashboard', 'yamaha')).toBe('/endwise/verksted/yamaha/dashboard');
    expect(remapHrefTilInspect('/saker?visning=kalender', 'yamaha')).toBe(
      '/endwise/verksted/yamaha/saker?visning=kalender',
    );
    expect(isVerkstedInspectPath('/endwise/verksted/yamaha/innboks')).toBe(true);
    expect(verkstedSlugFromPath('/endwise/verksted/yamaha/saker')).toBe('yamaha');
    expect(tilbakeHref('forhandlere')).toBe('/endwise/forhandlere');
    expect(tilbakeHref('innboks')).toBe('/endwise/innboks');
    expect(LESING_TITLE).toBe('Kun lesing');
  });

  it('kontekstetikett er Endwise + Plattform, ikke Forhandler', () => {
    expect(PLATFORM_KONTEKST.label).toBe('Endwise');
    expect(PLATFORM_KONTEKST.hint).toBe('Forhandlere, innboks, flagg');
    expect(PLATFORM_KONTEKST.subtitle).toBe('Plattform');
    expect(PLATFORM_KONTEKST.headerNavn).toBe('Endwise');
  });
});
