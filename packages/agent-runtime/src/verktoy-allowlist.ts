import type { Tool } from 'ai';

/** Server-allowlist. Nøkler utenfor lista når aldri modellen. */
export function filtrerVerktoyAllowlist(
  tools: Record<string, Tool>,
  allowlist: readonly string[] | undefined,
): Record<string, Tool> {
  if (!allowlist) return tools;
  return Object.fromEntries(Object.entries(tools).filter(([navn]) => allowlist.includes(navn)));
}
