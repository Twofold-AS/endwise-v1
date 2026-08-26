import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/utils.ts';

/**
 * `cn` MÅ kjenne våre egne font-størrelser.
 * Dette er en regresjonstest for en bug som var helt stille.
 * `text-title`, `text-label` og `text-body` er egne utilities fra `theme.css`.
 * Stock tailwind-merge kjenner dem ikke, og antar at `text-label` konflikter
 * med `text-primary-foreground` fordi begge starter med `text-`. Den beholder
 * den siste og kaster den første.
 * Resultatet var «Logg inn» og «Lagre» med grå tekst på svart knapp — og i
 * mørkt tema lysegrå på hvitt, altså nesten usynlig. Ingenting kastet,
 * ingenting i typecheck, ingenting i bygget.
 * Testen sjekker begge retninger, fordi rekkefølgen avgjorde hvilken halvdel
 * som forsvant: beUI setter variant før size (fargen røk), shadcn setter base
 * før variant (størrelsen røk).
 */
const harFarge = (s: string) => /text-(primary-foreground|foreground|white)\b/.test(s);
const antallStorrelser = (s: string) => (s.match(/text-(title|label|body)\b/g) ?? []).length;

describe('cn() — egne font-størrelser kolliderer ikke med tekstfarge', () => {
  it('beUI: variant FØR size — fargen skal overleve', () => {
    // Rekkefølgen i packages/ui/src/components/motion/button/base.tsx
    const ut = cn(
      'bg-primary text-primary-foreground hover:bg-primary/90',
      'h-control px-3.5 text-label gap-2 rounded-control',
    );
    expect(harFarge(ut)).toBe(true);
    expect(antallStorrelser(ut)).toBe(1);
  });

  it('shadcn: base FØR variant — størrelsen skal overleve', () => {
    // Rekkefølgen cva produserer i packages/ui/src/components/button.tsx
    const ut = cn('rounded-control text-label', 'bg-primary text-primary-foreground');
    expect(harFarge(ut)).toBe(true);
    expect(antallStorrelser(ut)).toBe(1);
  });

  it('alle tre størrelsene virker, ikke bare text-label', () => {
    for (const st of ['text-title', 'text-label', 'text-body']) {
      const ut = cn('text-primary-foreground', st);
      expect(harFarge(ut), st).toBe(true);
      expect(ut.includes(st), st).toBe(true);
    }
  });

  it('⛔ to font-størrelser skal FORTSATT kollidere', () => {
    /**
     * Uten denne kunne fiksen vært «slå av konfliktdeteksjon for text-*», som
     * ville løst symptomet og ødelagt det tailwind-merge er til for. Siste
     * størrelse skal fortsatt vinne over den første.
     */
    const ut = cn('text-label', 'text-title');
    expect(antallStorrelser(ut)).toBe(1);
    expect(ut).toContain('text-title');
    expect(ut).not.toContain('text-label');
  });

  it('to tekstfarger skal fortsatt kollidere', () => {
    const ut = cn('text-fg-muted', 'text-danger');
    expect(ut).toContain('text-danger');
    expect(ut).not.toContain('text-fg-muted');
  });
});
