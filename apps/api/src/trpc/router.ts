import { publicProcedure, router } from './init.ts';
import { agentRouter } from './routers/agent.ts';
import { billingRouter } from './routers/billing.ts';
import { bookingsRouter } from './routers/bookings.ts';
import { competenceRouter } from './routers/competence.ts';
import { conflictsRouter } from './routers/conflicts.ts';
import { customersRouter } from './routers/customers.ts';
import { directoryRouter } from './routers/directory.ts';
import { flagsRouter } from './routers/flags.ts';
import { helpdeskRouter } from './routers/helpdesk.ts';
import { inboxContextRouter } from './routers/inbox-context.ts';
import { inventoryRouter } from './routers/inventory.ts';
import { invitasjonerRouter } from './routers/invitasjoner.ts';
import { lookupRouter } from './routers/lookup.ts';
import { mechanicRouter } from './routers/mechanic.ts';
import { mechanicsRouter } from './routers/mechanics.ts';
import { messagesRouter } from './routers/messages.ts';
import { onboardingRouter } from './routers/onboarding.ts';
import { personvernRouter } from './routers/personvern.ts';
import { platformTeamRouter } from './routers/platform-team.ts';
import { profileRouter } from './routers/profile.ts';
import { quickRouter } from './routers/quick.ts';
import { servicesRouter } from './routers/services.ts';
import { shopRouter } from './routers/shop.ts';
import { sessionRouter } from './routers/session.ts';
import { streamRouter } from './routers/stream.ts';
import { teamRouter } from './routers/team.ts';
import { tenantsRouter } from './routers/tenants.ts';
import { vegvesenRouter } from './routers/vegvesen.ts';
import { vehiclesRouter } from './routers/vehicles.ts';
import { verkstedRouter } from './routers/verksted.ts';
import { widgetRouter } from './routers/widget.ts';

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, at: new Date().toISOString() })),

  // F2 — Kjernedata / F3 — Booking
  billing: billingRouter,
  mechanic: mechanicRouter,
  session: sessionRouter,
  stream: streamRouter,
  tenants: tenantsRouter,
  customers: customersRouter,
  directory: directoryRouter,
  profile: profileRouter,
  inboxContext: inboxContextRouter,
  // F1-10 — lederens side av invitasjonsflyten.
  invitasjoner: invitasjonerRouter,
  onboarding: onboardingRouter,
  team: teamRouter,
  platformTeam: platformTeamRouter,
  verksted: verkstedRouter,
  flags: flagsRouter,
  inventory: inventoryRouter,
  shop: shopRouter,
  vehicles: vehiclesRouter,
  helpdesk: helpdeskRouter,
  services: servicesRouter,
  lookup: lookupRouter,
  vegvesen: vegvesenRouter,
  bookings: bookingsRouter,
  mechanics: mechanicsRouter,
  competence: competenceRouter,

  // F8 — Integrasjoner (Quick ERP-adapter)
  quick: quickRouter,
  conflicts: conflictsRouter,

  // F4 — Kundewidget (admin: nøkkel-forvaltning)
  widget: widgetRouter,

  // F14 — Personvern (retensjon + sletting)
  personvern: personvernRouter,

  // F6 — Meldinger + AI
  messages: messagesRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
