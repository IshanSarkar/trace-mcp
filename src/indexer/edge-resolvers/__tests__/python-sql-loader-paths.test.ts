import { describe, expect, it } from 'vitest';
import { extractPythonSqlLoadRefs, resolveToIndexedSqlPath } from '../python-sql-loader-paths.js';

describe('extractPythonSqlLoadRefs', () => {
  it('resolves module constants in loader calls', () => {
    const src = `
SQL_FILE = "etl/base_ownership.sql"
def run():
    read_sql_file(SQL_FILE)
`;
    const refs = extractPythonSqlLoadRefs(src);
    expect(
      refs.some((r) => r.sqlPath === 'etl/base_ownership.sql' && r.via === 'loader_call'),
    ).toBe(true);
  });

  it('captures qualified string literals (and loader calls)', () => {
    const src = 'render_sql_file("ledger/payment_ledger.sql")';
    const refs = extractPythonSqlLoadRefs(src);
    expect(refs.map((r) => r.sqlPath)).toContain('ledger/payment_ledger.sql');
    expect(refs.some((r) => r.via === 'loader_call' && r.callee === 'render_sql_file')).toBe(true);
  });
});

describe('resolveToIndexedSqlPath', () => {
  const indexed = new Set(['etl/base_ownership.sql', 'python/nested/query.sql']);

  it('matches repo-relative paths', () => {
    expect(resolveToIndexedSqlPath('etl/base_ownership.sql', 'python/etl_runner.py', indexed)).toBe(
      'etl/base_ownership.sql',
    );
  });

  it('resolves relative to the Python file directory', () => {
    expect(resolveToIndexedSqlPath('nested/query.sql', 'python/runner.py', indexed)).toBe(
      'python/nested/query.sql',
    );
  });
});
