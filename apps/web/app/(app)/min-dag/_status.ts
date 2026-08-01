export const STATUS_LABEL: Record<string, string> = {
  draft: 'Utkast',
  confirmed: 'Planlagt',
  in_progress: 'Pågår',
  completed: 'Ferdig',
  cancelled: 'Avlyst',
  no_show: 'Møtte ikke',
};

export function fmtTime(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function estMinutes(from: Date | string, to: Date | string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}
