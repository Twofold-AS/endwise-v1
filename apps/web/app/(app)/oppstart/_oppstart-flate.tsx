'use client';

import {
  AI_TAK_DEFAULT,
  type Apningstid,
  ONBOARDING_KATEGORI_NAVN,
  ONBOARDING_KATEGORIER,
  ONBOARDING_STORRELSER,
  type OnboardingKategori,
  type OnboardingStorrelse,
  standardApningstider,
} from '@endwise/modules/onboarding';
import { FeltInput, FeltTall, LasterFlate } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SjekkSteg } from '../_shell/oppretter/sjekk-steg';
import { useOppretter } from '../_shell/oppretter/use-oppretter';

const DAG = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const OPPSTART_FEIL = 'Kunne ikke lagre verkstedet. Prøv igjen.';

function oppstartFeilTekst(error: unknown): string {
  const m = error instanceof Error ? error.message : String(error);
  if (/Failed query|SQLSTATE|params:|42703|42501|42P10|42P01/i.test(m)) return OPPSTART_FEIL;
  return m || OPPSTART_FEIL;
}

type Utkast = {
  visningsnavn: string;
  slug: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  kategorier: OnboardingKategori[];
  forventetStorrelse: OnboardingStorrelse;
  aiTak: number;
  apningstider: Apningstid[];
};

const INIT: Utkast = {
  visningsnavn: '',
  slug: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  kategorier: [],
  forventetStorrelse: 'liten',
  aiTak: AI_TAK_DEFAULT,
  apningstider: standardApningstider(),
};

