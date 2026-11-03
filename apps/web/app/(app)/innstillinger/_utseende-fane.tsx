'use client';

import { FeltInput, Seksjon, StatefulButton } from '@endwise/ui';
import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';

function filTilBase64(fil: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leser = new FileReader();
    leser.onload = () => {
      const s = String(leser.result ?? '');
      const komma = s.indexOf(',');
      resolve(komma >= 0 ? s.slice(komma + 1) : s);
    };
    leser.onerror = () => reject(new Error('Filen kunne ikke leses.'));
    leser.readAsDataURL(fil);
  });
}

export function UtseendeFane() {
  const hent = trpc.branding.hent.useQuery();
  const lagre = trpc.branding.lagreUtkast.useMutation();
  const publiser = trpc.branding.publiser.useMutation();
  const lastOpp = trpc.branding.lastOppLogo.useMutation();
  const utils = trpc.useUtils();
  const filRef = useRef<HTMLInputElement>(null);
  const [navn, setNavn] = useState<string | null>(null);
  const [farge, setFarge] = useState<string | null>(null);
  const [levertAv, setLevertAv] = useState<boolean | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  const utkast = hent.data?.utkast;
  const visningsnavn = navn ?? utkast?.visningsnavn ?? '';
  const aksent = farge ?? utkast?.aksentfarge ?? '#141414';
  const visLevert = levertAv ?? utkast?.visLevertAv ?? true;

  async function oppdater() {
    setFeil(null);
    try {
      await lagre.mutateAsync({
        visningsnavn,
        aksentfarge: aksent || null,
        visLevertAv: visLevert,
      });
      await utils.branding.hent.invalidate();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Kunne ikke lagre.');
    }
  }

  async function gaaLive() {
    setFeil(null);
    try {
      await lagre.mutateAsync({
        visningsnavn,
        aksentfarge: aksent || null,
        visLevertAv: visLevert,
      });
      await publiser.mutateAsync();
      await utils.branding.hent.invalidate();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Kunne ikke publisere.');
    }
  }

  async function velgLogo(fil: File | undefined) {
    if (!fil) return;
    setFeil(null);
    try {
      const base64 = await filTilBase64(fil);
      await lastOpp.mutateAsync({ base64 });
      await utils.branding.hent.invalidate();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Kunne ikke laste opp logo.');
    }
  }

  if (hent.isError) {
    return (
      <p className="text-body text-fg-muted max-md:text-[16px]">
        Utseende er ikke slått på ennå. Ingenting er endret for kundene.
      </p>
    );
  }

  return (
    <div data-utseende-fane className="flex flex-col gap-5">
      <Seksjon tittel="Kundesiden">
        <FeltInput label="Visningsnavn" value={visningsnavn} onChange={setNavn} />
        <label className="flex flex-col gap-2 text-label text-fg">
          Farge
          <span className="flex items-center gap-3">
            <input
              type="color"
              value={aksent}
              onChange={(e) => setFarge(e.target.value)}
              className="size-11 rounded-full border border-border bg-bg"
              aria-label="Velg farge"
            />
            <FeltInput label="Kode" value={aksent} onChange={setFarge} />
          </span>
        </label>
        <p className="text-meta text-fg-muted max-md:text-[13px]">
          Fargen brukes på navn og aksent — ikke på knapper. Blått som #0066ff er ikke lov. Kontrast
          sjekkes automatisk.
        </p>
        <label className="flex items-center gap-3 text-body text-fg max-md:text-[16px]">
          <input
            type="checkbox"
            checked={visLevert}
            onChange={(e) => setLevertAv(e.target.checked)}
            className="size-5"
          />
          Vis «Levert av Endwise» nederst
        </label>
      </Seksjon>
      <Seksjon tittel="Logo">
        <p className="text-body text-fg-muted max-md:text-[16px]">PNG eller WebP. Ikke SVG.</p>
        <input
          ref={filRef}
          type="file"
          accept="image/png,image/webp"
          className="sr-only"
          onChange={(e) => void velgLogo(e.target.files?.[0])}
        />
        <StatefulButton
          type="button"
          state={lastOpp.isPending ? 'loading' : 'idle'}
          onClick={() => filRef.current?.click()}
        >
          Last opp logo
        </StatefulButton>
        {utkast?.logoUrl ? (
          <p className="text-meta text-fg-muted">Logo er lastet opp. Den vises når du går live.</p>
        ) : null}
      </Seksjon>
      {feil ? <p className="text-body text-danger">{feil}</p> : null}
      <div className="flex flex-wrap gap-3">
        <StatefulButton
          type="button"
          state={lagre.isPending ? 'loading' : 'idle'}
          onClick={() => void oppdater()}
        >
          Lagre utkast
        </StatefulButton>
        <StatefulButton
          type="button"
          state={publiser.isPending ? 'loading' : 'idle'}
          onClick={() => void gaaLive()}
        >
          Gå live
        </StatefulButton>
      </div>
      {hent.data?.publisertAt ? (
        <p className="text-meta text-fg-muted">
          Sist publisert. Kundene ser det publiserte utkastet.
        </p>
      ) : (
        <p className="text-meta text-fg-muted">Ikke publisert. Kundesiden viser «Kommer snart».</p>
      )}
    </div>
  );
}
