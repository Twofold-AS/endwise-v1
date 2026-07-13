import { Badge, Card, CardTitle } from '@endwise/ui';

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Endwise</h1>
        <Badge tone="outline">F0 · Fundament</Badge>
      </div>
      <Card>
        <CardTitle>Fundamentet står</CardTitle>
        <p className="mt-2 text-sm text-fg-muted">
          Next.js 16 · React 19.2 · Tailwind 4 · Turborepo · Biome. Flater bygges i F1 og utover.
        </p>
      </Card>
    </main>
  );
}
