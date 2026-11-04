import { and, type Database, eq, or, schema, withTenant } from '@endwise/db';
import { createMessagesModule } from '../messages/index.ts';
import { rensKundeMelding } from './tekst.ts';

export class IngenInnboksMottakerError extends Error {
  readonly code = 'NO_INBOX_RECIPIENT';
  constructor() {
    super('Verkstedet har ingen innboks å sende til ennå.');
  }
}

async function finnInnboksMottakere(db: Database, tenantId: string): Promise<string[]> {
  const ledere = await db
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, tenantId), eq(schema.member.role, 'dealer_admin')));
  if (ledere.length > 0) return ledere.map((l) => l.userId);
  const ansatte = await db
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(eq(schema.member.organizationId, tenantId));
  return ansatte.map((a) => a.userId);
}

export async function finnEllerOpprettKundetrad(
  db: Database,
  input: {
    tenantId: string;
    customerId: string;
    userId: string;
    epost: string | null;
    telefon: string | null;
  },
) {
  const eksisterende = await withTenant(db, input.tenantId, async (tx) => {
    const [viaId] = await tx
      .select({ id: schema.threads.id })
      .from(schema.threads)
      .where(
        and(
          eq(schema.threads.tenantId, input.tenantId),
          eq(schema.threads.kind, 'customer_dealer'),
          eq(schema.threads.customerId, input.customerId),
        ),
      )
      .limit(1);
    if (viaId) return viaId;

    const refs = [input.epost, input.telefon].filter((x): x is string => Boolean(x?.trim()));
    if (refs.length === 0) return null;
    const [viaRef] = await tx
      .select({ id: schema.threads.id })
      .from(schema.threads)
      .where(
        and(
          eq(schema.threads.tenantId, input.tenantId),
          eq(schema.threads.kind, 'customer_dealer'),
          or(...refs.map((r) => eq(schema.threads.externalRef, r))),
        ),
      )
      .limit(1);
    if (!viaRef) return null;
    await tx
      .update(schema.threads)
      .set({ customerId: input.customerId })
      .where(eq(schema.threads.id, viaRef.id));
    return viaRef;
  });

  const meldinger = createMessagesModule(db);
  if (eksisterende) {
    await meldinger.addParticipants(input.tenantId, eksisterende.id, [input.userId]);
    return eksisterende;
  }

  const mottakere = await finnInnboksMottakere(db, input.tenantId);
  if (mottakere.length === 0) throw new IngenInnboksMottakerError();

  const thread = await meldinger.createThread({
    tenantId: input.tenantId,
    kind: 'customer_dealer',
    subject: 'Melding fra kunde',
    channel: 'app',
    externalRef: input.epost ?? input.telefon ?? null,
    customerId: input.customerId,
    participantIds: [...new Set([...mottakere, input.userId])],
  });
  return { id: thread.id };
}

export async function sendKundeMelding(
  db: Database,
  input: {
    tenantId: string;
    customerId: string;
    userId: string;
    epost: string | null;
    telefon: string | null;
    body: string;
  },
) {
  const tekst = rensKundeMelding(input.body);
  const traad = await finnEllerOpprettKundetrad(db, input);
  const meldinger = createMessagesModule(db);
  const melding = await meldinger.postMessage({
    tenantId: input.tenantId,
    threadId: traad.id,
    authorId: input.userId,
    body: tekst,
    channel: 'app',
    direction: 'inbound',
  });
  await withTenant(db, input.tenantId, (tx) =>
    tx.insert(schema.auditLog).values({
      tenantId: input.tenantId,
      actor: input.userId,
      action: 'kunde.melding',
      subjectType: 'thread',
      subjectId: traad.id,
      metadata: { customerId: input.customerId, messageId: melding.id },
    }),
  );
  return { threadId: traad.id, messageId: melding.id };
}
