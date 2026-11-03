import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F37 / white label F14: widget-init branding', () => {
  it('init returnerer publicBranding uten hemmeligheter', () => {
    const rute = readFileSync(resolve(her, '../src/routes/widget/index.ts'), 'utf8');
    const svc = readFileSync(
      resolve(her, '../../../packages/modules/src/widget/service.ts'),
      'utf8',
    );
    expect(rute).toMatch(/publicBranding/);
    expect(rute).toMatch(/branding/);
    expect(svc).toMatch(/widgetBrandingFraRad/);
    expect(svc).toMatch(/schema\.tenantBranding/);
    expect(rute).not.toMatch(/#0066ff/);
    expect(rute).not.toMatch(/utkast/);
  });
});
