CREATE TYPE "public"."job_function" AS ENUM('leder', 'selger', 'support', 'mekaniker');-- > statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "job_function" "job_function";
-- > statement-breakpoint
/*
 * Backfill av eksisterende `member_profiles`-rader.
 * Kun rader som allerede finnes (i praksis de som har satt et kallenavn).
 * De aller fleste ansatte har ingen rad her, og skal ikke få en: null =
 * «ikke satt eksplisitt», og `resolveJobbfunksjon` utleder da funksjonen fra
 * rolle + mekanikerprofil. Å opprette en rad per medlem ville laget en
 * skyggekopi av `member` som må holdes i synk for alltid.
 * Regelen er den samme som i utlederen, så en backfilt rad og en utledet
 * verdi aldri kan bli uenige:
 * dealer_admin / endwise_admin / owner → leder
 * har rad i `mechanics` → mekaniker
 * ellers → selger
 * Idempotent: `where job_function is null` gjør en ny kjøring til en no-op.
 */
update member_profiles mp
set job_function = case
  when exists (
    select 1 from member m
    where m.user_id = mp.user_id
      and m.organization_id = mp.tenant_id::text
      and m.role in ('dealer_admin', 'endwise_admin', 'owner')
  ) then 'leder'::job_function
  when exists (
    select 1 from mechanics me
    where me.user_id = mp.user_id
      and me.tenant_id = mp.tenant_id
  ) then 'mekaniker'::job_function
  else 'selger'::job_function
end
where mp.job_function is null;