export function OppstartFlate() {
  const utils = trpc.useUtils();
  const status = trpc.onboarding.status.useQuery();
  const fullfor = trpc.onboarding.fullfor.useMutation();
  const lagre = trpc.onboarding.lagre.useMutation();
  const [fylt, setFylt] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'oppstart',
    steg: [
      {
        id: 'profil',
        tittel: 'Profil',
        gyldig: (u) => u.visningsnavn.trim().length >= 2,
      },
      { id: 'tilbud', tittel: 'Kategorier og tjenester', gyldig: () => true, valgfri: true },
      { id: 'kapasitet', tittel: 'Størrelse og åpningstider', gyldig: () => true, valgfri: true },
      {
        id: 'sjekk',
        tittel: 'Sjekk og Gå live',
        gyldig: (u) => u.visningsnavn.trim().length >= 2,
      },
    ],
  });
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    if (fylt || !status.data) return;
    o.oppdater({
      visningsnavn: status.data.visningsnavn || '',
      slug: status.data.slug || '',
      address: status.data.address || '',
      postalCode: status.data.postalCode || '',
      city: status.data.city || '',
      phone: status.data.phone || '',
      email: status.data.email || '',
      kategorier: status.data.kategorier,
      forventetStorrelse:
        status.data.forventetStorrelse === 'middels' || status.data.forventetStorrelse === 'stor'
          ? status.data.forventetStorrelse
          : 'liten',
      aiTak: status.data.aiTak,
      apningstider: status.data.apningstider.length
        ? status.data.apningstider
        : standardApningstider(),
    });
    setFylt(true);
  }, [fylt, o, status.data]);

  async function gaaLive() {
    setFeil(null);
    try {
      await fullfor.mutateAsync({
        visningsnavn: o.utkast.visningsnavn.trim(),
        address: o.utkast.address,
        postalCode: o.utkast.postalCode,
        city: o.utkast.city,
        phone: o.utkast.phone,
        email: o.utkast.email,
        kategorier: o.utkast.kategorier,
        forventetStorrelse: o.utkast.forventetStorrelse,
        aiTak: o.utkast.aiTak,
        apningstider: o.utkast.apningstider,
        extras: [],
      });
      o.toem();
      void utils.session.me.invalidate();
      window.location.assign('/home');
    } catch (error) {
      setFeil(oppstartFeilTekst(error));
    }
  }

  async function hoppVidere() {
    setFeil(null);
    try {
      await lagre.mutateAsync({
        visningsnavn: o.utkast.visningsnavn.trim(),
        address: o.utkast.address,
        postalCode: o.utkast.postalCode,
        city: o.utkast.city,
        phone: o.utkast.phone,
        email: o.utkast.email,
        kategorier: o.utkast.kategorier,
        forventetStorrelse: o.utkast.forventetStorrelse,
        aiTak: o.utkast.aiTak,
        apningstider: o.utkast.apningstider,
      });
    } catch (error) {
      setFeil(oppstartFeilTekst(error));
      return;
    }
    o.neste();
  }

  if (status.isLoading) return <LasterFlate label="Henter oppstart" />;
  if (status.isError) {
    return <p className="text-body text-danger">{oppstartFeilTekst(status.error)}</p>;
  }
  if (status.data?.complete) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-title text-fg">Oppstarten er ferdig</h1>
        <p className="text-body text-fg-muted">Siden er live. Du kan gå videre til verkstedet.</p>
        <a
          href="/home"
          className="inline-flex h-11 w-fit items-center rounded-pill bg-fg px-4 text-label text-bg"
        >
          Til oversikten
        </a>
      </div>
    );
  }

  const kundeLenke = o.utkast.slug ? `https://${o.utkast.slug}.endwise.no` : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title text-fg">Sett opp verkstedet</h1>
        <p data-oppretter-steg className="text-meta text-fg-muted">
          Steg {o.stegIndeks + 1} av {o.stegAntall}
          {o.aktiv?.tittel ? ` · ${o.aktiv.tittel}` : ''}
        </p>
      </div>
      <ol className="flex gap-1.5" aria-hidden>
        {Array.from({ length: o.stegAntall }, (_, i) => i + 1).map((n) => (
          <li
            key={`steg-${n}`}
            className={`h-1.5 flex-1 rounded-full ${n <= o.stegIndeks + 1 ? 'bg-fg' : 'bg-surface-2'}`}
          />
        ))}
      </ol>

      {o.aktiv?.id === 'profil' ? (
        <div className="flex flex-col gap-3">
          <FeltInput
            label="Visningsnavn"
            value={o.utkast.visningsnavn}
            onChange={(v) => o.oppdater({ visningsnavn: v })}
            placeholder="Dette ser kundene"
          />
          {kundeLenke ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] font-[450] leading-5 text-fg-muted">Kundelenke</p>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-body text-fg">{kundeLenke}</p>
                <button
                  type="button"
                  className="shrink-0 text-[15px] font-[450] text-fg underline underline-offset-4"
                  onClick={() => {
                    void navigator.clipboard.writeText(kundeLenke).then(() => {
                      setKopiert(true);
                      window.setTimeout(() => setKopiert(false), 2000);
                    });
                  }}
                >
                  {kopiert ? 'Kopiert' : 'Kopier'}
                </button>
              </div>
              <p className="text-meta text-fg-muted">Satt av Endwise. Kan ikke endres her.</p>
            </div>
          ) : null}
          <FeltInput
            label="Adresse"
            value={o.utkast.address}
            onChange={(v) => o.oppdater({ address: v })}
          />
          <FeltInput
            label="Postnr"
            value={o.utkast.postalCode}
            onChange={(v) => o.oppdater({ postalCode: v })}
          />
          <FeltInput label="Sted" value={o.utkast.city} onChange={(v) => o.oppdater({ city: v })} />
          <FeltInput
            label="Telefon"
            value={o.utkast.phone}
            onChange={(v) => o.oppdater({ phone: v })}
          />
          <FeltInput
            label="E-post"
            type="email"
            value={o.utkast.email}
            onChange={(v) => o.oppdater({ email: v })}
          />
        </div>
      ) : null}

      {o.aktiv?.id === 'tilbud' ? (
        <div className="flex flex-col gap-3">
          <p className="text-body text-fg-muted">Hopp over hvis du vil fylle ut senere.</p>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_KATEGORIER.map((k) => {
              const valgt = o.utkast.kategorier.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={valgt}
                  onClick={() =>
                    o.oppdater({
                      kategorier: valgt
                        ? o.utkast.kategorier.filter((x) => x !== k)
                        : [...o.utkast.kategorier, k],
                    })
                  }
                  className={`inline-flex h-11 items-center rounded-pill px-3 text-label ${
                    valgt ? 'bg-fg text-bg' : 'border border-border text-fg'
                  }`}
                >
                  {ONBOARDING_KATEGORI_NAVN[k]}
                </button>
              );
            })}
          </div>
          <p className="text-meta text-fg-muted">
            Tjenester og priser legger du inn under Tjenester etter Gå live.
          </p>
        </div>
      ) : null}

      {o.aktiv?.id === 'kapasitet' ? (
        <div className="flex flex-col gap-3">
          <p className="text-body text-fg-muted">Standardene duger. Endre om du vil.</p>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_STORRELSER.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={o.utkast.forventetStorrelse === s}
                onClick={() => o.oppdater({ forventetStorrelse: s })}
                className={`inline-flex h-11 items-center rounded-pill px-3 text-label capitalize ${
                  o.utkast.forventetStorrelse === s
                    ? 'bg-fg text-bg'
                    : 'border border-border text-fg'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <FeltTall
            label="AI-tak per måned"
            value={o.utkast.aiTak}
            onChange={(v) => o.oppdater({ aiTak: Number(v) || AI_TAK_DEFAULT })}
          />
          {o.utkast.apningstider
            .slice()
            .sort((a, b) => ((a.dag + 6) % 7) - ((b.dag + 6) % 7))
            .map((rad) => (
              <div key={rad.dag} className="flex flex-wrap items-center gap-2">
                <span className="w-10 text-label text-fg">{DAG[rad.dag]}</span>
                <label className="flex items-center gap-2 text-meta text-fg">
                  <input
                    type="checkbox"
                    checked={rad.stengt}
                    onChange={(e) =>
                      o.oppdater({
                        apningstider: o.utkast.apningstider.map((x) =>
                          x.dag === rad.dag ? { ...x, stengt: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  Stengt
                </label>
                {rad.stengt ? null : (
                  <>
                    <input
                      value={rad.fra}
                      onChange={(e) =>
                        o.oppdater({
                          apningstider: o.utkast.apningstider.map((x) =>
                            x.dag === rad.dag ? { ...x, fra: e.target.value } : x,
                          ),
                        })
                      }
                      className="h-11 w-24 rounded-pill border border-border px-3 text-body"
                      aria-label={`${DAG[rad.dag]} fra`}
                    />
                    <input
                      value={rad.til}
                      onChange={(e) =>
                        o.oppdater({
                          apningstider: o.utkast.apningstider.map((x) =>
                            x.dag === rad.dag ? { ...x, til: e.target.value } : x,
                          ),
                        })
                      }
                      className="h-11 w-24 rounded-pill border border-border px-3 text-body"
                      aria-label={`${DAG[rad.dag]} til`}
                    />
                  </>
                )}
              </div>
            ))}
        </div>
      ) : null}

      {o.aktiv?.id === 'sjekk' ? (
        <SjekkSteg
          rader={[
            { id: 'profil', etikett: 'Firmanavn', verdi: o.utkast.visningsnavn },
            { id: 'profil', etikett: 'Kundelenke', verdi: kundeLenke ?? '—' },
            {
              id: 'tilbud',
              etikett: 'Kategorier',
              verdi: o.utkast.kategorier.map((k) => ONBOARDING_KATEGORI_NAVN[k]).join(', '),
            },
            { id: 'kapasitet', etikett: 'Størrelse', verdi: o.utkast.forventetStorrelse },
            { id: 'kapasitet', etikett: 'AI-tak', verdi: String(o.utkast.aiTak) },
          ]}
          onEndre={o.gaaTil}
        />
      ) : null}

      {feil ? (
        <p role="alert" className="text-body text-danger">
          {feil}
        </p>
      ) : null}

      <div className="flex gap-2">
        {o.stegIndeks > 0 ? (
          <button
            type="button"
            onClick={o.tilbake}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-pill border border-border text-body text-fg"
          >
            Tilbake
          </button>
        ) : null}
        {o.siste ? (
          <button
            type="button"
            disabled={!o.kanGaaVidere || fullfor.isPending}
            onClick={() => void gaaLive()}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-fg text-body text-bg disabled:opacity-40"
          >
            {fullfor.isPending ? 'Åpner …' : 'Gå live'}
          </button>
        ) : (
          <button
            type="button"
            disabled={!o.kanGaaVidere}
            onClick={() => void hoppVidere()}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-fg text-body text-bg disabled:opacity-40"
          >
            {o.aktiv?.valgfri ? 'Hopp over / neste' : 'Neste'}
          </button>
        )}
      </div>
    </div>
  );
}
