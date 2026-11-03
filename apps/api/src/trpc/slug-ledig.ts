import { sql } from '@endwise/db';
import { hashInvitasjonstoken } from '@endwise/modules/invitasjoner';
import {
  byggSlugSvar,
  SLUG_RESERVASJON_MINUTTER,
  type SlugLedigSvar,
  slugSjekkTillatt,
  vurderSlugFormat,
} from '@endwise/modules/slug';
import { erWhiteLabelAktiv } from '@endwise/modules/tenant-host';
import { TRPCError } from '@trpc/server';
import type { AppContext } from '../context.ts';

const INVITASJON_FEIL = 'Ugyldig invitasjon';

type ApenEier = { id: string; kind: string };

export function krevWhiteLabel(): void {
  if (!erWhiteLabelAktiv()) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'White label er ikke slått på.',
    });
  }
}

export async function krevApenEierInvitasjon(
  db: AppContext['db'],
  token: string,
): Promise<ApenEier> {
  if (!token) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: INVITASJON_FEIL });
  }
  const hash = hashInvitasjonstoken(token);
  const res = await db.execute(sql`select id, kind from lookup_open_invitation(${hash}::text)`);
  const rad = (res.rows ?? res)[0] as { id?: string; kind?: string } | undefined;
  if (!rad?.id || rad.kind !== 'owner') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: INVITASJON_FEIL });
  }
  return { id: rad.id, kind: rad.kind };
}

export async function slugErOpptatt(
  db: AppContext['db'],
  slug: string,
  holder: string,
): Promise<boolean> {
  const res = await db.execute(sql`select slug_ledig(${slug}::text, ${holder}::text) as ledig`);
  const rad = (res.rows ?? res)[0] as { ledig?: boolean } | undefined;
  return rad?.ledig !== true;
}

export async function reserverSlugIDb(
  db: AppContext['db'],
  slug: string,
  holder: string,
): Promise<boolean> {
  const res = await db.execute(
    sql`select reserver_slug(${slug}::text, ${holder}::text, ${SLUG_RESERVASJON_MINUTTER}::int) as ok`,
  );
  const rad = (res.rows ?? res)[0] as { ok?: boolean } | undefined;
  return rad?.ok === true;
}

export async function svarSlugLedig(
  ctx: AppContext,
  input: { slug: string; token: string; sted?: string; firmanavn?: string },
  reserver: boolean,
): Promise<SlugLedigSvar> {
  krevWhiteLabel();
  const invite = await krevApenEierInvitasjon(ctx.db, input.token);
  if (!slugSjekkTillatt(invite.id)) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Vent litt og prøv igjen.',
    });
  }
  const format = vurderSlugFormat(input.slug);
  const forhands = byggSlugSvar(input.slug, {
    opptatt: false,
    sted: input.sted,
    firmanavn: input.firmanavn,
  });
  if (!format.ok || forhands.grunn === 'reservert' || forhands.grunn === 'manuell') {
    return forhands;
  }
  const slug = format.slug;
  if (reserver) {
    const ok = await reserverSlugIDb(ctx.db, slug, invite.id);
    return byggSlugSvar(slug, {
      opptatt: !ok,
      sted: input.sted,
      firmanavn: input.firmanavn,
    });
  }
  const opptatt = await slugErOpptatt(ctx.db, slug, invite.id);
  return byggSlugSvar(slug, {
    opptatt,
    sted: input.sted,
    firmanavn: input.firmanavn,
  });
}
