import { createStreamRedactor, type GuardrailPipeline } from '@endwise/guardrails';
import { DataRegionViolation, type ModelProvider, providerSatisfies } from '@endwise/providers';
import { isStepCount, type ModelMessage, streamText, type TextStreamPart, type ToolSet } from 'ai';
import { type AgentDefinition, AgentPreflightRefuse, assertEntitled } from './agent.ts';
import { type AgentContext, sealContext } from './context.ts';
import { pakkKlientKontekstSomData } from './klient-data.ts';
import { assertAsciiToolNames } from './tool-navn.ts';
import { filtrerVerktoyAllowlist } from './verktoy-allowlist.ts';

/**
 * Chat-inngangen til agent-runtimen.
 * Hvorfor en egen fil ved siden av `loop.ts`
 * `runAgent` drenerer strømmen selv og returnerer ferdig tekst. Det er riktig
 * for den bakgrunnskjøringen den ble laget for (F6-02: agenten svarer i en tråd,
 * tokens går ut over SSE). En chat trenger det motsatte: `useChat` vil ha
 * strømmen selv, i AI SDK sitt UI-message-format, med tool-parts og
 * godkjenn-steg intakt.
 * Løsningen er ikke å utvide master-løkka. Den er «lukket for endring»
 * (techstack §2) av en grunn: en løkke som vokser med spesialtilfeller blir et
 * sted der en sikkerhetsregel kan forsvinne i en if-setning. Dette er en ny
 * inngang med de samme sperrene, ikke en ny variant av løkka.
 * De fire sperrene, i samme rekkefølge som `spawnAgent`
 * 1. dataregion — customer_freetext ⇒ EU-provider. Kastes, ikke logges.
 * 2. entitlement — betalt modul (F0-04).
 * 3. forseglet kontekst — tenantId kan ikke settes, bare gis.
 * 4. guardrails — L1 inn, L2/L3/L5 på verktøy, L4 ut (strømmende, se under).
 * L4 måtte skrives om for strømming
 * `filterOutput` kjører på hele svaret. Tokens kommer i biter, og et
 * fødselsnummer delt over to biter treffer ingen regex. Å strømme rått og
 * filtrere til slutt er ikke å filtrere — teksten er allerede i nettleseren.
 * Derfor går hver `text-delta` gjennom `createStreamRedactor`, som holder
 * tilbake de siste ~80 tegnene til de er trygge. Se `stream-redact.ts`.
 * Ingen Vercel AI Gateway. Modellen kommer fra `provider.model`, som
 * kommer fra `resolveModelProvider(agent.dataClass)`. Rutingen er den samme som
 * for alle andre agenter, og den er håndhevet — ikke konfigurert.
 */

export interface ChatOptions {
  agent: AgentDefinition;
  context: AgentContext;
  provider: ModelProvider;
  guardrails: GuardrailPipeline;
  /** Historikken, allerede konvertert fra UI-meldinger av kallstedet. */
  messages: ModelMessage[];
  /** Sidekontekst og annet som skal inn i systemprompten på hver tur. */
  systemExtra?: string;
  onViolation?: (message: string) => void;
  /**
   * Hard allowlist. Verktøy utenfor lista sendes aldri til modellen.
   * Ronny bruker denne i tillegg til `filtrerRonnyVerktoy` i agenten.
   */
  toolAllowlist?: readonly string[];
  /**
   * Output-policy etter L4. Hele tekstblokken holdes tilbake til den er
   * vurdert — ellers rekker et jailbreak-svar ut før vi kan stoppe det.
   */
  rewriteAssistantText?: (text: string, ctx: { usedTools: readonly string[] }) => string;
}

/**
 * Bygger `streamText`-resultatet en chat-rute kan gjøre om til en
 * UI-message-stream. Returnerer resultatet udrenert — kallstedet eier strømmen.
 */
export function streamAgentChat(options: ChatOptions) {
  const { agent, provider, guardrails } = options;

  // 1. Dataregion først, som i spawnAgent. En kunde-agent mot Fireworks er
  // ikke en feilkonfigurasjon — det er norske kunders ord sendt til usa.
  if (!providerSatisfies(provider, agent.dataClass)) {
    throw new DataRegionViolation(agent.name, agent.dataClass, provider.name, provider.region);
  }

  // 2. + 3. Frys konteksten, så sjekk entitlement mot den frosne.
  const context = sealContext(options.context);
  assertEntitled(agent, context);

  // 4. Verktøyene bygges ÉN gang, med den frosne konteksten — samme invariant
  // som spawn: det finnes ikke et sted der en tenant-ID kan *settes*.
  const nekt = agent.preflight?.(options.messages);
  if (nekt) throw new AgentPreflightRefuse(nekt);

  const rawTools = agent.tools(context);
  const tillatte = filtrerVerktoyAllowlist(rawTools, options.toolAllowlist ?? agent.toolAllowlist);
  const tools = guardrails.wrapTools(tillatte, context);
  // Mistral 400 02.09: `gåTil` er ugyldig function name. Stopp før HTTP.
  assertAsciiToolNames(tools);

  // Fabrikk, ikke instans: transformen lager én redaktør per tekstblokk.
  const lagRedactor = () =>
    createStreamRedactor(context, (violation) => options.onViolation?.(violation.message));

  const usedTools: string[] = [];
  const rewrite =
    options.rewriteAssistantText ??
    (agent.rewriteOutput
      ? (text: string, ctx: { usedTools: readonly string[] }) =>
          agent.rewriteOutput?.(text, { ...ctx, messages: options.messages }) ?? text
      : undefined);

  return streamText({
    model: provider.model({ role: agent.role, tenantId: context.tenantId }),
    system: options.systemExtra
      ? `${agent.instructions}\n\n${pakkKlientKontekstSomData(options.systemExtra)}`
      : agent.instructions,
    messages: options.messages,
    tools,
    stopWhen: isStepCount(agent.maxSteps),
    experimental_transform: rewrite
      ? l4MedPolicy(lagRedactor, {
          rewrite: (text) => rewrite(text, { usedTools }),
          onTool: (navn) => {
            usedTools.push(navn);
          },
        })
      : l4Redaksjon(lagRedactor),
  });
}

