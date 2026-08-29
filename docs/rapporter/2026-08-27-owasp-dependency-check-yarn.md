# Øktrapport 27.08.2026 — F0-15 OWASP Dependency-Check (yarn-analyzer)

## 1. Hva er gjort (F0-15)

Security-gate på main (fe9c38c, run #201) og PR #70 falt på steget «OWASP Dependency-Check». `pnpm audit --audit-level high` var grønt (1 low + 5 moderate).

Eksakt feil (identisk på PR #70 job 98409074948 og main run 33039969500):

```
[WARN] The Yarn Audit Analyzer has been disabled after failing to find yarn. Yarn executable was not found or received a non-zero exit value: Unable to determine yarn version.
[ERROR] Exception occurred initializing Yarn Audit Analyzer.
[INFO] Analysis Complete (227 seconds)
[INFO] Writing SARIF report to: /github/workspace/reports/dependency-check-report.sarif
[ERROR] Unable to determine yarn executable to use.
```

Ikke NVD-rate-limit, ikke manglende API-nøkkel, ikke CVSS-fail, ikke manglende rapport. Actionen kjører i Docker (`owasp/dependency-check-action`) og sender alltid `--noupdate`. Host har yarn (setup-node), containeren har det ikke. Repoet er pnpm; Pnpm Audit Analyzer fullførte.

Fiks: `args: --disableYarnAudit` + eksplisitt `out: reports`. upload-sarif kjører når `reports/dependency-check-report.sarif` finnes (også etter rødt OWASP-steg). Ingen `continue-on-error`, ingen hopp over `pnpm audit`, ingen suppression-XML, ingen ZAP-endring.

## 2. Hva gikk galt

`gh secret list` ga 403 — kunne ikke verifisere om `NVD_API_KEY` finnes. Uansett: actionen har ingen `nvdApiKey`-input og sender `--noupdate`, så NVD-nøkkel er ikke årsaken. ZAP Docker-feil er kjent (#69) og urørt.

## 3. Fikser

| Funnen | Lukket med |
|---|---|
| `[ERROR] Unable to determine yarn executable to use.` | `--disableYarnAudit` (støttet CLI-flagg via action-input `args`) |
| upload-sarif hoppet over etter rødt steg | `if: hashFiles('reports/dependency-check-report.sarif')` |

## 4. Neste steg

- F0-15 forblir `progress` (ZAP mot ekte preview, pentest).
- Ikke merge #69 i denne PR-en.
