/*
 * FLYTTET til `packages/agents/test/agent.test.ts`.
 *
 * Disse integrasjonstestene trenger konkrete agent-definisjoner
 * (driftInnsiktAgent / kundeSupportAgent) fra @endwise/agents. Så lenge de lå
 * her, skapte de en SIRKULÆR avhengighet: @endwise/agents → @endwise/agent-runtime
 * (prod) og @endwise/agent-runtime → @endwise/agents (test-devDep).
 *
 * Løsning (2026-07-16): integrasjonstestene bor nå i @endwise/agents (toppen av
 * avhengighetskjeden), og importerer runtimen via dens offentlige API
 * (@endwise/agent-runtime). agent-runtime har ikke lenger noen avhengighet til
 * agents. (Fila kan ikke slettes i dette miljøet — derfor denne stubben.)
 */
import { it } from 'vitest';

it.todo('flyttet til @endwise/agents/test/agent.test.ts');
