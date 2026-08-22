import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listAgents } from '../src/index.ts';

/**
 * F13-03 — Vercel serverless (endwise-v1-web) bundler ikke `instructions.md`
 * når agentene leser den med `readFileSync` + `import.meta.url` ved import.
 * Da krasjer HELE tRPC-routerens modulevaluering (også `session.me`).
 *
 * Instruksjonen skal fortsatt bo i `instructions.md` (techstack §2), men
 * lastes som en bundler-inline-streng — aldri fra et absolutt `/var/task/`-spor.
 */
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src');

function utenKommentarer(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function agentSourceFiles(): string[] {
  return readdirSync(srcRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(srcRoot, entry.name, 'agent.ts'))
    .filter((path) => {
      try {
        readFileSync(path);
        return true;
      } catch {
        return false;
      }
    });
}

describe('agent-instruksjoner lastes uten filesystem (F13-03)', () => {
  const files = agentSourceFiles();

  it('finner minst én agent.ts (testdekning, ikke tomt)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('ingen agent.ts leser .md med readFileSync / import.meta.url', () => {
    for (const file of files) {
      const src = utenKommentarer(readFileSync(file, 'utf8'));
      expect(src, file).not.toMatch(/readFileSync/);
      expect(src, file).not.toMatch(/fileURLToPath/);
      expect(src, file).not.toMatch(/import\.meta\.url/);
      expect(src, file).not.toMatch(/\/var\/task/);
    }
  });

  it('hver agent.ts importerer instructions.md som modulstreng', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).toMatch(/import\s+\w+\s+from\s+['"]\.\/instructions\.md(\?raw)?['"]/);
    }
  });

  it('ingen .ts i pakken gjør readFileSync mot .md', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path);
        return entry.name.endsWith('.ts') ? [path] : [];
      });

    for (const file of walk(srcRoot)) {
      const src = utenKommentarer(readFileSync(file, 'utf8'));
      if (!/readFileSync/.test(src)) continue;
      expect(src, file).not.toMatch(/\.md['"`]/);
    }
  });

  it('registrerte agenter har instruksjonen fra instructions.md', () => {
    const agents = listAgents();
    expect(agents.length).toBeGreaterThan(0);

    for (const agent of agents) {
      const md = readFileSync(join(srcRoot, agent.name, 'instructions.md'), 'utf8');
      expect(agent.instructions).toBe(md);
      expect(agent.instructions.length).toBeGreaterThan(20);
    }
  });
});
