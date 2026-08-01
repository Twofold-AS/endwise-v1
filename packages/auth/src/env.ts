function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Miljøvariabel mangler: ${name}`);
  return value;
}

export const authEnv = {
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get secret() {
    return required('BETTER_AUTH_SECRET');
  },
  get baseUrl() {
    return required('BETTER_AUTH_URL');
  },
  get twilio() {
    return {
      accountSid: required('TWILIO_ACCOUNT_SID'),
      authToken: required('TWILIO_AUTH_TOKEN'),
      verifyServiceSid: required('TWILIO_VERIFY_SERVICE_SID'),
    };
  },
  get resend() {
    return {
      apiKey: required('RESEND_API_KEY'),
      from: process.env.RESEND_FROM ?? 'Endwise <noreply@endwise.no>',
    };
  },
} as const;
