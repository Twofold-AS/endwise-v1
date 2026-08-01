import twilio from 'twilio';
import { authEnv } from '../env.ts';

/**
 * F1-01 — Twilio Verify som OTP-sender (techstack §2 Auth).
 *
 * Poenget med Verify: Twilio eier koden. Vi genererer den ikke, lagrer den ikke
 * og sammenligner den ikke — vi spør bare «er denne gyldig?». Da finnes det
 * ingen OTP-hemmelighet hos oss å lekke.
 */
let client: ReturnType<typeof twilio> | undefined;

function getClient() {
  if (!client) {
    const { accountSid, authToken } = authEnv.twilio;
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendPhoneOtp(phoneNumber: string): Promise<void> {
  const { verifyServiceSid } = authEnv.twilio;
  await getClient()
    .verify.v2.services(verifyServiceSid)
    .verifications.create({ to: phoneNumber, channel: 'sms' });
}

export async function verifyPhoneOtp(phoneNumber: string, code: string): Promise<boolean> {
  const { verifyServiceSid } = authEnv.twilio;
  const check = await getClient()
    .verify.v2.services(verifyServiceSid)
    .verificationChecks.create({ to: phoneNumber, code });
  return check.status === 'approved';
}
