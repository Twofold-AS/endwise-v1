import { type Database, eq, schema, withTenant } from '@endwise/db';

/**
 * F3-08 / Timeplan — samtidig kapasitet på mekanikeren.
 *
 * Feltet bor på `mechanics.capacity` (1–10). Det finnes ingen egen
 * timeplan-tabell: belegg er bookinger mot denne kapasiteten, samme modell
 * mekanikeren ser under Timeplan («Min dag»).
 */
export async function updateMechanicCapacity(
  db: Database,
  tenantId: string,
  input: { mechanicId: string; capacity: number },
) {
  if (input.capacity < 1 || input.capacity > 10) {
    throw new Error('Kapasitet må være mellom 1 og 10');
  }

  return withTenant(db, tenantId, async (tx) => {
    const [row] = await tx
      .update(schema.mechanics)
      .set({ capacity: input.capacity })
      .where(eq(schema.mechanics.id, input.mechanicId))
      .returning();
    if (!row) throw new Error('Mekanikeren finnes ikke i denne tenanten');
    return row;
  });
}
