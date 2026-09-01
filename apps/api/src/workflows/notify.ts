import { createDb } from '@endwise/db';
import { createDispatcher, type DispatchInput } from '@endwise/modules/notifications';
import { createResendChannel } from '@endwise/toolkit-resend';
import { createTwilioChannel } from '@endwise/toolkit-twilio';
import { FatalError, RetryableError } from 'workflow';

/**
 * Varsling som durable jobb (Vercel Workflows, F0-13/ADR-003).
 * Roadmap-teksten sier «Twilio + BullMQ». BullMQ er et dødt valg (techstack §6).
 * Køen er Workflows. Sendingen er den samme.
 * Retry-sikkerheten ligger ikke her — den ligger i dispatcherens idempotens-vakt.
 * Dette steget kan trygt kjøres om igjen: andre gang returnerer den
 * `duplicate: true` og sender ingenting.
 */
async function sendNotification(input: DispatchInput) {
  'use step';

  const databaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new FatalError(
      'Mangler database-URL: sett APP_DATABASE_URL eller DATABASE_URL (se .env.example)',
    );

  const channels = [];
  if (process.env.RESEND_API_KEY) {
    channels.push(
      createResendChannel({
        apiKey: process.env.RESEND_API_KEY,
      }),
    );
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    channels.push(
      createTwilioChannel({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_FROM,
      }),
    );
  }

  if (channels.length === 0) {
    // Ingen nøkler = feilkonfigurasjon, ikke et forbigående problem.
    throw new FatalError('Ingen varslingskanaler er konfigurert');
  }

  const dispatcher = createDispatcher(createDb(databaseUrl), channels);

  try {
    return await dispatcher.dispatch(input);
  } catch (error) {
    // Leverandøren er nede / rate-limiter oss → prøv igjen. Idempotens-vakten
    // gjør at en retry ikke kan sende dobbelt.
    throw new RetryableError(`Varsling feilet: ${(error as Error).message}`, {
      retryAfter: '2m',
    });
  }
}

async function escalate(input: DispatchInput, reason: string) {
  'use step';
  // Dlq-mønsteret (F0-13): et varsel som aldri kom fram, skal ikke forsvinne i stillhet.
  console.error(`[dlq] varsel ikke levert: ${input.event} → ${input.to}: ${reason}`);
}

export async function notifyWorkflow(input: DispatchInput) {
  'use workflow';
  try {
    return await sendNotification(input);
  } catch (error) {
    if (error instanceof FatalError) {
      await escalate(input, error.message);
      return { sent: false, duplicate: false };
    }
    throw error;
  }
}
