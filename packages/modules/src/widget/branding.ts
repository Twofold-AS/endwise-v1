import { vurderAksent } from '../branding/index.ts';

/**
 * F37 / white label F14 — offentlige felt widgeten kan vise.
 * Ingen tenant-id, ingen utkast, ingen upublisert farge.
 */
export type WidgetBranding = {
  visningsnavn: string | null;
  logoUrl: string | null;
  aksentfarge: string | null;
  aksentTekstfarge: string | null;
  visLevertAv: boolean;
};

export const TOM_WIDGET_BRANDING: WidgetBranding = {
  visningsnavn: null,
  logoUrl: null,
  aksentfarge: null,
  aksentTekstfarge: null,
  visLevertAv: true,
};

export type WidgetBrandingRad = {
  visningsnavn?: string | null;
  logoUrl?: string | null;
  aksentfarge?: string | null;
  aksentTekstfarge?: string | null;
  visLevertAv?: boolean | null;
  publisertAt?: Date | null;
};

function httpsLogo(url: string | null | undefined): string | null {
  if (!url?.startsWith('https://')) return null;
  if (url.toLowerCase().includes('.svg') || url.toLowerCase().includes('image/svg')) return null;
  return url;
}

/** Publisert merke, eller tomt. #0066ff og dårlig kontrast droppes. */
export function widgetBrandingFraRad(rad: WidgetBrandingRad | null | undefined): WidgetBranding {
  if (!rad?.publisertAt) return { ...TOM_WIDGET_BRANDING };
  const navn = rad.visningsnavn?.trim().slice(0, 80) || null;
  const vurdert = rad.aksentfarge ? vurderAksent(rad.aksentfarge) : { ok: false as const };
  return {
    visningsnavn: navn,
    logoUrl: httpsLogo(rad.logoUrl),
    aksentfarge: vurdert.ok ? vurdert.hex : null,
    aksentTekstfarge: vurdert.ok ? vurdert.tekst : null,
    visLevertAv: rad.visLevertAv !== false,
  };
}
