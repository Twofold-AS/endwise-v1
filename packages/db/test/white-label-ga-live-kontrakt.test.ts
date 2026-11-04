import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('0057 white-label gå live-kontrakt', () => {
  const sql = readFileSync(resolve(her, '../drizzle/0057_white_label_ga_live.sql'), 'utf8');
  const rettelse = readFileSync(resolve(her, '../drizzle/0058_white_label_ga_admin.sql'), 'utf8');
  const journal = readFileSync(resolve(her, '../drizzle/meta/_journal.json'), 'utf8');

  it('journalfører 0057 og 0058', () => {
    expect(journal).toMatch(/0057_white_label_ga_live/);
    expect(journal).toMatch(/0058_white_label_ga_admin/);
  });

  it('seeder mikkis@twofold.no som endwise_admin og sletter forhandlere', () => {
    expect(sql).toMatch(/mikkis@twofold\.no/);
    expect(sql).not.toMatch(/mikael_rk@hotmail\.com/);
    expect(sql).toMatch(/endwise_admin/);
    expect(sql).toMatch(/slett_forhandler/);
    expect(sql).toMatch(/kind = 'platform'/);
    expect(sql).toMatch(/slug = 'endwise'/);
    expect(sql).toMatch(/slug IS DISTINCT FROM 'endwise'/);
  });

  it('0058 tar endwise_admin fra mikael_rk@hotmail.com hvis 0057 allerede kjørte', () => {
    expect(rettelse).toMatch(/mikkis@twofold\.no/);
    expect(rettelse).toMatch(/DELETE FROM member/);
    expect(rettelse).toMatch(/mikael_rk@hotmail\.com/);
    expect(rettelse).toMatch(/role = 'endwise_admin'/);
  });

  it('web-build kjører vercel-migrate før next build', () => {
    const pkg = readFileSync(resolve(her, '../../../apps/web/package.json'), 'utf8');
    expect(pkg).toMatch(/vercel-migrate\.ts/);
  });

  it('production uten DATABASE_URL stopper bygget', () => {
    const src = readFileSync(resolve(her, '../scripts/vercel-migrate.ts'), 'utf8');
    expect(src).toMatch(/vercelMigrateBeslutning/);
    expect(src).toMatch(/handling === 'stopp'/);
  });
});
