export const ORG_LISTE = [
  { id: 'ansatte', label: 'Ansatte', href: '/organisasjon?seksjon=ansatte' },
  { id: 'timeplan', label: 'Timeplan', href: '/jobber' },
  { id: 'abonnement', label: 'Abonnement', href: '/organisasjon?seksjon=abonnement', admin: true },
  {
    id: 'integrasjoner',
    label: 'Integrasjoner',
    href: '/organisasjon?seksjon=integrasjoner',
    admin: true,
  },
] as const;
