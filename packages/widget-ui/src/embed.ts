import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { EndwiseWidget, type EndwiseWidgetProps } from './EndwiseWidget.tsx';

/**
 * Monter widgeten i et DOM-element (embed-inngangen). Returnerer en
 * opprydder. Den versjonerte runtimen (CDN/R2) kaller denne; Framer-skallet
 * (F4-01) sender inn publishable key + apiBase via Property Controls.
 */
export function mountEndwiseWidget(el: HTMLElement, props: EndwiseWidgetProps): () => void {
  const root = createRoot(el);
  root.render(createElement(EndwiseWidget, props));
  return () => root.unmount();
}
