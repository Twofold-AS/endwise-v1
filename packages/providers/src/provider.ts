import type { ModelRole } from '@endwise/modules';
import type { LanguageModel } from 'ai';
import type { DataRegion } from './data-region.ts';

export interface ModelRequest {
  role: ModelRole;
  tenantId?: string;
  plan?: string;
}

/**
 * Leverandør-abstraksjonen (techstack §2: «leverandører bak abstraksjon»).
 * `region` er ikke metadata. Den er det agent-runtimen håndhever rutingregelen
 * mot (se `data-region.ts`). En provider som lyver om regionen sin, lyver om
 * hvor kundens data havner.
 */
export interface ModelProvider {
  readonly name: string;
  /** Hvor inferensen faktisk kjører. Avgjør hvilke agenter som kan bruke den. */
  readonly region: DataRegion;
  isConfigured(): boolean;
  /** Returnerer en AI SDK-modell for en rolle, ikke for et modellnavn. */
  model(request: ModelRequest): LanguageModel;
}
