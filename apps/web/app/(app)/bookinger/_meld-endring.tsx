'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudeAct, ClaudeChip } from '../_shell/claude-flate';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
import { invalidateHjemPulse } from '../_shell/hjem-pulse-sync';
import { FELT_MD } from '@endwise/ui';

/**
 * Jobbdetalj — meld avvik eller forespørsel.
 * Skriver merket notat via bookings.reportChange. Ingen ny destinasjon.
 */
export function MeldEndring({ bookingId }: { bookingId: string }) {
  const utils = trpc.useUtils();
  const [type, setType] = useState<'avvik' | 'foresporsel'>('avvik');
  const [melding, setMelding] = useState('');
  const [apen, setApen] = useState(false);
  const report = trpc.bookings.reportChange.useMutation({
    onSuccess: () => {
      void utils.bookings.byId.invalidate({ id: bookingId });
      invalidateHjemPulse(utils);
      setMelding('');
      setApen(false);
    },
  });

  return (
    <div data-meld-endring>
      {!apen ? (
        <ClaudeAct kind="ghost" onClick={() => setApen(true)}>
          Meld avvik eller forespørsel
        </ClaudeAct>
      ) : (
        <InnstillingSeksjon
          tittel="Meld endring"
          ingress="Skrives som merket notat på jobben. Godkjenn/Avslå ligger under Timeplan › Endringer."
        >
          <InnstillingRad label="Type">
            <div className="flex flex-wrap gap-2">
              <ClaudeChip active={type === 'avvik'} onClick={() => setType('avvik')}>
                Avvik
              </ClaudeChip>
              <ClaudeChip active={type === 'foresporsel'} onClick={() => setType('foresporsel')}>
                Forespørsel
              </ClaudeChip>
            </div>
          </InnstillingRad>
          <InnstillingRad label="Melding" siste>
            <textarea
              value={melding}
              onChange={(e) => setMelding(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={
                type === 'avvik' ? 'Hva avviker fra planen?' : 'Hva ønsker dere å endre?'
              }
              className={`${FELT_MD} min-h-20 w-full resize-y py-2`}
            />
          </InnstillingRad>
          {report.isError ? (
            <p className="text-[13px] text-danger">{report.error.message}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <ClaudeAct
              disabled={!melding.trim() || report.isPending}
              onClick={() =>
                report.mutate({ bookingId, type, message: melding.trim() })
              }
            >
              {report.isPending ? 'Sender …' : 'Send'}
            </ClaudeAct>
            <ClaudeAct kind="ghost" onClick={() => setApen(false)}>
              Avbryt
            </ClaudeAct>
          </div>
        </InnstillingSeksjon>
      )}
    </div>
  );
}
