# Phase 4 — SQL graph edges

**Status:** in progress (`sql_cte_ref` wired; `sql_reads` + `loads_sql` next).

Design locked in `phase-3-prep.md` §5–6.

## Edge types (schema seed)

| Edge | From | To | Status |
|------|------|-----|--------|
| `sql_cte_ref` | CTE symbol | CTE symbol (same file) | **Implemented** — metadata `referencesCtes`, resolver `sql-cte-refs.ts` |
| `sql_reads` | CTE or file | Relation / table symbol | Planned — `relationRefs` + per-CTE scoping |
| `loads_sql` | Python symbol | `.sql` file node | Planned — `python-loader-inventory.json` |

## Gates (Phase 4)

```bash
npm run test:sql-corpus
npm run build
node dist/cli.js index "<data-analytics-python>" --force
# Optional: count sql_cte_ref in index DB
sqlite3 ~/.trace/index/data-analytics-python-*.db \
  "SELECT COUNT(*) FROM edges e JOIN edge_types t ON t.id=e.edge_type_id WHERE t.name='sql_cte_ref';"
```

## Upstream PR

- https://github.com/nikolai-vysotskyi/trace-mcp/pull/1479 (Phase 3 AST)
- **Blocker:** [CLA](https://cla-assistant.io/nikolai-vysotskyi/trace-mcp?pullRequest=1479) must be signed before CI/review proceeds.
- Fork mirror: https://github.com/IshanSarkar/trace-mcp/pull/1

Phase 4 commits land on `feat/sql-brightchamps-corpus` after Phase 3 merges or as follow-up PR.
