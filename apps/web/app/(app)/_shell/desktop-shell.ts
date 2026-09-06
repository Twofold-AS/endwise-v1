/**
 * Mikael desktop three-column lock.
 * Sidebar 389 · content 598 · standby 452. Non-sidebar axis = 1050.
 * Top-bars over box 2 and box 3 are 53px. Phone overlay is unchanged
 * except shared `md:` sizes on the same Sidebar.
 *
 * Sidebar chrome: 275 flush-right in 389, 8+259+8.
 * Left empty rail is 389−275 = 114, not 26.
 * Nav boxes are full inner width (259), icon 26×26, label ~26.
 * Enterprise box 233×52 pad-x 32. Profile 259 pad 12.
 * No Handlinger row. No desktop collapse/expand control.
 */
export const DESKTOP_SIDEBAR_W = 389;
export const DESKTOP_SIDEBAR_CHROME_W = 275;
export const DESKTOP_SIDEBAR_RAIL_W = 114;
export const DESKTOP_SIDEBAR_PAD = 8;
export const DESKTOP_SIDEBAR_INNER_W = 259;
export const DESKTOP_NAV_IKON = 26;
export const DESKTOP_NAV_BTN_W = 259;
export const DESKTOP_NAV_BTN_H = 50;
export const DESKTOP_NAV_BTN_PAD = 12;
export const DESKTOP_NAV_LABEL_H = 26;
export const DESKTOP_NAV_LABEL_SIZE = 21;
export const DESKTOP_PROFIL_W = 259;
export const DESKTOP_PROFIL_H = 65;
export const DESKTOP_PROFIL_PAD = 12;
export const DESKTOP_ENTERPRISE_W = 233;
export const DESKTOP_ENTERPRISE_H = 52;
export const DESKTOP_ENTERPRISE_PX = 32;
export const DESKTOP_LOGO_H = 30;
export const DESKTOP_BOX2_W = 598;
export const DESKTOP_BOX3_W = 452;
export const DESKTOP_AXIS_W = 1050;
export const DESKTOP_TOPBAR_H = 53;
export const DESKTOP_KORT_W = 348;
export const DESKTOP_KORT_H = 160;
export const DESKTOP_KORT_PX = 16;
export const DESKTOP_KORT_PY = 20;
export const DESKTOP_PEOPLE_W = 182;
export const DESKTOP_PEOPLE_H = 40;
export const DESKTOP_PEOPLE_IKON_W = 20;
export const DESKTOP_PEOPLE_IKON_H = 19;

export const DESKTOP_SIDEBAR_KLASSE = 'md:w-[389px]';
export const DESKTOP_SIDEBAR_SMAL = 'md:w-[52px]';
export const DESKTOP_AXIS_KLASSE = 'md:w-[1050px]';
export const DESKTOP_BOX2_KLASSE = 'md:w-[598px]';
export const DESKTOP_BOX3_KLASSE = 'md:w-[452px]';
export const DESKTOP_TOPBAR_KLASSE = 'h-[53px]';
