import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * shadcn/ui-konvensjonen: `cn` bor her. Registry-pakker (shadcn, beUI)
 * importerer denne.
 * Hvorfor denne ikke er `twMerge` rett ut av eska
 * Symptomet: «Logg inn» og «Lagre» hadde grå tekst på svart knapp. I mørkt
 * tema var den nesten usynlig — lys grå på hvitt.
 * Årsaken: vi har tre egne font-størrelser i `theme.css` — `text-title`,
 * `text-label` og `text-body` (eierens designprinsipper, §6). tailwind-merge
 * kjenner dem ikke, og gjetter derfor at `text-label` hører til samme
 * konfliktgruppe som `text-primary-foreground`, siden begge starter med
 * `text-`. Den beholder den siste og kaster den første.
 * Rekkefølgen avgjorde dermed hvilken feil man fikk:
 * beUIs `Button` — variant (farge) før size (`text-label`)
 * → **fargen ble kastet**. Teksten arvet `--ew-fg`:
 * grå på svart i lyst tema, lysegrå på hvitt i mørkt.
 * shadcns `Button` — base (`text-label`) før variant (farge)
 * → **størrelsen ble kastet**. Mindre synlig, like galt.
 * Begge slo ut overalt knappene brukes, som er hvorfor det så ut som «flere
 * knapper rundt om» og ikke som én ødelagt knapp.
 * Fiksen: registrer de tre som ekte font-størrelser. Da konflikter
 * `text-label` kun med andre font-størrelser, og fargen får stå i fred.
 * Legger noen til en ny `--text-*` i `theme.css`, må den inn her også.
 * Glemmes det, kommer nøyaktig samme feil tilbake — stille, som sist.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['title', 'label', 'body'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
