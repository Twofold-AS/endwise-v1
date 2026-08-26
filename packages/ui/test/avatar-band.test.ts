import { _layout, blobatar } from 'blobatar';
import { describe, expect, it } from 'vitest';

/**
 * Båndkartet I `avatar.tsx` mot biblioteket selv.
 * Dette er den eneste delen av avatarkoden som kan være stille feil.
 * `FORM_BAND` er ti tall jeg leste ut av blobatars vektede `BANDS`-liste og
 * regnet midtpunktet av for hånd. Er ett av dem på feil side av en grense, får
 * brukeren en annen form enn knappen viste — og ingenting kaster, ingenting
 * logger, typecheck er grønn. Det ser bare litt rart ut for én person.
 * `_layout` rapporterer hvilken form biblioteket faktisk valgte. Den er
 * understreket fordi formen på returverdien ikke er offentlig API, men
 * `shape`-navnet er nettopp det denne testen trenger — og at den er privat er
 * en grunn til å teste mot den her, ikke i produksjonskoden.
 * Testen er også versjonsvakten: blobatar fryser seed→utseende per major, så
 * en dag noen bumper til 3.x flytter båndene seg, og da skal dette bli rødt før
 * noen oppdager det i innboksen.
 */

/** Må holdes identisk med `FORM_BAND` i `src/components/avatar.tsx`. */
const FORM_BAND: Record<string, number> = {
  round: 0.11,
  organic: 0.35,
  boxy: 0.54,
  capsule: 0.65,
  nub: 0.745,
  cloud: 0.825,
  droplet: 0.887,
  hexagon: 0.932,
  sun: 0.965,
  triangle: 0.99,
};

/** Må holdes identisk med `TONE_BAND` i samme fil. */
const TONE_BAND = [0.1, 0.28, 0.49, 0.71, 0.865, 0.965];

/** Tre vilkårlige, men faste seeds. Bandet skal treffe uansett hvem det gjelder. */
const SEEDS = ['a1b2', 'ff00-9911', 'test-bruker-42'];

describe('F6-19 — avatarens båndkart', () => {
  for (const [navn, verdi] of Object.entries(FORM_BAND)) {
    it(`«${navn}» treffer formen ${navn}, uansett seed`, () => {
      for (const seed of SEEDS) {
        const l = _layout(seed, { traits: { shape: verdi }, normalize: false });
        expect(l.shape).toBe(navn);
      }
    });
  }

  it('de seks tonene gir seks ULIKE paletter', () => {
    // Traff to av dem samme svatsj, ville to knapper i profilen sett like ut.
    const unike = new Set(
      TONE_BAND.map((t) =>
        JSON.stringify(_layout('kunde-1', { tone: t, normalize: false }).palette),
      ),
    );
    expect(unike.size).toBe(TONE_BAND.length);
  });

  it('samme seed gir samme ansikt — det er hele poenget', () => {
    expect(blobatar('kunde-1', { normalize: false })).toBe(
      blobatar('kunde-1', { normalize: false }),
    );
  });

  it('ulik seed gir ulikt ansikt', () => {
    expect(blobatar('kunde-1', { normalize: false })).not.toBe(
      blobatar('kunde-2', { normalize: false }),
    );
  });

  it('⛔ seeden normaliseres IKKE — «Ola» og «ola» er to ulike IDer', () => {
    /**
     * Vi setter `normalize={false}` fordi seeden vår er en UUID. Testen står her
     * for å fange at standarden endres under oss: slo normalisering seg på
     * igjen, ville IDer som skiller seg bare i store/små bokstaver kollapset til
     * samme ansikt.
     */
    expect(blobatar('Ola', { normalize: false })).not.toBe(blobatar('ola', { normalize: false }));
  });
});
