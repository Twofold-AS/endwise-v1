import { Resend } from 'resend';
import { authEnv } from '../env.ts';

/** F1-11 — e-post-2FA og auth-eposter går via Resend (techstack §5). */
let client: Resend | undefined;

function getClient(): Resend {
  if (!client) client = new Resend(authEnv.resend.apiKey);
  return client;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const { error } = await getClient().emails.send({
    from: authEnv.resend.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  if (error) throw new Error(`Resend feilet: ${error.message}`);
}

export async function sendTwoFactorOtp(to: string, otp: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Engangskode til Endwise',
    text: `Din engangskode er ${otp}. Den er gyldig i 5 minutter.\n\nHar du ikke bedt om denne koden, kontakt oss umiddelbart.`,
  });
}
