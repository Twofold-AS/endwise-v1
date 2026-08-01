import { describe, expect, it, vi } from 'vitest';
import { createScopeGate, type Moderator, ScopeGateViolation } from '../src/scope-gate.ts';

const ctx = { tenantId: 't-a', userId: 'u-1', role: 'customer' };

/**
 * F14-05 — Scope-gaten. Testes mot en fake moderator, ikke mot Mistral:
 * vi tester VÅR logikk, ikke deres modell.
 */
describe('scope-gate (F14-05)', () => {
  const moderatorReturning =
    (scores: Record<string, number>): Moderator =>
    async () => ({ categories: {}, categoryScores: scores });

  it('vanlig melding slipper gjennom', async () => {
    const gate = createScopeGate({ moderate: moderatorReturning({ health: 0.01, pii: 0.02 }) });
    const result = await gate.check('Når kan dere ta MC-en min?', ctx);
    expect(result.allowed).toBe(true);
    expect(result.triggered).toHaveLength(0);
  });

  /** ⚠️ Den regex ikke tar. */
  it('ANGREP: helseopplysning i fritekst stoppes', async () => {
    const gate = createScopeGate({ moderate: moderatorReturning({ health: 0.93 }) });
    await expect(
      gate.assert('Jeg har ryggprolaps og klarer ikke løfte sykkelen', ctx),
    ).rejects.toBeInstanceOf(ScopeGateViolation);
  });

  it('PII stoppes', async () => {
    const gate = createScopeGate({ moderate: moderatorReturning({ pii: 0.88 }) });
    const result = await gate.check('Fnr 01019012345', ctx);
    expect(result.allowed).toBe(false);
    expect(result.triggered).toContain('pii');
  });

  it('ikke-sensitive kategorier stopper IKKE meldingen', async () => {
    // «financial» er ikke art. 9 — en kunde som spør om pris skal ikke eskaleres.
    const gate = createScopeGate({ moderate: moderatorReturning({ financial: 0.99 }) });
    const result = await gate.check('Hva koster en EU-kontroll?', ctx);
    expect(result.allowed).toBe(true);
  });

  it('terskelen respekteres — svake utslag er støy', async () => {
    const gate = createScopeGate({
      moderate: moderatorReturning({ health: 0.4 }),
      threshold: 0.5,
    });
    expect((await gate.check('x', ctx)).allowed).toBe(true);
  });

  /**
   * Audit-modus: vi måler falske positive FØR vi setter den i blokkerende modus.
   * Å slå på en uprøvd klassifikator i blokkerende modus mot ekte kunder er å
   * bytte ett problem mot et annet.
   */
  it('audit-modus logger, men blokkerer ikke', async () => {
    const onTrigger = vi.fn();
    const gate = createScopeGate({
      moderate: moderatorReturning({ health: 0.99 }),
      mode: 'audit',
      onTrigger,
    });
    await expect(gate.assert('helse', ctx)).resolves.toBeUndefined();
    expect(onTrigger).toHaveBeenCalled();
  });

  it('faller tilbake på boolean-kategorier når scores mangler', async () => {
    const gate = createScopeGate({
      moderate: async () => ({ categories: { health: true } }),
    });
    expect((await gate.check('x', ctx)).triggered).toContain('health');
  });
});
