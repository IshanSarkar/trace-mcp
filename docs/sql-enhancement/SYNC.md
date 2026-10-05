# SQL enhancement — repo sync

## Public vs private corpora

| Corpus | Location | CI |
|--------|----------|-----|
| **Public fixture pack** | `tests/sql-corpus/fixtures/` + `fixture-ground-truth.json` | `npm run test:sql-corpus` |
| **Large / proprietary** | Your machine only — `TRACE_SQL_CORPUS_ROOT`, `TRACE_SQL_INDEX_PROJECT`, `TRACE_SQL_BENCHMARK_ROOT` | Not in upstream CI |

## Environment

- `TRACE_SQL_CORPUS_ROOT` — directory of `.sql` files for spike / inventory / cte-diff scripts (defaults to public fixtures).
- `TRACE_SQL_INDEX_PROJECT` — project root for `sql-index:smoke` and `sql-index:cte-diff` (required for those scripts).
- `TRACE_SQL_BENCHMARK_ROOT` — Python repo root for `sql-python:loader-inventory`.
- `TRACE_SQL_AST=0` — regex-only SQL plugin (default on feature branch: AST enabled).

## Gates (upstream)

```bash
npm run test:sql-corpus
npm run build
```

Private benchmark (optional):

```bash
TRACE_SQL_CORPUS_ROOT=/path/to/queries npm run sql-corpus:spike
TRACE_SQL_INDEX_PROJECT=/path/to/project npm run sql-index:smoke
```

## Phases

1. **Phase 0–2** — evidence, spike, preprocessors (`phase-0-evidence.md`, `phase-2-summary.md`).
2. **Phase 3** — AST CTE plugin + metadata (`phase-3-prep.md`).
3. **Phase 4** — graph edges (`phase-4-prep.md`): `sql_cte_ref` (in progress), `sql_reads`, `loads_sql`.
