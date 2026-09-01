import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sidekontekst } from '../app/(app)/_workshop/sidekontekst.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Workshop sidekontekst', () => {
  it('sender pathname, tittel og norsk merkelapp', () => {
    expect(sidekontekst('/jobber', 'visning=kalender').merkelapp).toBe('Timeplan');
    expect(sidekontekst('/innboks').merkelapp).toBe('Innboks');
    expect(sidekontekst('/kunder').merkelapp).toBe('Kunder');
    expect(sidekontekst('/organisasjon', 'seksjon=ansatte').merkelapp).toBe('Organisasjon');
    expect(sidekontekst('/dine-jobber').merkelapp).toBe('Jobber');
    expect(sidekontekst('/dashboard').merkelapp).toBe('Verkstedet');
    const timeplan = sidekontekst('/jobber');
    expect(timeplan.pathname).toBe('/jobber');
    expect(timeplan.tittel.length).toBeGreaterThan(0);
  });
});

describe('Workshop-stripe i app-skallet', () => {
  it('er montert én gang i (app)/layout, uten breadcrumb-topbar', () => {
    const layout = les('../app/(app)/layout.tsx');
    expect(layout).toMatch(/WorkshopBloub/);
    expect(layout).not.toMatch(/TopBar/);
    expect(layout).not.toMatch(/bottom-tab|PhoneTab/);
  });

  it('er 32px Grainient-stripe med hvit bloub uten sirkel, sidekontekst med hver tur', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    expect(fab).toMatch(/data-workshop-strip/);
    expect(fab).toMatch(/Grainient/);
    expect(fab).toMatch(/h-control max-h-\[32px\]/);
    expect(fab).toMatch(/const STRIP_BOT = 28/);
    expect(fab).toMatch(/const HODE = 48/);
    expect(fab).toMatch(/color="#ffffff"/);
    expect(fab).toMatch(/paper="#111111"/);
    expect(fab).toMatch(/Endwise-hjelpen/);
    expect(fab).toMatch(/text-white/);
    expect(fab).toMatch(/data-workshop-sticky/);
    expect(fab).not.toMatch(/rounded-full|bg-bg\/90|ring-1/);
    expect(fab).toMatch(/api: '\/chat\/workshop'/);
    expect(fab).toMatch(/body: \{ side \}/);
    expect(fab).toMatch(/expression=\{uttrykk\}/);
    expect(fab).toMatch(/thinking/);
    expect(fab).toMatch(/attentif/);
    expect(fab).toMatch(/alert/);
    expect(fab).toMatch(/burst/);
    expect(fab).not.toMatch(/hidden h-14 w-full shrink-0 md:block/);
    expect(fab).not.toMatch(/className="relative hidden /);
    expect(fab).not.toMatch(/fixed right-3 bottom/);
    expect(fab).not.toMatch(/size=\{320\}/);
    expect(fab).not.toMatch(/#1ED27D|#EE2924/);
    expect(fab).not.toMatch(/ShaderGradient/);
  });

  it('chat-ruta tar imot sidekontekst-header', () => {
    const chat = les('../../api/src/routes/chat.ts');
    expect(chat).toMatch(/merkelapp/);
    expect(chat).toMatch(/pathname/);
    expect(chat).toMatch(/systemExtra/);
    expect(chat).toMatch(/skriv aldri til Quick/i);
  });
});

describe('Ingen blobatar i produktflaten', () => {
  it('globals importerer ikke blobatar-css', () => {
    const css = les('../app/globals.css');
    expect(css).not.toMatch(/blobatar/);
  });
});
