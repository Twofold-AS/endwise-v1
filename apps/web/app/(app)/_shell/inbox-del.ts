/** Filter på lista — ikke egne destinasjoner. */
export type InboxPart = 'alle' | 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';

export const INNBOKS_FILTERE: { key: InboxPart; label: string }[] = [
  { key: 'alle', label: 'Alle chatter' },
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Intern' },
  { key: 'dealer_admin', label: 'Endwise' },
];
