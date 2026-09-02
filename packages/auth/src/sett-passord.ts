/**
 * CWE-262 — passordstabelen er død. Funksjonen står igjen som navn
 * så et glemt kallsted feiler lukket i stedet for å skrive hash.
 */
export async function settPassordUtenSesjon(
  _db?: unknown,
  _userId?: string,
  _passord?: string,
): Promise<never> {
  throw new Error('Passord er av. Innlogging er magic link + TOTP.');
}
