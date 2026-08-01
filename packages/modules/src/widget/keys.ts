import { randomBytes } from 'node:crypto';

/**
 * F4-02 — Generer en publishable widget-nøkkel. Offentlig (trygg i Framer), men
 * ugjettbar: `pk_live_<32 hex>` = 128 bit entropi. Prefikset gjør den lett å
 * kjenne igjen (à la Stripe) og skiller den fra hemmelige nøkler.
 */
export function generatePublishableKey(): string {
  return `pk_live_${randomBytes(16).toString('hex')}`;
}
