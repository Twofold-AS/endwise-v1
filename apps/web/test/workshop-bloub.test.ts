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
    expect(
      norskChatFeil({
        message: 'Rate limit exceeded (code 1300)',
      }),
    ).toMatch(/rate limit|opptatt|vent/i);
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

describe('Workshop-sheet i app-skallet', () => {
  it('er montert én gang i (app)/layout, uten breadcrumb-topbar', () => {
    const layout = les('../app/(app)/layout.tsx');
    expect(layout).toMatch(/WorkshopBloub/);
    expect(layout).not.toMatch(/TopBar/);
    expect(layout).not.toMatch(/bottom-tab|PhoneTab/);
  });

  it('er telefon-sheet med idle-syklus, Prompt Input og strek-håndtak', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    const pil = les('../app/(app)/_workshop/ronny-ikoner.tsx');
    const css = les('../app/globals.css');
    expect(fab).toMatch(/data-ronny-sheet/);
    expect(fab).toMatch(/data-workshop-shell/);
    expect(fab).toMatch(/md:hidden/);
    expect(fab).not.toMatch(/data-workshop-strip/);
    expect(fab).not.toMatch(/<Grainient/);
    expect(fab).toMatch(/rounded-\[18px\]/);
    expect(fab).toMatch(/const RAMME_PX = 18/);
    expect(fab).toMatch(/cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/);
    expect(fab).toMatch(/const IDLE_MS = 5000/);
    expect(fab).toMatch(/useRonnyIdle\(true\)/);
    expect(fab).toMatch(/color="#1d1d1f"/);
    expect(fab).toMatch(/paper="#ffffff"/);
    expect(fab).not.toMatch(/data-ronny-blink/);
    expect(fab).toMatch(/colere/);
    expect(fab).toMatch(/surpris/);
    expect(fab).toMatch(/curieux/);
    expect(fab).toMatch(/attentif/);
    expect(fab).toMatch(/heureux/);
    expect((fab.match(/expression: 'colere'/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(fab).not.toMatch(/expression: 'triste'/);
    expect(fab).not.toMatch(/expression: 'somnolent'/);
    expect(fab).not.toMatch(/state: 'thinking'/);
    expect(fab).not.toMatch(/opptatt \? 'thinking'/);
    expect(fab).not.toMatch(/error \? 'alert'/);
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
    expect(fab).not.toMatch(/data-ronny-peek/);
    expect(fab).toMatch(/Ronny tenker/);
    expect(fab).toMatch(/data-ronny-tenker/);
    expect(fab).toMatch(/ronny-tenker-tekst/);
    expect(fab).not.toMatch(/RonnyTenkerTekst/);
    expect(fab).not.toMatch(/Ronny skriver/);
    expect(fab).toMatch(/RonnyHandtak/);
    expect(pil).toMatch(/data-ronny-strek/);
    expect(pil).toMatch(/RonnyHandtak/);
    expect(fab).toMatch(/PHONE_KORT_FYLL/);
    expect(fab).toMatch(/text-\[14px\]/);
    expect(fab).toMatch(/gap-6/);
    expect(fab).toMatch(/data-ronny-forstor/);
    expect(fab).toMatch(/data-ronny-lukk/);
    expect(fab).toMatch(/data-ronny-scrim/);
    expect(fab).toMatch(/ronnySheetHoydePx/);
    expect(fab).not.toMatch(/<Galaxy/);
    expect(fab).not.toMatch(/RONNY_GALAXY_TETTHET/);
    expect(fab).toMatch(/bg-\[#fff\]/);
    expect(fab).toMatch(/#e0e0e0/);
    expect(fab).toMatch(/COMPOSER_SAFE/);
    expect(fab).not.toMatch(/COMPOSER_BUNN/);
    expect(fab).toMatch(/data-ronny-prompt-kort[\s\S]{0,160}py-1\.5/);
    expect(fab).toMatch(/paddingBottom: COMPOSER_SAFE/);
    expect(fab).toMatch(/max\(6px, env\(safe-area-inset-bottom\)\)/);
    expect(fab).toMatch(/data-ronny-prompt-flate/);
    expect(fab).toMatch(/MessageBubble/);
    expect(fab).toMatch(/align=\{melding\.role === 'user' \? 'end' : 'start'\}/);
    expect(fab).toMatch(/placeholder="Spør Ronny/);
    expect(fab).toMatch(/setPromptTekst\(''\)/);
    expect(fab).toMatch(/norskChatFeil/);
    expect(fab).not.toMatch(/Noe gikk galt\. Prøv igjen\./);
    expect(fab).toMatch(/api: '\/chat\/workshop'/);
    expect(fab).toMatch(/body: \{ side \}/);
    expect(fab).toMatch(/expression=\{uttrykk\}/);
    expect(fab).toMatch(/state=\{tilstand\}/);
    expect(fab).toMatch(/const tilstand: StateId = 'idle'/);
    expect(fab).not.toMatch(/'thinking'/);
    expect(fab).not.toMatch(/'alert'/);
    expect(fab).not.toMatch(/'notify'/);
    expect(fab).not.toMatch(/#1ED27D|#EE2924/);
    expect(fab).not.toMatch(/ShaderGradient/);
    expect(css).not.toMatch(/ronny-blink/);
    expect(css).toMatch(/rotateY\(360deg\)/);
    expect(css).toMatch(/ronny-spin/);
    expect(css).toMatch(/ronny-tenker-shimmer/);
    expect(css).toMatch(/ronny-tenker-tekst/);
    expect(fab).toMatch(/data-ronny-traad/);
    expect(fab).toMatch(/no-scrollbar/);
    expect(fab).toMatch(/GradualBlur/);
    expect(fab).toMatch(/phoneOpen/);
    expect(fab).toMatch(/data-ronny-laast/);
    expect(fab).toMatch(/data-ronny-side-scroll/);
    const hjem = les('../app/(app)/_shell/phone-home.ts');
    expect(hjem).toMatch(
      /VERKSTED_INNHOLD = 'mx-auto w-full max-w-\[520px\] px-3 md:max-w-\[1120px\] md:px-8'/,
    );
    expect(les('../app/(app)/layout.tsx')).toMatch(/data-ronny-side-scroll/);
    expect(les('../app/(app)/_workshop/gradual-blur.tsx')).toMatch(/export function GradualBlur/);
    expect(les('../app/(app)/_workshop/gradual-blur.tsx')).not.toMatch(/from ['"]mathjs['"]/);
    const tokens = les('../../../packages/widget-tokens/src/tokens.css');
    const light = tokens.slice(0, tokens.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ew-accent:\s*#0066cc/);
    const submit = les('../../../packages/ui/src/components/prompt-input.tsx');
    expect(submit).toMatch(/bg-\[#0066cc\]/);
    expect(submit).not.toMatch(/bg-\[#111\]/);
    expect(submit).toMatch(/text-\[16px\]/);
    expect(submit).toMatch(/md:text-label/);
    expect(submit).toMatch(/max-h-8/);
    expect(submit).toMatch(/min-h-6/);
    expect(submit).not.toMatch(/max-h-10/);
    expect(submit).not.toMatch(/max-h-36/);
    expect(submit).toMatch(/size-7/);
    expect(submit).toMatch(/flex w-full items-end/);
    expect(fab).toMatch(/gåTil|gaaTil|erTillattGaaTil/);
  });

  it('chat-ruta tar imot sidekontekst-header', () => {
    const chat = les('../../api/src/routes/chat.ts');
    expect(chat).toMatch(/merkelapp/);
    expect(chat).toMatch(/pathname/);
    expect(chat).toMatch(/systemExtra/);
    expect(chat).toMatch(/pakkSideSomData/);
    expect(chat).toMatch(/ModelNotConfiguredError/);
    expect(chat).toMatch(/UgyldigToolNavnError/);
    expect(chat).toMatch(/vurderRonnyInn/);
    expect(chat).toMatch(/AgentPreflightRefuse/);
    expect(chat).toMatch(/filterInput/);
    expect(chat).toMatch(/resolveModelProvider/);
    expect(chat).toMatch(/createUIMessageStream/);
    const runtimeChat = les('../../../packages/agent-runtime/src/chat.ts');
    expect(runtimeChat).toMatch(/pakkKlientKontekstSomData\(options\.systemExtra\)/);
    expect(runtimeChat).not.toMatch(/\n\$\{options\.systemExtra\}`/);
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

describe('Jonas/Mikael 05.09 — Ronny-sheet uten Grainient/Galaxy', () => {
  it('Galaxy og Grainient er borte fra Ronny', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    expect(fab).not.toMatch(/<Galaxy/);
    expect(fab).not.toMatch(/RONNY_GALAXY/);
    expect(fab).not.toMatch(/<Grainient/);
    expect(fab).not.toMatch(/#FF9FFC|#5227FF/);
  });

  it('sheet er hvit flate, composer transparent, uten peek', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    expect(fab).toMatch(/data-ronny-sheet[\s\S]{0,400}bg-\[#fff\]/);
    expect(fab).not.toMatch(/<Galaxy/);
    expect(fab).not.toMatch(/<Grainient/);
    expect(fab).not.toMatch(/visPeek/);
    const composerKilde = fab.slice(fab.indexOf('data-ronny-composer'));
    expect(composerKilde).not.toMatch(/Grainient|Galaxy/);
    expect(composerKilde).toMatch(/bg-transparent/);
  });
});

describe('Ingen blobatar i produktflaten', () => {
  it('globals importerer ikke blobatar-css', () => {
    const css = les('../app/globals.css');
    expect(css).not.toMatch(/blobatar/);
  });
});
