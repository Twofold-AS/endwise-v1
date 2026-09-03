import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { norskChatFeil } from '../app/(app)/_workshop/norsk-chat-feil.ts';
import { sidekontekst } from '../app/(app)/_workshop/sidekontekst.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('norskChatFeil', () => {
  it('oversetter Mistral function-name 400 og unngår «Noe gikk galt»', () => {
    expect(
      norskChatFeil({
        message: 'Function name was gåTil but must be a-z, A-Z, 0-9, or contain underscores',
      }),
    ).toMatch(/verktøy/i);
    expect(norskChatFeil({ message: 'An error occurred.' })).toMatch(/Mistral/);
    expect(
      norskChatFeil({
        message: 'Ingen modell konfigurert for rollen «fast». Sett MISTRAL_MODEL_FAST.',
      }),
    ).toContain('MISTRAL_MODEL_FAST');
  });
});

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

  it('er én Grainient-boks med overlay-panel, idle-syklus og strek-håndtak', () => {
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
    expect(fab).toMatch(/cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/);
    expect(fab).not.toMatch(/ease-out/);
    expect(fab).not.toMatch(/translate-y/);
    expect(fab).toMatch(/grid-template-rows/);
    expect(fab).toMatch(/const STRIP_BOT = 28/);
    expect(fab).toMatch(/const IDLE_MS = 5000/);
    expect(fab).not.toMatch(/const IDLE_MS = 2500/);
    expect(fab).toMatch(/useRonnyIdle\(!klikk\)/);
    expect(fab).not.toMatch(/useRonnyIdle\(!klikk &&/);
    expect(fab).toMatch(/color="#ffffff"/);
    expect(fab).toMatch(/paper="#111111"/);
    expect(fab).toMatch(/Trykk på KI-Ronny/);
    expect(fab).toMatch(/IDLE_TEKST/);
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
    expect(fab).not.toMatch(/state: 'thinking'/);
    expect(fab).toMatch(/opptatt\s*\n\s*\? 'thinking'/);
    expect(fab).toMatch(/submitStatus = opptatt \? status : 'ready'/);
    expect(fab).toMatch(/data-ronny-spin/);
    expect(fab).toMatch(/data-workshop-dock/);
    expect(fab).toMatch(/PromptInput/);
    expect(fab).toMatch(/PromptInputTextarea/);
    expect(fab).toMatch(/PromptInputFooter/);
    expect(fab).toMatch(/PromptInputSubmit/);
    expect(fab).not.toMatch(/PromptInputSelect|GlobeIcon|webSearch|model picker/);
    expect(fab).not.toMatch(/RonnyPil/);
    expect(fab).not.toMatch(/<RonnyPil/);
    expect(pil).toMatch(/chevron-down\.svg/);
    expect(pil).toMatch(/arrow-dropdown\.svg/);
    expect(pil).toMatch(/M16\.2772 9\.74681/);
    expect(pil).not.toMatch(/M6 9l6 6 6-6/);
    expect(fab).not.toMatch(/PilNed|PilOpp/);
    expect(fab).toMatch(/data-ronny-utvid/);
    expect(fab).toMatch(/data-ronny-handtak/);
    expect(fab).toMatch(/data-ronny-handtak-rad/);
    expect(fab).toMatch(/data-ronny-prompt-kort/);
    expect(fab).toMatch(/data-ronny-composer/);
    expect(fab).toMatch(/data-ronny-peek/);
    expect(fab).toMatch(/data-ronny-peek-svar/);
    expect(fab).toMatch(/sisteTurTekst/);
    expect(fab).toMatch(/Ronny tenker/);
    expect(fab).toMatch(/data-ronny-tenker/);
    expect(fab).toMatch(/ronny-tenker-tekst/);
    expect(fab).toMatch(/opptatt \? TENKER_TEKST/);
    expect(fab).not.toMatch(/RonnyTenkerTekst/);
    expect(fab).not.toMatch(/Ronny skriver/);
    expect(fab).toMatch(/RonnyHandtak/);
    expect(pil).toMatch(/data-ronny-strek/);
    expect(pil).toMatch(/RonnyHandtak/);
    expect(fab).toMatch(/PHONE_KORT_FYLL/);
    expect(fab).toMatch(/text-\[14px\]/);
    expect(fab).toMatch(/gap-6/);
    expect(fab).toMatch(/VERKSTED_INNHOLD/);
    expect(fab).not.toMatch(/data-ronny-utvid[\s\S]{0,280}rounded-full/);
    expect(fab).not.toMatch(/data-ronny-utvid[\s\S]{0,280}ring-1/);
    expect(fab).not.toMatch(/data-ronny-utvid[\s\S]{0,80}size-6/);
    expect(fab).toMatch(/visHandtak/);
    expect(fab).toMatch(/visPeek/);
    expect(fab).toMatch(/foldet/);
    expect(fab).toMatch(/onUtvid/);
    expect(fab).toMatch(/onHandtakNed/);
    expect(fab).toMatch(/setVisning\('utvidet'\)/);
    expect(fab).toMatch(/data-ronny-overlay/);
    expect(fab).toMatch(/fixed right-0 bottom-0 left-0/);
    expect(fab).toMatch(/z-\[60\]/);
    expect(fab).toMatch(/z-\[70\]/);
    expect(fab).not.toMatch(/calc\(100dvh - \$\{ankerTop\}px - 8px\)/);
    expect(fab.indexOf('data-ronny-prompt-kort')).toBeGreaterThan(
      fab.indexOf('data-ronny-handtak-rad'),
    );
    expect(fab).not.toMatch(/rounded-t-none/);
    expect(fab).toMatch(/rounded-\[18px\]/);
    expect(fab).not.toMatch(/borderTopLeftRadius:\s*0/);
    expect(fab).toMatch(/data-ronny-prompt-flate[\s\S]{0,80}rounded-none/);
    expect(fab).toMatch(/data-ronny-kort-padding/);
    expect(fab).toMatch(/data-ronny-kort-padding[\s\S]{0,280}pt-1/);
    expect(fab).toMatch(/data-ronny-handtak-rad[\s\S]{0,220}pt-3/);
    expect(fab).toMatch(/data-ronny-handtak-rad[\s\S]{0,220}pb-2/);
    expect(fab).toMatch(/data-ronny-handtak-rad[\s\S]*px-6 py-1/);
    expect(fab).toMatch(/data-ronny-handtak-sted=\{utvidet \? 'prompt' : 'peek'\}/);
    expect(fab).toMatch(/visPeek \? loggUtsnitt : null[\s\S]{0,40}visPeek \? handtak : null/);
    expect(fab).toMatch(/data-ronny-prompt-flate/);
    expect(fab).toMatch(
      /data-ronny-prompt-flate[\s\S]{0,80}w-full overflow-hidden rounded-none bg-transparent/,
    );
    expect((fab.match(/<Grainient/g) ?? []).length).toBe(1);
    expect(fab).toMatch(/data-workshop-shell[\s\S]{0,600}<Grainient/);
    expect(fab).toMatch(/const RONNY_GALAXY_TETTHET = 2\.5/);
    expect(fab).toMatch(/data-ronny-flate[\s\S]{0,800}<Galaxy/);
    expect(fab).toMatch(/density=\{RONNY_GALAXY_TETTHET\}/);
    expect(fab).not.toMatch(/data-ronny-flate[\s\S]{0,800}<Grainient/);
    const flateKilde = fab.slice(fab.indexOf('data-ronny-flate'), fab.indexOf('data-ronny-composer'));
    expect(flateKilde).toMatch(/bg-\[#111\]/);
    expect(flateKilde).toMatch(/<Galaxy/);
    expect(flateKilde).not.toMatch(/Grainient/);
    expect(flateKilde).not.toMatch(/bg-\[#f5f5f7\]/);
    const composerKilde = fab.slice(fab.indexOf('data-ronny-composer'));
    expect(composerKilde).toMatch(/data-ronny-composer[\s\S]{0,220}bg-transparent/);
    expect(composerKilde).not.toMatch(/Grainient/);
    expect(composerKilde).not.toMatch(/Galaxy/);
    expect(composerKilde).not.toMatch(/bg-\[#f5f5f7\]|bg-\[#fff\]|bg-bg/);
    expect(fab).toMatch(/data-ronny-svar-kort[\s\S]{0,160}pb-1/);
    expect(fab).toMatch(/VERKSTED_INNHOLD/);
    expect(fab).toMatch(/data-ronny-verksted-bredde/);
    expect(fab).toMatch(/data-ronny-flate/);
    expect(fab).toMatch(/data-ronny-laast/);
    expect(fab).toMatch(/if \(utvidet\) \{\s*scroller.setAttribute\('data-ronny-laast'/);
    expect(fab).not.toMatch(/if \(apen\) \{\s*scroller.setAttribute\('data-ronny-laast'/);
    expect(fab).toMatch(/data-ronny-side-scroll/);
    expect(fab).toMatch(/data-ronny-logg-ramme/);
    expect(fab).toMatch(/loggOverflow/);
    expect(fab).toMatch(/GradualBlur/);
    expect(fab).toMatch(/target="parent"/);
    expect(fab).toMatch(/position="top"/);
    expect(fab).toMatch(/position="bottom"/);
    expect(fab).toMatch(/phoneOpen/);
    expect(fab).toMatch(/KORT_KANT/);
    expect(fab).toMatch(/COMPOSER_SAFE/);
    expect(fab).not.toMatch(/COMPOSER_BUNN/);
    expect(fab).not.toMatch(/rounded-t-\[18px\]/);
    expect(fab).toMatch(/data-ronny-prompt-kort[\s\S]{0,160}py-1\.5/);
    expect(fab).toMatch(/data-ronny-svar-kort[\s\S]{0,160}bg-transparent/);
    expect(fab).not.toMatch(/data-ronny-svar-kort[\s\S]{0,160}bg-\[#fff\]/);
    const hjem = les('../app/(app)/_shell/phone-home.ts');
    expect(hjem).toMatch(
      /VERKSTED_INNHOLD = 'mx-auto w-full max-w-\[520px\] px-3 md:max-w-\[1120px\] md:px-8'/,
    );
    expect(les('../app/(app)/_shell/phone-home-dealer.tsx')).toMatch(/VERKSTED_INNHOLD/);
    expect(les('../app/(app)/dashboard/page.tsx')).toMatch(/VERKSTED_INNHOLD/);
    expect(les('../app/(app)/layout.tsx')).toMatch(/data-ronny-side-scroll/);
    expect(les('../app/(app)/_workshop/gradual-blur.tsx')).toMatch(/export function GradualBlur/);
    expect(les('../app/(app)/_workshop/gradual-blur.tsx')).toMatch(/target\?: 'parent' \| 'page'/);
    expect(les('../app/(app)/_workshop/gradual-blur.tsx')).not.toMatch(/from ['"]mathjs['"]/);
    expect(fab).toMatch(/md:px-8|VERKSTED_INNHOLD/);
    expect(fab).toMatch(/opacity-100/);
    expect(fab).toMatch(/bg-transparent/);
    expect(fab).toMatch(/cursor-grab/);
    expect(fab).not.toMatch(/data-ronny-forstor/);
    expect(fab).not.toMatch(/size-11/);
    expect(fab).not.toMatch(/size-10/);
    expect(fab).not.toMatch(/210 210 215/);
    expect(fab).toMatch(/#fff/);
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
    expect(submit).toMatch(/text-\[16px\]/);
    expect(submit).toMatch(/md:text-label/);
    expect(fab).toMatch(/gåTil|gaaTil|erTillattGaaTil/);
    expect(fab).toMatch(/fixed inset-x-0 bottom-0/);
    expect(fab).toMatch(/data-ronny-composer[\s\S]{0,200}fixed inset-x-0 bottom-0/);
    expect(fab).toMatch(/data-ronny-composer[\s\S]{0,160}w-full/);
    expect(fab).toMatch(/paddingBottom: COMPOSER_SAFE/);
    expect(fab).toMatch(/max\(6px, env\(safe-area-inset-bottom\)\)/);
    expect(fab).not.toMatch(/safe-area-inset-bottom\) \+ 16px/);
    expect(fab).not.toMatch(/data-ronny-composer[\s\S]{0,200}paddingBottom: COMPOSER_SAFE/);
    expect(fab).not.toMatch(/fixed right-3 bottom/);
    expect(fab).toMatch(/text-white/);
    expect(fab).toMatch(/data-workshop-sticky/);
    expect(fab).not.toMatch(/bg-bg\/90/);
    expect(fab).toMatch(/data-workshop-cluster/);
    expect(fab).not.toMatch(/Verkstedsassistent|AiDisclosure|MessageScroller/);
    expect(fab).toMatch(/MessageBubble/);
    expect(fab).toMatch(/align=\{melding\.role === 'user' \? 'end' : 'start'\}/);
    expect(fab).toMatch(/placeholder="Spør Ronny/);
    expect(fab).toMatch(/setPromptTekst\(''\)/);
    expect(fab).toMatch(/data-ronny-prompt-linje/);
    expect(fab).not.toMatch(/data-ronny-prompt-linje[\s\S]{0,80}border-b/);
    expect(fab).toMatch(/utvidet \? \(/);
    expect(fab).not.toMatch(/data-ronny-composer[\s\S]*Grainient/);
    expect(fab).not.toMatch(/data-ronny-composer[\s\S]*Galaxy/);
    expect(fab).toMatch(/norskChatFeil/);
    expect(fab).not.toMatch(/Noe gikk galt\. Prøv igjen\./);
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
    expect(css).toMatch(/ronny-tenker-shimmer/);
    expect(css).toMatch(/ronny-tenker-tekst/);
    expect(fab).toMatch(/data-workshop-cluster/);
    expect(fab).toMatch(/absolute inset-0/);
    expect(fab).toMatch(/items-center/);
    expect(fab).toMatch(/justify-center/);
    expect(fab).not.toMatch(/md:justify-start|md:items-start|md:items-end/);
    expect(fab).toMatch(/data-workshop-sticky[\s\S]*IDLE_TEKST/);
    expect(fab).toMatch(/const DOCK_KOMPAKT/);
    expect(fab).toMatch(/const DOCK_SAMTALE/);
    expect(fab).toMatch(/const PEEK_MAX/);
    expect(fab).toMatch(/visPeek/);
    expect(fab).toMatch(/no-scrollbar/);
    expect(fab).toMatch(/data-ronny-traad/);
    expect(fab).toMatch(/data-ronny-peek-svar/);
    expect(fab).not.toMatch(/max-h-\[28vh\]/);
    expect(fab).not.toMatch(/borderRadius: 9999/);
    expect(submit).toMatch(/max-h-8/);
    expect(submit).toMatch(/min-h-6/);
    expect(submit).not.toMatch(/max-h-10/);
    expect(submit).not.toMatch(/max-h-36/);
    expect(submit).toMatch(/size-7/);
    expect(submit).toMatch(/flex w-full items-end/);
  });

  it('chat-ruta tar imot sidekontekst-header', () => {
    const chat = les('../../api/src/routes/chat.ts');
    expect(chat).toMatch(/merkelapp/);
    expect(chat).toMatch(/pathname/);
    expect(chat).toMatch(/systemExtra/);
    expect(chat).toMatch(/skriv aldri til Quick/i);
    expect(chat).toMatch(/ModelNotConfiguredError/);
    expect(chat).toMatch(/UgyldigToolNavnError/);
  });

  it('workshop-agenten har gaaTil, sokKunder og parkerte skriv (ASCII mot Mistral)', () => {
    const agent = les('../../../packages/agents/src/workshop/agent.ts');
    expect(agent).toMatch(/gaaTil:/);
    expect(agent).toMatch(/sokKunder:/);
    expect(agent).toMatch(/opprettBooking:/);
    expect(agent).toMatch(/sokJobber:/);
    expect(agent).toMatch(/aapneInnboks:/);
    expect(agent).not.toMatch(/gåTil:/);
    expect(agent).not.toMatch(/søkKunder:/);
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
