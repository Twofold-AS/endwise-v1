import { describe, expect, it } from 'vitest';
import { lastOppLogo } from '../src/index.ts';

describe('F19 / white label F3: uploads logo', () => {
  it('avviser SVG før Blob', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await expect(lastOppLogo({ tenantId: 't', bytes: svg, token: 'x' })).rejects.toThrow(/SVG/);
  });

  it('krever token', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(lastOppLogo({ tenantId: 't', bytes: png })).rejects.toThrow(/satt opp/);
  });
});
