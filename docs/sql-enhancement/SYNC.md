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

Private benchmark (run from **this repo**; set paths to your Python/SQL project):

```bash
TRACE_SQL_CORPUS_ROOT=/path/to/scripts/queries npm run sql-corpus:spike
TRACE_SQL_INDEX_PROJECT=/path/to/project npm run sql-index:smoke
TRACE_SQL_INDEX_PROJECT=/path/to/project npm run sql-index:cte-diff
```

When `TRACE_SQL_INDEX_PROJECT` points at a repo with `.cursor/trace-sql-sync.json`, `sql-index:smoke` uses `corpus.cte_count_ast` from that file (not `tests/sql-corpus/corpus-metrics.json`).

## Phases

| Phase | Scope | Status |
|-------|--------|--------|
| **0–2** | Evidence, spike, preprocessors | **Done** — `phase-0-evidence.md`, `phase-2-summary.md` |
| **3** | AST CTE plugin + metadata | **Done** — `phase-3-prep.md` |
| **4** | Graph edges: `sql_cte_ref`, `sql_reads`, `loads_sql` | **Done** — `phase-4-prep.md` |

Phase 4 resolvers: `sql-cte-refs.ts`, `sql-reads.ts`, `loads-sql.ts` (+ SQL relation phantoms; subproject reconcile keeps `__phantom__` rows).

## PR #1482 review follow-ups (addressed in branch)

| Maintainer item | Fix |
|-----------------|-----|
| Preprocess span drift | `sql-source-map.ts` maps AST byte/lines back to original SQL |
| Plain `SELECT` sql_reads | `__sql#module` file-unit symbol when no CTEs |
| False `sql_cte_ref` | CTE deps only from `object_reference` (FROM/JOIN), not SELECT columns |
| Duplicate CTE names | All definitions indexed; symbol id `name@line` when `defIndex > 0` |
| Python `loads_sql` in comments/strings | Skip matches where `isOffsetInPythonCommentOrString` |
| pnpm 12 migration | Reverted to pnpm 10 / upstream lockfile in SQL PR |

**Indexing cost (fill after local benchmark):** record `index --force` wall time, peak RSS, and edge counts (`sql_cte_ref`, `sql_reads`, `loads_sql`) on a representative project before/after Phase 4 resolvers.

## What's next (no more phased product work in scope)

**Nothing is required** to finish the SQL indexing product you scoped (Phases 0–4). Optional follow-ups only if you need them:

| Track | When | Actions |
|-------|------|---------|
| **Use it** | Now | Local `dist/cli.js` MCP + re-index after plugin changes; lineage via trace tools |
| **Land upstream** | When employer allows | `git push fork feat/sql-postgresql-cte-indexing` → sign CLA on PR **#1482** → CI green → review |
| **v1.1 polish** | In progress / optional | Path()-chain `loads_sql` (`ROOT` + `_load_extract_df` / `sql_path=`), more partial-parse fixes, dedicated SQL graph MCP tools |

There is no **Phase 5** in the original plan.
