'use client';

import { useState } from 'react';
import { ClaudeAct, ClaudeInitialer, ClaudeListRow, ClaudeSection } from '../_shell/claude-flate';
import { InviterAnsatt } from './_inviter-ansatt';
import { authorLabel, type Navnekart } from './_lib';

/**
 * Claude deltaker-ark — inviter (ekte fork), fjern/forlat/løst er ærlig stub.
 */
export function DeltakerArk({
  threadId,
  motparter,
  navn,
  meId,
}: {
  threadId: string;
  motparter: string[];
  navn?: Navnekart;
  meId?: string | null;
}) {
  const [apen, setApen] = useState(false);
  const [stub, setStub] = useState<string | null>(null);
  const andre = motparter.filter((id) => id && id !== meId);

  if (!apen) {
    return (
      <ClaudeAct kind="ghost" onClick={() => setApen(true)}>
        Deltakere
      </ClaudeAct>
    );
  }

  return (
    <div data-deltaker-ark className="flex flex-col gap-3 rounded-[24px] border border-divide bg-card p-4">
      <ClaudeSection heading="Deltakere">
        {andre.length === 0 ? (
          <p className="text-[13px] text-fg-muted">Ingen andre deltakere i tråden ennå.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {andre.map((id) => (
              <li key={id}>
                <ClaudeListRow
                  icon={<ClaudeInitialer navn={authorLabel(id, meId, navn)} />}
                  title={authorLabel(id, meId, navn)}
                  sub="Deltaker"
                />
              </li>
            ))}
          </ul>
        )}
      </ClaudeSection>
      <div className="flex flex-wrap gap-2">
        <InviterAnsatt threadId={threadId} />
        <ClaudeAct kind="ghost" onClick={() => setStub('Fjern deltaker er ikke koblet til API ennå.')}>
          Fjern
        </ClaudeAct>
        <ClaudeAct kind="ghost" onClick={() => setStub('Forlat tråd er ikke koblet til API ennå.')}>
          Forlat
        </ClaudeAct>
        <ClaudeAct kind="ghost" onClick={() => setStub('Løst-status er ikke koblet til API ennå.')}>
          Marker som løst
        </ClaudeAct>
        <ClaudeAct kind="ghost" onClick={() => setApen(false)}>
          Lukk
        </ClaudeAct>
      </div>
      {stub ? <p className="text-[13px] text-fg-muted">{stub}</p> : null}
    </div>
  );
}
