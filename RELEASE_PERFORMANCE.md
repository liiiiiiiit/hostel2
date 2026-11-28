# TASK 12 — Executed performance measurements

Base `cbca96e0514609c14a3c634ec04530929d5deb06`; candidate code `72c5f3a65c3922f4e1de03e53c238d8da6bd1926`. Raw JSON: [docs/release/evidence](docs/release/evidence). No production load test was performed.

## Method

The same local Node 24.22.3 environment (9 reported CPUs) ran a new temporary SQLite database with 5,001 accounts, 100 published synthetic hostels and 200 room types. No live database, uploaded media or credentials were reused. One warm-up is excluded; SEO projection has five samples, each HTTP endpoint twelve. Values include application/serialization work but loopback HTTP has no real WAN/TLS cost. CPU/RSS/event-loop observations describe the benchmark parent process, not a production capacity guarantee or a continuous peak-memory sample. Four independent child processes each attempt forty serialized SQL counter increments through the real Database class. This is a lock/contention test, **not a reservation throughput claim**; actual last-room concurrency is covered by the existing reservation integration tests.

Baseline run failed its required 160-commit assertion: one process could not initialize because the SQLite busy timeout was installed after the first transaction. The raw failure is retained, not excluded as a noisy sample. The fix installs the existing 5-second timeout before initialization/guard transactions, without replaying application mutations.

## Same-host results

| Measurement | Base | Candidate run 1 | Candidate run 2 |
| --- | ---: | ---: | ---: |
| SEO public projection p95 ms | 256.46 | 50.50 | 50.05 |
| SEO projection serialized bytes | 3,299,783 | 351,384 | 351,384 |
| Admin shell HTTP p95 ms | 4.64 | 7.46 | 7.40 |
| Account page 100 HTTP p95 ms | 13.56 | 15.78 | 8.49 |
| Contains-search HTTP p95 ms | 22.06 | 9.89 | 13.49 |
| Four-process writes committed / attempted | 120 / 160 | 160 / 160 | 160 / 160 |
| Startup/write errors | 40 attempts lost to startup failure | 0 | 0 |
| Parent RSS bytes at end | 466,984,960 | 379,748,352 | 340,119,552 |
| Parent CPU time ms | 2,245.952 | 954.526 | 979.559 |

The SEO projection improvement is approximately 80% in observed p95 and 89% in serialized bytes because HTML generation does not need 91 days of availability. The ordinary booking/catalogue API still supplies its established availability contract. This avoids rewriting public search/booking behavior.

Shell p95 regressed in this small sample; account-page p95 was inconsistent. Do not claim a universal latency improvement or infer percentiles at high concurrency from twelve requests. The account query plan objectively changed from `SCAN users; USE TEMP B-TREE FOR ORDER BY` to `SCAN users USING INDEX users_admin_recent`. The additive index eliminates that sorting tree. Contains-search remains a bounded-result full scan; a B-tree does not make substring search indexed.

## Frontend build

`vite --manifest` identifies the entry and its recursive **static** import graph. Dynamic chunks are excluded until requested; all referenced initial JS and CSS are counted. This is not just a renamed entry-file size.

| Build metric | Base | Candidate |
| --- | ---: | ---: |
| Initial JS, uncompressed bytes | 583,129 | 565,207 |
| Initial JS, gzip bytes | 185,906 | 179,611 |
| Initial CSS bytes | 105,933 | 105,933 |
| Initial static graph files | 8 | 4 |

Initial JS decreased 3.07% raw / 3.39% gzip. Authentication dialog, account-action and recommendations views are lazy loaded; the offline translator remains eager to preserve the existing failure/offline experience. Content-hashed assets now use immutable one-year caching; HTML is no-store to avoid stale moderation and private-route metadata. Image resizing/WebP/EXIF removal already existed and were preserved. No fabricated Lighthouse score, Core Web Vitals or first-load WAN improvement is claimed. The main-chunk size warning remains.

## Independent CI execution

[Release measurement run 46137611014](https://github.com/liiiiiiiit/hostel2/actions/runs/46137611014) passed on a 4-CPU GitHub runner. Its separate actual outputs are committed as ci-load.json, ci-assets.json and ci-browser.json. CI SEO p95 was 47.92 ms; four processes committed 160/160 with zero errors; integrity was ok, FK violations zero. CI search p95 was 23.32 ms, demonstrating expected variability. The production-mode browser test actually executed CSP-constrained scripts and lazy authentication, checked four languages and private noindex/structured-data cleanup. Loopback DOM navigation timings in browser.json are observations, not real-user performance scores.

Artifact ID `15260486153`, ZIP SHA-256 `5bc5c7d22ff53a7f6db7f18beaa799111d94779ac80db69d278679253e6065bd`, verified after download. Original artifact retention: 30 days; committed JSON remains durable.

## Limits and next capacity review

No stress/saturation/soak test, memory-leak proof, cold-browser before/after waterfall, physical-device run, remote-libSQL benchmark or production-VPS capacity certification was performed. The public catalogue and old specialized editors still materialize their existing authorized arrays; large catalogues need a separately reviewed API pagination project. Sitemaps are not sharded for more than 50,000 URLs. Configure and observe real VPS CPU/RSS, disk/WAL growth, backup duration and p95/429/5xx rates before increasing traffic. These results do not justify a PostgreSQL migration.
