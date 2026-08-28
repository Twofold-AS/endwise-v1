'use client';

import {
  Avatar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Inbox,
  PanelRightClose,
  Store,
  Wrench,
  X,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { STATUS_LABEL } from '../../bookinger/_status';
import { MekanikerKompetanse } from '../../mekanikere/kompetanse/_mekaniker';
import { fmtTime } from '../../min-dag/_status';
import { StatusMerke } from './_status';

type Rad = RouterOutput['team']['list'][number];

const FUNKSJON: Record<string, string> = {
  leder: 'Leder',
  selger: 'Selger',
  support: 'Support',
  mekaniker: 'Mekaniker',
};

const VALGBARE = [
  { verdi: 'selger' as const, label: 'Selger', icon: Store },
  { verdi: 'support' as const, label: 'Support', icon: Inbox },
  { verdi: 'mekaniker' as const, label: 'Mekaniker', icon: Wrench },
];

const BREDDE = 'w-[320px]';

export function TeamDetaljer({
  rad,
  apen,
  onLukk,
}: {
  rad: Rad | null;
  apen: boolean;
  onLukk: () => void;
}) {
  const { isAdmin } = useOrgRole();
  if (!apen || !rad) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Lukk detaljer"
        onClick={onLukk}
        className="fixed inset-0 z-30 bg-fg/20 xl:hidden"
      />
      <aside
        className={`${BREDDE} fixed top-0 right-0 bottom-0 z-40 flex h-[calc(100dvh-3.5rem)] shrink-0 flex-col overflow-hidden border-border border-l bg-sidebar xl:static xl:z-auto xl:h-full`}
        aria-label="Detaljer om den ansatte"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-border border-b px-3">
          <h2 className="mr-auto min-w-0 truncate text-title text-fg">Detaljer</h2>
          <button
            type="button"
            onClick={onLukk}
            title="Skjul detaljer"
            aria-label="Skjul detaljer"
            className="flex size-7 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active/60 hover:text-fg"
          >
            <PanelRightClose size={16} strokeWidth={1.75} className="hidden xl:block" />
            <X size={16} strokeWidth={1.75} className="xl:hidden" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <Hvem rad={rad} kanEndre={isAdmin} />
            <Jobber userId={rad.userId} />
            {isAdmin && rad.twoFactorEnabled ? (
              <SlaAv2fa userId={rad.userId} navn={rad.navn} />
            ) : null}
            <KompetanseSeksjon rad={rad} kanEndre={isAdmin} />
            <TimeplanSeksjon rad={rad} kanEndre={isAdmin} />
          </div>
          {isAdmin ? (
            <div className="shrink-0">
              <SlettAnsatt userId={rad.userId} navn={rad.navn} leder={rad.funksjon === 'leder'} />
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="px-1 text-[11px] text-fg-muted uppercase tracking-wide">{tittel}</h3>
      {children}
    </section>
  );
}

function Hvem({ rad, kanEndre }: { rad: Rad; kanEndre: boolean }) {
  const utils = trpc.useUtils();
  const [redigerer, setRedigerer] = useState(false);
  const [epost, setEpost] = useState(rad.epost);
  const [funksjon, setFunksjon] = useState(rad.funksjon);
  const sett = trpc.team.setFunction.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });
  const lagreEpost = trpc.team.endreEpost.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });

  const rolleLabel = FUNKSJON[rad.funksjon] ?? rad.funksjon;
  const epostEndret = epost.trim() !== rad.epost;
  const rolleEndret = rad.kanEndres && funksjon !== rad.funksjon;
  const lagrer = sett.isPending || lagreEpost.isPending;

  function lukk() {
    setEpost(rad.epost);
    setFunksjon(rad.funksjon);
    setRedigerer(false);
  }

  return (
    <Seksjon tittel="Hvem">
      <div className="rounded-control border border-border bg-bg p-3">
        <div className="flex items-center gap-3">
          <Avatar
            seed={rad.userId}
            valg={{ ...rad.avatar, humor: rad.statusHumor ?? rad.avatar.humor }}
            navn={rad.navn}
            size={32}
            bevegelse="hover"
          />
          <div className="min-w-0">
            <p className="truncate text-label text-fg">{rad.navn}</p>
            <StatusMerke status={rad.status} label={rad.statusLabel} />
          </div>
        </div>

        {redigerer ? (
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const nesteEpost = epost.trim();
              const jobs: Promise<unknown>[] = [];
              if (nesteEpost && epostEndret) {
                jobs.push(lagreEpost.mutateAsync({ userId: rad.userId, epost: nesteEpost }));
              }
              if (
                rolleEndret &&
                (funksjon === 'selger' || funksjon === 'support' || funksjon === 'mekaniker')
              ) {
                jobs.push(sett.mutateAsync({ userId: rad.userId, funksjon }));
              }
              void Promise.all(jobs).then(() => setRedigerer(false));
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-fg-muted">E-post</span>
              <input
                type="email"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-fg-muted">Rolle</span>
              {rad.kanEndres ? (
                <fieldset className="flex flex-wrap gap-1" aria-label={`Rolle for ${rad.navn}`}>
                  {VALGBARE.map((v) => (
                    <button
                      key={v.verdi}
                      type="button"
                      aria-pressed={funksjon === v.verdi}
                      disabled={sett.isPending}
                      onClick={() => setFunksjon(v.verdi)}
                      className={`inline-flex h-7 items-center gap-1 rounded-[7px] px-2 text-[12px] ${
                        funksjon === v.verdi
                          ? 'bg-sidebar-active text-fg'
                          : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      <v.icon size={12} />
                      {v.label}
                    </button>
                  ))}
                </fieldset>
              ) : (
                <p className="text-[12px] text-fg-muted">Leder følger av tilgangsnivået.</p>
              )}
            </div>
            {lagreEpost.isError ? (
              <p className="text-[12px] text-danger">{lagreEpost.error.message}</p>
            ) : null}
            {sett.isError ? <p className="text-[12px] text-danger">{sett.error.message}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={lukk}
                className="h-control rounded-control px-3 text-label text-fg-muted"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={lagrer || (!epostEndret && !rolleEndret)}
                className="h-control rounded-control border border-border px-3 text-label text-fg disabled:opacity-40"
              >
                {lagrer ? 'Lagrer …' : 'Lagre'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <div>
              <p className="text-[12px] text-fg-muted">E-post</p>
              <p className="text-label text-fg">{rad.epost || 'ingen e-post'}</p>
            </div>
            <div>
              <p className="text-[12px] text-fg-muted">Rolle</p>
              <p className="text-label text-fg">{rolleLabel}</p>
            </div>
            {kanEndre ? (
              <button
                type="button"
                onClick={() => {
                  setEpost(rad.epost);
                  setFunksjon(rad.funksjon);
                  setRedigerer(true);
                }}
                className="inline-flex h-control items-center self-start rounded-control border border-border px-3 text-label text-fg hover:bg-surface-2"
              >
                Endre
              </button>
            ) : null}
          </div>
        )}

        {kanEndre ? (
          <div className="mt-3">
            <PassordEndring userId={rad.userId} kan={rad.kanLoggeInn && Boolean(rad.epost)} />
          </div>
        ) : null}
      </div>
    </Seksjon>
  );
}

function Jobber({ userId }: { userId: string }) {
  const jobber = trpc.team.jobber.useQuery({ userId });

  return (
    <Seksjon tittel="Planlagte jobber">
      {jobber.isLoading ? (
        <p className="px-1 text-[12px] text-fg-muted">Henter jobber …</p>
      ) : jobber.isError ? (
        <p className="text-[12px] text-danger">{jobber.error.message}</p>
      ) : (jobber.data?.length ?? 0) === 0 ? (
        <p className="rounded-control border border-border border-dashed px-3 py-3 text-[12px] text-fg-muted">
          Ingen tildelte jobber de siste 30 dagene.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {jobber.data?.map((j) => (
            <li key={j.id}>
              <Link
                href={`/bookinger/${j.id}` as Route}
                className="block rounded-control border border-border bg-bg px-3 py-2 hover:bg-surface-2"
              >
                <p className="truncate text-label text-fg">
                  {j.serviceName ?? 'Jobb'} · {j.regNumber ?? 'ukjent regnr'}
                </p>
                <p className="text-[12px] text-fg-muted">
                  {fmtTime(j.startsAt)} · {STATUS_LABEL[j.status] ?? j.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Seksjon>
  );
}

function PassordEndring({ userId, kan }: { userId: string; kan: boolean }) {
  const [apen, setApen] = useState(false);
  const send = trpc.team.sendPassordendring.useMutation({
    onSuccess: () => setApen(false),
  });

  if (!kan) {
    return (
      <p className="text-[12px] text-fg-muted">
        Personen har ingen innlogging. Opprett hen med e-post hvis hen skal få passord.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center rounded-control border border-border px-3 text-label text-fg hover:bg-surface-2"
      >
        Send passordendring
      </button>
      <Dialog open={apen} onOpenChange={setApen}>
        <DialogContent className="top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          <DialogTitle className="text-title text-fg">Sende passordendring?</DialogTitle>
          <DialogDescription className="mt-2 text-body text-fg-muted">
            Vi sender en resetlenke til den lagrede e-posten. Bekreft før vi sender.
          </DialogDescription>
          {send.isError ? (
            <p className="mt-2 text-[12px] text-danger">{send.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-control rounded-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={send.isPending}
              onClick={() => send.mutate({ userId })}
              className="h-control rounded-control bg-fg px-3 text-label text-bg disabled:opacity-40"
            >
              {send.isPending ? 'Sender …' : 'Bekreft og send'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {send.isSuccess ? (
        <p className="text-[12px] text-fg-muted">Passordendring er sendt.</p>
      ) : null}
    </>
  );
}

function SlaAv2fa({ userId, navn }: { userId: string; navn: string }) {
  const utils = trpc.useUtils();
  const [steg, setSteg] = useState<'lukket' | 'bekreft' | 'kode'>('lukket');
  const [kode, setKode] = useState('');
  const start = trpc.team.slaAv2faStart.useMutation({
    onSuccess: () => setSteg('kode'),
  });
  const slaaAv = trpc.team.slaAv2fa.useMutation({
    onSuccess: () => {
      setSteg('lukket');
      setKode('');
      void utils.team.list.invalidate();
    },
  });

  return (
    <Seksjon tittel="Slå av 2FA">
      <p className="text-[12px] text-fg-muted">
        2FA er på. Vi sender en engangskode til din e-post før noe slås av.
      </p>
      <button
        type="button"
        onClick={() => setSteg('bekreft')}
        className="inline-flex h-control items-center rounded-control border border-border px-3 text-label text-fg hover:bg-surface-2"
      >
        Slå av 2FA
      </button>
      <Dialog open={steg !== 'lukket'} onOpenChange={(o) => !o && setSteg('lukket')}>
        <DialogContent className="top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          {steg === 'bekreft' ? (
            <>
              <DialogTitle className="text-title text-fg">Slå av 2FA for {navn}?</DialogTitle>
              <DialogDescription className="mt-2 text-body text-fg-muted">
                Bekreft først. Deretter må du taste inn engangskoden vi sender til deg.
              </DialogDescription>
              {start.isError ? (
                <p className="mt-2 text-[12px] text-danger">{start.error.message}</p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSteg('lukket')}
                  className="h-control rounded-control px-3 text-label text-fg-muted"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={start.isPending}
                  onClick={() => start.mutate({ userId })}
                  className="h-control rounded-control bg-fg px-3 text-label text-bg disabled:opacity-40"
                >
                  {start.isPending ? 'Sender kode …' : 'Bekreft og send kode'}
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogTitle className="text-title text-fg">Skriv inn engangskoden</DialogTitle>
              <DialogDescription className="mt-2 text-body text-fg-muted">
                Koden er sendt til din e-post. 2FA slås ikke av uten den.
              </DialogDescription>
              <label className="mt-3 flex flex-col gap-1">
                <span className="text-[12px] text-fg-muted">Bekreftelseskode</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg"
                />
              </label>
              {slaaAv.isError ? (
                <p className="mt-2 text-[12px] text-danger">{slaaAv.error.message}</p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSteg('lukket')}
                  className="h-control rounded-control px-3 text-label text-fg-muted"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={slaaAv.isPending || kode.trim().length < 4}
                  onClick={() => slaaAv.mutate({ userId, kode: kode.trim() })}
                  className="h-control rounded-control bg-danger px-3 text-label text-white disabled:opacity-40"
                >
                  {slaaAv.isPending ? 'Slår av …' : 'Slå av 2FA'}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Seksjon>
  );
}

function SlettAnsatt({ userId, navn, leder }: { userId: string; navn: string; leder: boolean }) {
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const fjern = trpc.team.fjern.useMutation({
    onSuccess: () => {
      setApen(false);
      void utils.team.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
    },
  });

  if (leder) {
    return (
      <Seksjon tittel="Slett">
        <p className="text-[12px] text-fg-muted">Ledere fjernes ikke herfra.</p>
      </Seksjon>
    );
  }

  return (
    <Seksjon tittel="Slett">
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center rounded-control bg-danger px-3 text-label text-white hover:opacity-90"
      >
        Slett
      </button>
      <Dialog open={apen} onOpenChange={setApen}>
        <DialogContent className="top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          <DialogTitle className="text-title text-fg">Fjerne {navn} fra teamet?</DialogTitle>
          <DialogDescription className="mt-2 text-body text-fg-muted">
            Personen deaktiveres og forsvinner fra teamet. Kontoen slettes ikke.
          </DialogDescription>
          {fjern.isError ? (
            <p className="mt-2 text-[12px] text-danger">{fjern.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-control rounded-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={fjern.isPending}
              onClick={() => fjern.mutate({ userId })}
              className="h-control rounded-control bg-danger px-3 text-label text-white disabled:opacity-40"
            >
              {fjern.isPending ? 'Fjerner …' : 'Bekreft og slett'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Seksjon>
  );
}

function KompetanseSeksjon({ rad, kanEndre }: { rad: Rad; kanEndre: boolean }) {
  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const kompetanse = trpc.competence.listAllMechanicSkills.useQuery();

  if (!rad.harMekanikerprofil || !rad.mechanicId) {
    return (
      <Seksjon tittel="Kompetanse">
        <p className="text-[12px] text-fg-muted">
          Kompetanse gjelder mekanikere. Denne personen har ingen mekanikerprofil.
        </p>
      </Seksjon>
    );
  }

  const mek = mekanikere.data?.find((m) => m.id === rad.mechanicId);
  const rader = (kompetanse.data ?? []).filter((k) => k.mechanicId === rad.mechanicId);

  return (
    <Seksjon tittel="Kompetanse">
      {mek ? (
        <MekanikerKompetanse
          mekaniker={mek}
          ferdigheter={ferdigheter.data ?? []}
          rader={rader}
          kanEndre={kanEndre}
          skjulIdentitet
        />
      ) : (
        <p className="text-[12px] text-fg-muted">Laster kompetanse …</p>
      )}
    </Seksjon>
  );
}

function TimeplanSeksjon({ rad, kanEndre }: { rad: Rad; kanEndre: boolean }) {
  const utils = trpc.useUtils();
  const [kapasitet, setKapasitet] = useState(String(2));
  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const mek = mekanikere.data?.find((m) => m.id === rad.mechanicId);
  const fra = new Date();
  fra.setHours(0, 0, 0, 0);
  const til = new Date(fra);
  til.setDate(til.getDate() + 1);
  const kalender = trpc.bookings.calendar.useQuery(
    { from: fra, to: til, mechanicId: rad.mechanicId ?? undefined },
    { enabled: Boolean(rad.mechanicId) },
  );
  const lagre = trpc.mechanics.updateCapacity.useMutation({
    onSuccess: () => {
      void utils.mechanics.oversikt.invalidate();
    },
  });

  if (!rad.harMekanikerprofil || !rad.mechanicId) {
    return (
      <Seksjon tittel="Timeplan">
        <p className="text-[12px] text-fg-muted">
          Timeplan gjelder mekanikere. Denne personen har ingen mekanikerprofil.
        </p>
      </Seksjon>
    );
  }

  const jobber = kalender.data ?? [];

  return (
    <Seksjon tittel="Timeplan">
      <div className="rounded-control border border-border bg-bg p-3">
        <p className="text-[12px] text-fg-muted">
          {mek ? `${mek.jobberIDag} av ${mek.capacity} i dag` : 'Kapasitet lastes …'}
        </p>
        {mek && kanEndre ? (
          <form
            className="mt-2 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const tall = Number(kapasitet);
              if (!Number.isInteger(tall) || tall < 1 || tall > 10) return;
              lagre.mutate({ mechanicId: mek.id, capacity: tall });
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[12px] text-fg-muted">Samtidige jobber</span>
              <input
                inputMode="numeric"
                defaultValue={String(mek.capacity)}
                onChange={(e) => setKapasitet(e.target.value)}
                className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg"
              />
            </label>
            <button
              type="submit"
              disabled={lagre.isPending}
              className="h-control rounded-control border border-border px-3 text-label text-fg"
            >
              Lagre
            </button>
          </form>
        ) : null}
        <div className="mt-3 flex flex-col gap-1.5">
          {jobber.length === 0 ? (
            <p className="text-[12px] text-fg-muted">Ingen jobber i dag.</p>
          ) : (
            jobber.map((j) => (
              <p key={j.id} className="text-[12px] text-fg">
                {fmtTime(j.startsAt)} · {j.regNumber ?? 'ukjent'} ·{' '}
                {STATUS_LABEL[j.status] ?? j.status}
              </p>
            ))
          )}
        </div>
      </div>
    </Seksjon>
  );
}
