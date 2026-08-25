# Øktrapport 25.08.2026 — F1-07/F8-01 MDWE-krasj i CONNECT-proxy

## Hva er gjort (F1-07 / F8-01)

- Fjernet `MemoryDenyWriteExecute=yes` fra `ops/quick-connect-proxy/quick-connect-proxy.service`.
- Lagt inn én-linjes kommentar: Node/V8 kan ikke kjøre med MDWE (JIT trenger kjørbare sider).
- Alle andre herdingsflagg er uendret (`NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, `ProtectKernelTunables`, `ProtectControlGroups`, `RestrictAddressFamilies`, `RestrictNamespaces`, `LockPersonality`, `SystemCallArchitectures=native`).
- `proxy.mjs`, dest-lås, auth og `QUICK_TOKEN` er ikke rørt. Ingen dump-VM.

## Hva gikk galt

Hypotesen er verifisert mot unit-fila, V8-kilde og kjente MDWE+Node-krasj: `MemoryDenyWriteExecute` blokkerer `mprotect(W→X)`. V8 feiler ved snapshot-deserialisering («Fatal javascript OOM in MemoryChunk allocation failed during deserialization»), `status=5/TRAP`, restart-løkke. Dette er ikke app-minnelekkasje — `proxy.mjs` er en tynn CONNECT-proxy.

Lokal `systemd-run --property=MemoryDenyWriteExecute=yes` lot seg ikke kjøre i denne VM-en (ingen `/usr/bin/node`, ingen user-bus). Repro er derfor dokumentert, ikke gjenskapt her.

## Fikser

- Kun unit-endringen over. Ingen kodeendring i proxyen.

## Neste steg

- Deploy unit på Ubuntu 24.04-boksen (`install.sh` eller `systemctl daemon-reload` + restart) og bekreft at Node starter (`listening … CONNECT q3.quick.no:443 only`).
- F1-07/F8-01 forblir `progress` (mekanikere på tvers, booking/PUSH gjenstår).
