import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEMA_NOKKEL, TEMA_SKRIPT } from '../app/(app)/_lib/tema';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Synara dual theme', () => {
  it('FOUC-skript setter .dark og data-theme fra system eller lagret valg', () => {
    expect(TEMA_NOKKEL).toBe('endwise:tema');
    expect(TEMA_SKRIPT).toMatch(/prefers-color-scheme: dark/);
    expect(TEMA_SKRIPT).toMatch(/classList.toggle\('dark'/);
    expect(TEMA_SKRIPT).toMatch(/dataset.theme/);
    expect(les('../app/layout.tsx')).toMatch(/TEMA_SKRIPT/);
    expect(les('../app/providers.tsx')).toMatch(/TemaProvider/);
    expect(les('../app/_lib/tema-toggle.tsx')).toMatch(/data-tema-toggle/);
    expect(les('../app/_markeds/markeds-chrome.tsx')).toMatch(/TemaToggle/);
    expect(les('../app/(app)/_shell/sidebar.tsx')).toMatch(/TemaToggle/);
  });

  it('forhandler-nav har Synara-seksjoner uten Threads/Kanban', () => {
    const nav = les('../app/(app)/_shell/nav.ts');
    expect(nav).toMatch(/section: 'Verkstedet'/);
    expect(nav).toMatch(/section: 'Kunder'/);
    expect(nav).toMatch(/section: 'Organisasjon'/);
    expect(nav).not.toMatch(/label: 'Threads'|label: 'Kanban'|coding agent/i);
  });
});