/**
 * L4 som en strøm-transform. Tekst-biter går gjennom redaktøren; alt annet
 * (tool-calls, steg-hendelser) passerer urørt — de er strukturerte felter, ikke
 * fritekst, og har allerede vært gjennom L2/L3 i `wrapTools`.
 * Hvorfor resten tømmes på `text-end`, ikke i `flush`
 * Første forsøk tømte redaktøren i strømmens `flush`. Det så riktig ut og var
 * feil, og feilen var synlig først når man kjørte det mot ekte HTTP:
 * data: {"type":"text-end","id":"0"}
 * data: {"type":"finish"}
 * data: {"type":"text-delta","id":"l4-flush", …} ← etter finish
 * data: {"type":"error","errorText":"An error occurred."}
 * To feil i én: teksten kom etter at meldingen var erklært ferdig, og den hadde
 * en `id` det aldri var sendt noen `text-start` for — så UI-message-strømmen
 * avviste den og avsluttet med `error`. Halen av hvert svar ville forsvunnet.
 * Nå holdes én redaktør per tekstblokk (`text-start` … `text-end`), og resten
 * tømmes rett før `text-end` går ut, med samme `id`. Da er rekkefølgen den
 * SDK-en forventer, og halen havner der den hører hjemme.
 */
/**
 * L4 + output-policy. Teksten holdes tilbake til blokken er ferdig, så et
 * jailbreak-svar ikke rekker ut før vi kan bytte det mot nekt.
 */
function l4MedPolicy(
  lagRedactor: () => ReturnType<typeof createStreamRedactor>,
  options: {
    rewrite: (text: string) => string;
    onTool: (navn: string) => void;
  },
) {
  return <TOOLS extends ToolSet>() => {
    const blokker = new Map<string, string>();

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === 'tool-call') {
          options.onTool(chunk.toolName);
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === 'text-start') {
          blokker.set(chunk.id, '');
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === 'text-delta') {
          blokker.set(chunk.id, (blokker.get(chunk.id) ?? '') + chunk.text);
          return;
        }

        if (chunk.type === 'text-end') {
          const raw = blokker.get(chunk.id) ?? '';
          blokker.delete(chunk.id);
          const redaktor = lagRedactor();
          const l4 = redaktor.push(raw) + redaktor.flush();
          const ut = options.rewrite(l4);
          if (ut) {
            controller.enqueue({
              type: 'text-delta',
              id: chunk.id,
              text: ut,
            } as TextStreamPart<TOOLS>);
          }
          controller.enqueue(chunk);
          return;
        }

        controller.enqueue(chunk);
      },
    });
  };
}

function l4Redaksjon(lagRedactor: () => ReturnType<typeof createStreamRedactor>) {
  return <TOOLS extends ToolSet>() => {
    // Én redaktør per tekstblokk. Et svar kan ha flere (f.eks. tekst før og
    // etter et verktøykall), og de skal ikke dele holdback-vindu.
    const blokker = new Map<string, ReturnType<typeof createStreamRedactor>>();

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === 'text-start') {
          blokker.set(chunk.id, lagRedactor());
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === 'text-delta') {
          const r = blokker.get(chunk.id);
          if (!r) {
            // Ingen `text-start` sett. Da vet vi ikke hva som er trygt å holde
            // tilbake — men vi skal ikke slippe teksten uredigert heller.
            const engangs = lagRedactor();
            const alt = engangs.push(chunk.text) + engangs.flush();
            if (alt) controller.enqueue({ ...chunk, text: alt });
            return;
          }
          const trygg = r.push(chunk.text);
          // Tom bit = alt holdes fortsatt tilbake. Da sender vi ingenting heller
          // enn en tom delta, som ville blitt en usynlig, meningsløs hendelse.
          if (trygg) controller.enqueue({ ...chunk, text: trygg });
          return;
        }

        if (chunk.type === 'text-end') {
          const r = blokker.get(chunk.id);
          if (r) {
            const rest = r.flush();
            // Resten først, så `text-end`. Motsatt rekkefølge er nøyaktig
            // bugen kommentaren over beskriver.
            if (rest) {
              controller.enqueue({
                type: 'text-delta',
                id: chunk.id,
                text: rest,
              } as TextStreamPart<TOOLS>);
            }
            blokker.delete(chunk.id);
          }
          controller.enqueue(chunk);
          return;
        }

        controller.enqueue(chunk);
      },

      // Sikkerhetsnett: brytes strømmen uten `text-end`, skal ikke halen bli
      // borte i stillhet. Den kommer da med sin egen id — som er rart, men
      // synlig, og det er riktig vei å feile.
      flush(controller) {
        for (const [id, r] of blokker) {
          const rest = r.flush();
          if (rest) {
            controller.enqueue({ type: 'text-delta', id, text: rest } as TextStreamPart<TOOLS>);
          }
        }
        blokker.clear();
      },
    });
  };
}
