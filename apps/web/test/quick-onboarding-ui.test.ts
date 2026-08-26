import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F1-07 — UI for forhandlerens egen Quick-nøkkel. Kilde-tester (ingen ekte nøkkel).
 */
describe('F1-07: Quick-nøkkel i eksisterende chrome', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/page.tsx'), 'utf8');
  const quick = readFileSync(resolve(her, '../app/(app)/integrasjoner/quick/page.tsx'), 'utf8');
  const sidebar = readFileSync(resolve(her, '../app/(app)/_shell/sidebar.tsx'), 'utf8');

  it('/oppstart ber om Quick-nøkkel når tillegget er valgt — på norsk', () => {
    expect(oppstart).toMatch(/ApiV2/);
    expect(oppstart).toMatch(/lesekall|GET/);
    expect(oppstart).toMatch(/kryptert|klartekst/);
    expect(oppstart).toMatch(/quick:\s*\{/);
    expect(oppstart).toMatch(/m\.key === ['"]quick['"]/);
    expect(oppstart).not.toMatch(/['"]shop['"]/);
    expect(oppstart).not.toMatch(/Admin-tab|\/admin/);
    expect(oppstart).not.toMatch(/4490|8490|12490/);
  });

  it('/integrasjoner/quick tester før lagring og viser aldri nøkkelen tilbake', () => {
    expect(quick).toMatch(/Test og lagre|testes med et lesekall/);
    expect(quick).toMatch(/type="password"/);
    expect(quick).toMatch(/setConfig/);
    expect(quick).not.toMatch(/onClick=\{\(\) => pull\.mutate\(\{\}\)\}[\s\S]{0,80}onSave/);
    expect(quick).not.toMatch(/console\.(log|info|debug)\([^)]*token/i);
  });

  it('/integrasjoner/quick har Hent nå og synkstatus for kunder og deler', () => {
    expect(quick).toMatch(/Hent nå/);
    expect(quick).toMatch(/kunder og deler/);
    expect(quick).toMatch(/Sist hentet/);
    expect(quick).toMatch(/Siste utfall/);
    expect(quick).toMatch(/pullNow|pull\.mutate/);
    expect(quick).toMatch(/session\.me\.invalidate/);
    expect(quick).not.toMatch(/FIXIE|Scaleway VM|HTTPS_PROXY/);
    expect(quick).not.toMatch(/fetch\([^)]*client\/info/);
    expect(quick).not.toMatch(/Authorization:\s*Token/);
  });

  it('ingen ny Admin-fane i forhandler-sidebaren', () => {
    expect(sidebar).not.toMatch(/href:\s*['"]\/admin['"]/);
    expect(sidebar).not.toMatch(/tittel:\s*['"]Admin['"]/);
  });
});
