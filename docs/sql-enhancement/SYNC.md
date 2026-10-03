# SQL enhancement — repo sync

Keep these aligned when working on SQL indexing:

| What | Pin |
|------|-----|
| **Released / daemon / Cursor MCP** | **3.34.6** (`trace -v`, `trace daemon status`) |
| **npm global** | `trace-mcp@3.34.6` |
| **This git branch** | `feat/sql-brightchamps-corpus` from tag `v3.34.6` |
| **Benchmark corpus** | `data-analytics-python/scripts/queries` (**250** `.sql` files; **277** `.sql` repo-wide) |

## Environment

- `TRACE_SQL_CORPUS_ROOT` — optional override; default resolves sibling `../data-analytics-python/scripts/queries` from this repo root.
- `TRACE_SQL_AST=0` — force v3.34.6 regex-only SQL plugin (default: AST enabled).
- `TRACE_SQL_INDEX_PROJECT` / `TRACE_INDEX_DB` — override paths for `npm run sql-index:smoke`.

## Benchmark repo pointer

`data-analytics-python/.cursor/trace-sql-sync.json` mirrors this file’s pins.

## Phases

1. **Phase 0** — evidence (`phase-0-evidence.md`), index baseline, regex root-cause.
2. **Phase 1** — `tests/sql-corpus/brightchamps-ground-truth.json` + baseline vitest (this branch).
3. **Phase 2** — done: tree-sitter-sql spike (`phase-2-summary.md`, `npm run sql-corpus:spike`).
4. **Phase 3 prep** — `phase-3-prep.md`, metadata contract (`sql-index-metadata.ts`), inventories (`sql-corpus:p2-inventory`, `sql-python:loader-inventory`), `shim-ledger.json`.
5. **Phase 3+** — wire AST into indexer, edges, Python loaders, MCP retrieval.
6. **Coverage** — living backlog: `coverage-roadmap.md`; run `npm run sql-partial:diagnostics` when adding preprocessors.
