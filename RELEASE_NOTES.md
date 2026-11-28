# TASK 12 release candidate

Verified application/test source: `72c5f3a65c3922f4e1de03e53c238d8da6bd1926`.

- Fix local SQLite startup contention by configuring the existing busy timeout before initial transactions.
- Add the guarded, additive `release-readiness-v1` migration with one recent-account sorting index; preserve all existing domain records.
- Remove unused 91-day availability aggregation from server-rendered SEO data while preserving the ordinary reservation/catalogue API contract.
- Apply production CSP/security headers consistently; add minimal no-store/noindex database health at `/api/health`.
- Render root HTML through localized SEO, redirect the production index.html alias, localize titles/OG locales, add truthful escaped WebSite/WebPage data and prevent preview/sample indexing. Private client navigation removes structured data.
- Add immutable caching for hashed JS/CSS and lazy-load three optional interfaces while preserving eager offline translation behavior.
- Add guarded temporary load measurement, production-mode browser checks, static import-graph asset measurements and a read-only release inspection. No dependency or new environment variable.

New commands: `npm run release:check`, `npm run test:release-load`, `npm run release:assets` (after build). Do not run synthetic loads, demo seeds or test suites against deployment data. Test load always creates a separate temporary database and never accepts a deployment URL.

Executed: 282/282 native tests, both TypeScript projects, build/built-client checks, nine CI jobs, actual four-language production-mode CSP browser checks and existing full staging regressions. Before/after results, the initial failed contention workload and independent CI metrics are retained in docs/release/evidence.

Manual release gates remain: explicit owner approval, administrator MFA or reviewed compensating control, actual VPS environment/TLS/firewall/worker/backup restore acceptance and physical-device checks. No production deployment, database changes or merge performed. Main bundle budget warning, full-array legacy/public catalogue loading and substring full scans remain documented limitations. These results do not justify switching database engines.

See [Persian readiness/security report](RELEASE_READINESS_REPORT_FA.md), [performance measurements](RELEASE_PERFORMANCE.md), [staging instructions](RELEASE_STAGING_FA.md), [conditional production deployment/backup/rollback](RELEASE_DEPLOYMENT_FA.md), and [owner release checklist](RELEASE_CHECKLIST_FA.md).
