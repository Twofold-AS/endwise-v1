'use client';

import { Avatar, type AvatarValg, Users } from '@endwise/ui';

/**
 * Mikael home lock — Multiple People showcase.
 * 182×40, ikon 20×19. Desktop only. Existing Avatar — no new package.
 */
export function PeopleShowcase({
  folk,
}: {
  folk: { id: string; name?: string; avatar?: AvatarValg | null }[];
}) {
  const vis = folk.slice(0, 6);
  return (
    <div
      data-people-showcase
      className="hidden h-10 w-[182px] shrink-0 items-center md:flex"
      aria-hidden={vis.length === 0}
    >
      {vis.length === 0 ? (
        <Users className="h-[19px] w-5 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden />
      ) : (
        <ul className="flex items-center">
          {vis.map((p, i) => (
            <li
              key={p.id}
              className="relative"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: vis.length - i }}
            >
              <Avatar
                seed={p.id}
                valg={p.avatar}
                navn={p.name}
                size={20}
                bevegelse="stille"
                className="h-[19px] w-5"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
