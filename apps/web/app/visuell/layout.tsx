import type { ReactNode } from 'react';

/**
 * Setter tema fra ?tema= før paint, så visuell GO matcher lys/mørk uten flimmer.
 * Samme nøkkel som TEMA_SKRIPT (`endwise:tema`).
 */
const TEMA_FRA_URL = `(function(){try{var q=new URLSearchParams(location.search).get('tema');if(q!=='dark'&&q!=='light')return;localStorage.setItem('endwise:tema',q);var r=document.documentElement;r.dataset.theme=q;r.classList.toggle('dark',q==='dark');}catch(e){}})();`;

export default function VisuellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: statisk tema fra query */}
      <script dangerouslySetInnerHTML={{ __html: TEMA_FRA_URL }} />
      {children}
    </>
  );
}
