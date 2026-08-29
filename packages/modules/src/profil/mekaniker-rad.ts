import { and, type Database, eq, schema } from '@endwise/db';

type TenantTx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Tildelbarhet følger `mechanics`, ikke `member_profiles.job_function`.
 * Jobbfunksjon styrer landing; raden her styrer list/match (active=true).
 * Samme form som invite-godta og `opprettUtenInvitasjon`: navn + capacity 1.
 * Bort fra mekaniker: deaktiver, ikke slett — bookinger peker på id-en.
 */
export async function synkMekanikerRad(
  tx: TenantTx,
  input: {
    tenantId: string;
    userId: string;
    funksjon: string;
    navn: string;
    /** Bare ved ny rad. Invite/setFunction = 1. */
    capacity?: number;
  },
): Promise<string | null> {
  const [eksisterende] = await tx
    .select({ id: schema.mechanics.id, active: schema.mechanics.active })
    .from(schema.mechanics)
    .where(
      and(eq(schema.mechanics.tenantId, input.tenantId), eq(schema.mechanics.userId, input.userId)),
    )
    .limit(1);

  if (input.funksjon === 'mekaniker') {
    const navn = input.navn.trim() || 'Mekaniker';
    if (eksisterende) {
      if (!eksisterende.active) {
        await tx
          .update(schema.mechanics)
          .set({ active: true })
          .where(eq(schema.mechanics.id, eksisterende.id));
      }
      return eksisterende.id;
    }
    const [ny] = await tx
      .insert(schema.mechanics)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        name: navn,
        capacity: input.capacity ?? 1,
      })
      .returning({ id: schema.mechanics.id });
    return ny?.id ?? null;
  }

  if (eksisterende?.active) {
    await tx
      .update(schema.mechanics)
      .set({ active: false })
      .where(eq(schema.mechanics.id, eksisterende.id));
  }
  return eksisterende?.id ?? null;
}
