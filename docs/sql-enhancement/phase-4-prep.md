# Phase 4 — SQL graph edges

**Status:** `sql_cte_ref` implemented; `sql_reads` + `loads_sql` next.

Design: `phase-3-prep.md` §5–6.

## Edge types

| Edge | Status |
|------|--------|
| `sql_cte_ref` | CTE → CTE via `referencesCtes` + `sql-cte-refs.ts` resolver |
| `sql_reads` | Planned |
| `loads_sql` | Planned — `sql-python:loader-inventory` with `TRACE_SQL_BENCHMARK_ROOT` |

## Verify `sql_cte_ref` (private index)

```bash
npm run build
node dist/cli.js index "$TRACE_SQL_INDEX_PROJECT" --force
sqlite3 "$TRACE_INDEX_DB" \
  "SELECT COUNT(*) FROM edges e JOIN edge_types t ON t.id=e.edge_type_id WHERE t.name='sql_cte_ref';"
```
