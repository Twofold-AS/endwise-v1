/**
 * Anonym widget-økt eier bookinger via idempotensnøkkelen som
 * `POST /widget/booking` allerede skriver:
 *   widget:${cid}:${serviceVersionId}:${startsAt ISO}
 *
 * `AgentContext.userId` på widget-chat er `cid` (`customer:<uuid>`), ikke
 * `customers.id`. Det er den eneste pålitelige lenken mellom økt og rad.
 * Uten gyldig cid: ingen prefix — kalleren skal feile lukket.
 */

const WIDGET_CID = /^customer:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// biome-ignore lint/complexity/noStaticOnlyClass: prosjektregel — klasse med statiske funksjoner, ikke løse helpers
export class WidgetBookingIdentity {
  /** Samme format som `/widget/booking` har brukt siden F4. */
  static idempotencyKey(input: { cid: string; serviceVersionId: string; startsAt: Date }): string {
    return `widget:${input.cid}:${input.serviceVersionId}:${input.startsAt.toISOString()}`;
  }

  /** `customer:<uuid>` fra det signerte widget-tokenet. */
  static isSessionCid(userId: string): boolean {
    return WIDGET_CID.test(userId);
  }

  /**
   * Prefix som eier alle bookinger for økten. `null` = ingen pålitelig
   * kundelenke — ikke gjett, ikke fall tilbake til tenant-tabellen.
   */
  static sessionKeyPrefix(userId: string): string | null {
    if (!WidgetBookingIdentity.isSessionCid(userId)) return null;
    return `widget:${userId}:`;
  }
}
