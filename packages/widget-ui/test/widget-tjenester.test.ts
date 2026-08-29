import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Widget tjenester — tom/retry, ikke «feil»', () => {
  const widget = les('../src/EndwiseWidget.tsx');
  const client = les('../src/client.ts');

  it('kaller ikke forhandler.get og dumper ikke tRPC-feil som «feil»', () => {
    const kode = widget.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(kode).not.toMatch(/forhandler\.get|trpc\./);
    expect(kode).not.toMatch(/['"`][Ff]eil['"`]/);
    expect(client).not.toMatch(/Feil \(\$\{/);
    expect(client).not.toMatch(/`Feil /);
  });

  it('viser tom-state eller retry når tjenester mangler eller kall feiler', () => {
    expect(widget).toMatch(/listServices/);
    expect(widget).toMatch(/Ingen bookbare tjenester|Kunne ikke hente tjenester/);
    expect(widget).toMatch(/Prøv igjen/);
    expect(widget).not.toMatch(/\.catch\(\(\) => \{\}\)/);
  });

  it('kan ta imot samme katalog som Tjenester (services.list)', () => {
    expect(widget).toMatch(/initialServices/);
  });
});
