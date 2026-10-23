import { describe, expect, it } from 'vitest';
import { scrubAiAuditMetadata } from '../src/audit/write.ts';

describe('AI-audit uten promptinnhold', () => {
  it('fjerner prompt, melding og tekst fra metadata', () => {
    const scrubbed = scrubAiAuditMetadata({
      agent: 'workshop',
      prompt: 'hemmelig fødselsnummer 01019012345',
      message: 'ikke denne',
      text: 'heller ikke denne',
      triggered: ['pii'],
    });
    expect(scrubbed).toEqual({ agent: 'workshop', triggered: ['pii'] });
    expect(JSON.stringify(scrubbed)).not.toContain('01019012345');
    expect(JSON.stringify(scrubbed)).not.toContain('hemmelig');
  });
});
