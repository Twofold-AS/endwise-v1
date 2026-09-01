import { symmetricDecrypt } from 'better-auth/crypto';
import { byggEnrollSesjon, ENROLL_COOKIE_NAME, erEnrollIdentifier } from './enroll.ts';
import { krevFerskTotpFraBody } from './totp-steg.ts';
import { verifiserTotpKode } from './totp-verify.ts';

type HookCtx = {
  context: {
    secret: string;
    secretConfig?: unknown;
    adapter: {
      findOne: (args: {
        model: string;
        where: Array<{ field: string; value: string }>;
      }) => Promise<{ secret?: string } | null>;
    };
    internalAdapter: {
      findVerificationValue: (id: string) => Promise<{ value: string; expiresAt: Date } | null>;
      findUserById: (id: string) => Promise<{
        id: string;
        email: string;
        name?: string | null;
        emailVerified?: boolean;
        twoFactorEnabled?: boolean | null;
        image?: string | null;
        createdAt?: Date;
        updatedAt?: Date;
      } | null>;
      listSessions: (userId: string) => Promise<Array<{ token: string }>>;
      deleteSession: (token: string) => Promise<unknown>;
    };
    createAuthCookie: (name: string, opts?: { maxAge?: number }) => { name: string };
  };
  getSignedCookie: (name: string, secret: string) => Promise<string | false | null>;
};

export async function lesEnrollBrukerId(ctx: HookCtx): Promise<string | null> {
  if (typeof ctx.getSignedCookie !== 'function') return null;
  if (typeof ctx.context?.createAuthCookie !== 'function') return null;
  try {
    const cookie = ctx.context.createAuthCookie(ENROLL_COOKIE_NAME);
    const identifier = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
    if (!identifier || !erEnrollIdentifier(identifier)) return null;
    const rad = await ctx.context.internalAdapter.findVerificationValue(identifier);
    if (!rad || rad.expiresAt.getTime() < Date.now()) return null;
    return rad.value;
  } catch {
    return null;
  }
}

export async function enrollSesjonFraKake(ctx: HookCtx) {
  const userId = await lesEnrollBrukerId(ctx);
  if (!userId) return null;
  const user = await ctx.context.internalAdapter.findUserById(userId);
  if (!user) return null;
  return byggEnrollSesjon(user);
}

export async function slettAndreSesjoner(
  ctx: HookCtx,
  userId: string,
  beholdToken?: string,
): Promise<void> {
  const sesjoner = await ctx.context.internalAdapter.listSessions(userId);
  await Promise.all(
    sesjoner
      .filter((s) => s.token !== beholdToken)
      .map((s) => ctx.context.internalAdapter.deleteSession(s.token)),
  );
}

export async function verifiserFerskTotpMotHemmelighet(
  ctx: HookCtx,
  userId: string,
  body: unknown,
): Promise<void> {
  const totp = krevFerskTotpFraBody(body);
  const twoFactor = await ctx.context.adapter.findOne({
    model: 'twoFactor',
    where: [{ field: 'userId', value: userId }],
  });
  if (!twoFactor?.secret) {
    throw krevFerskTotpFraBody({});
  }
  const secret = await symmetricDecrypt({
    key: ctx.context.secretConfig as Parameters<typeof symmetricDecrypt>[0]['key'],
    data: twoFactor.secret,
  });
  const ok = verifiserTotpKode(secret, totp);
  if (!ok) {
    throw krevFerskTotpFraBody({});
  }
}
