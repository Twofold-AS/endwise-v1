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

  it('er én Grainient-boks med overlay-panel, idle-syklus og SVG-pil', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    const pil = les('../app/(app)/_workshop/ronny-ikoner.tsx');
    const css = les('../app/globals.css');
    expect(fab).toMatch(/data-workshop-strip/);
    expect(fab).toMatch(/data-workshop-shell/);
    expect(fab).toMatch(/Grainient/);
    expect(fab).toMatch(/h-11 max-h-\[44px\]/);
    expect(fab).toMatch(/md:h-control md:max-h-\[32px\]/);
    expect(fab).toMatch(/rounded-\[18px\]/);
    expect(fab).toMatch(/const RAMME_PX = 18/);
    expect(fab).toMatch(/grid-template-rows/);
    expect(fab).toMatch(/const STRIP_BOT = 28/);
    expect(fab).toMatch(/const IDLE_MS = 2500/);
    expect(fab).toMatch(/useRonnyIdle\(!klikk\)/);
    expect(fab).not.toMatch(/useRonnyIdle\(!klikk &&/);
    expect(fab).toMatch(/color="#ffffff"/);
    expect(fab).toMatch(/paper="#111111"/);
    expect(fab).toMatch(/La KI-Ronny ta styringen/);
    expect(fab).not.toMatch(/data-ronny-blink/);
    expect(fab).toMatch(/colere/);
    expect(fab).toMatch(/surpris/);
    expect(fab).toMatch(/wink/);
    expect(fab).toMatch(/curieux/);
    expect(fab).toMatch(/attentif/);
    expect(fab).toMatch(/heureux/);
    expect((fab.match(/expression: 'colere'/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(fab).not.toMatch(/expression: 'triste'/);
    expect(fab).not.toMatch(/expression: 'somnolent'/);
    expect(fab).toMatch(/data-ronny-spin/);
    expect(fab).toMatch(/data-workshop-dock/);
    expect(fab).toMatch(/PromptInput/);
    expect(fab).toMatch(/PromptInputTextarea/);
    expect(fab).toMatch(/PromptInputFooter/);
    expect(fab).toMatch(/PromptInputSubmit/);
    expect(fab).not.toMatch(/PromptInputSelect|GlobeIcon|webSearch|model picker/);
    expect(fab).toMatch(/RonnyPil/);
    expect(pil).toMatch(/chevron-down\.svg/);
    expect(pil).toMatch(/arrow-dropdown\.svg/);
    expect(pil).toMatch(/M16\.2772 9\.74681/);
    expect(pil).not.toMatch(/M6 9l6 6 6-6/);
    expect(fab).not.toMatch(/PilNed|PilOpp/);
    expect(fab).toMatch(/data-ronny-utvid/);
    expect(fab).toMatch(/data-ronny-handtak/);
    expect(fab).toMatch(/size-10/);
    expect(fab).toMatch(/rounded-full/);
    expect(fab).toMatch(/cursor-grab/);
    expect(fab).not.toMatch(/data-ronny-forstor/);
    expect(fab).not.toMatch(/size-11/);
    expect(fab).not.toMatch(/210 210 215/);
    expect(fab).toMatch(/#f5f5f7/);
    expect(fab).toMatch(/#e0e0e0/);
    expect(fab).not.toMatch(/#0066cc|#0071e3/);
    expect(fab).toMatch(/shadow-none/);
    const tokens = les('../../../packages/widget-tokens/src/tokens.css');
    const light = tokens.slice(0, tokens.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ew-accent:\s*#0066cc/);
    expect(light).not.toMatch(/--ew-accent:\s*#111111/);
    const submit = les('../../../packages/ui/src/components/prompt-input.tsx');
    expect(submit).toMatch(/bg-\[#0066cc\]/);
    expect(submit).not.toMatch(/bg-\[#111\]/);
    expect(submit).toMatch(/text-label/);
    expect(fab).toMatch(/gåTil|gaaTil|erTillattGaaTil/);
    expect(fab).not.toMatch(/fixed inset-x-0 bottom-0/);
    expect(fab).toMatch(/text-white/);
    expect(fab).toMatch(/data-workshop-sticky/);
    expect(fab).not.toMatch(/bg-bg\/90/);
    expect(fab).toMatch(/data-workshop-cluster/);
    expect(fab).not.toMatch(/Verkstedsassistent|AiDisclosure|MessageScroller/);
    expect(fab).toMatch(/api: '\/chat\/workshop'/);
    expect(fab).toMatch(/body: \{ side \}/);
    expect(fab).toMatch(/expression=\{uttrykk\}/);
    expect(fab).toMatch(/thinking/);
    expect(fab).toMatch(/alert/);
    expect(fab).toMatch(/burst/);
    expect(fab).not.toMatch(/hidden h-14 w-full shrink-0 md:block/);
    expect(fab).not.toMatch(/className="relative hidden /);
    expect(fab).not.toMatch(/fixed right-3 bottom/);
    expect(fab).not.toMatch(/size=\{320\}/);
    expect(fab).not.toMatch(/#1ED27D|#EE2924/);
    expect(fab).not.toMatch(/ShaderGradient/);
    expect(css).not.toMatch(/ronny-blink/);
    expect(css).not.toMatch(/rotateX/);
    expect(css).toMatch(/rotateY\(360deg\)/);
    expect(css).toMatch(/ronny-spin/);
    expect(fab).toMatch(/data-workshop-cluster/);
    expect(fab).toMatch(/absolute inset-0/);
    expect(fab).toMatch(/items-center/);
    expect(fab).toMatch(/justify-center/);
    expect(fab).not.toMatch(/md:justify-start|md:items-start|md:items-end/);
    expect(fab).toMatch(/data-workshop-sticky[\s\S]*La KI-Ronny ta styringen/);
    expect(fab).toMatch(/const DOCK_KOMPAKT/);
    expect(fab).toMatch(/const DOCK_SAMTALE/);
    expect(fab).toMatch(/harSamtale/);
    expect(fab).toMatch(/no-scrollbar/);
    expect(fab).toMatch(/data-ronny-traad/);
    expect(fab).not.toMatch(/max-h-\[28vh\]/);
    expect(fab).toMatch(/borderRadius: 9999/);
    expect(submit).toMatch(/max-h-10/);
    expect(submit).toMatch(/min-h-7/);
    expect(submit).not.toMatch(/max-h-36/);
    expect(submit).toMatch(/flex w-full items-end/);
  });

  it('chat-ruta tar imot sidekontekst-header', () => {
    const chat = les('../../api/src/routes/chat.ts');
    expect(chat).toMatch(/merkelapp/);
    expect(chat).toMatch(/pathname/);
    expect(chat).toMatch(/systemExtra/);
    expect(chat).toMatch(/skriv aldri til Quick/i);
  });

  it('workshop-agenten har gåTil, søkKunder og parkerte skriv', () => {
    const agent = les('../../../packages/agents/src/workshop/agent.ts');
    expect(agent).toMatch(/gåTil:/);
    expect(agent).toMatch(/søkKunder:/);
    expect(agent).toMatch(/opprettBooking:/);
    expect(agent).toMatch(/søkJobber:/);
    expect(agent).toMatch(/åpneInnboks:/);
    expect(agent).toMatch(/status: 'kommer'/);
    expect(agent).toMatch(/erTillattGaaTil/);
    expect(agent).toMatch(/schema\.customers/);
  });
});

describe('Ronny gåTil-hviteliste', () => {
  it('slipper inn kjente stier og kunde-uuid, avviser URL-er', async () => {
    const { erTillattGaaTil } = await import('../app/(app)/_workshop/gaa-til.ts');
    expect(erTillattGaaTil('/kunder')).toBe(true);
    expect(erTillattGaaTil('/endwise/innboks')).toBe(true);
    expect(erTillattGaaTil('/kunder/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(erTillattGaaTil('https://evil.example/kunder')).toBe(false);
    expect(erTillattGaaTil('//evil.example')).toBe(false);
    expect(erTillattGaaTil('/admin')).toBe(false);
  });
});

describe('Ingen blobatar i produktflaten', () => {
  it('globals importerer ikke blobatar-css', () => {
    const css = les('../app/globals.css');
    expect(css).not.toMatch(/blobatar/);
  });
});
