/**
 * Static Python → `.sql` path extraction for `loads_sql` (Phase 4).
 * v1: string literals, module-level constants, and loader call first arguments.
 * No f-strings or dynamic Path(__file__) chains.
 */

import path from 'node:path';

export const PYTHON_SQL_LOADER_CALLEES = [
  'read_sql_file',
  'render_sql_file',
  'load_query_sql',
  'load_sql_with_connectorx',
  'load_sql_with_benchmark',
  'load_incremental_with_connectorx',
  'load_incremental_with_benchmark',
  'load_sql_text_with_connectorx',
] as const;

const LOADER_CALLEE_PATTERN = PYTHON_SQL_LOADER_CALLEES.join('|');

export interface PythonSqlLoadRef {
  line: number;
  sqlPath: string;
  via: 'loader_call' | 'qualified_literal';
  callee?: string;
}

export function normalizeRepoRelativePath(p: string): string {
  const posix = p.split(path.sep).join('/');
  return path.posix.normalize(posix).replace(/^\.\//, '');
}

export function isStaticSqlPathLiteral(raw: string): boolean {
  if (!raw.endsWith('.sql')) return false;
  if (raw.includes('{') || raw.includes('}') || raw.includes('%') || raw.includes('$')) {
    return false;
  }
  if (raw.includes('\n') || raw.includes('\r')) return false;
  return true;
}

function lineNumberAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function extractModuleConstants(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /^([A-Z][A-Z0-9_]*)\s*=\s*['"]([^'"]+\.sql)['"]\s*(?:#.*)?$/gm;
  for (const m of source.matchAll(re)) {
    const name = m[1];
    const val = m[2];
    if (name && val && isStaticSqlPathLiteral(val)) map.set(name, val);
  }
  return map;
}

function resolveFirstArg(arg: string, constants: Map<string, string>): string | null {
  const trimmed = arg.trim();
  const str = trimmed.match(/^['"]([^'"]+\.sql)['"]$/);
  if (str?.[1] && isStaticSqlPathLiteral(str[1])) return str[1];
  const id = trimmed.match(/^([A-Z][A-Z0-9_]*)$/);
  if (id?.[1]) {
    const c = constants.get(id[1]);
    if (c) return c;
  }
  return null;
}

/**
 * Resolve a candidate path against indexed `.sql` file paths (repo-relative, POSIX).
 */
export function resolveToIndexedSqlPath(
  candidate: string,
  pyFileRel: string,
  indexedSqlPaths: Set<string>,
): string | null {
  const norm = normalizeRepoRelativePath(candidate);
  if (indexedSqlPaths.has(norm)) return norm;
  const fromPy = normalizeRepoRelativePath(
    path.posix.join(path.posix.dirname(normalizeRepoRelativePath(pyFileRel)), norm),
  );
  if (indexedSqlPaths.has(fromPy)) return fromPy;
  return null;
}

export function extractPythonSqlLoadRefs(source: string): PythonSqlLoadRef[] {
  const constants = extractModuleConstants(source);
  const out: PythonSqlLoadRef[] = [];
  const seen = new Set<string>();

  const loaderRe = new RegExp(`\\b(${LOADER_CALLEE_PATTERN})\\s*\\(\\s*([^,\\n#)]+)`, 'g');
  for (const m of source.matchAll(loaderRe)) {
    const callee = m[1];
    const arg = m[2];
    if (!callee || !arg) continue;
    const sqlPath = resolveFirstArg(arg, constants);
    if (!sqlPath) continue;
    const line = lineNumberAt(source, m.index ?? 0);
    const key = `${line}:${sqlPath}:${callee}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ line, sqlPath, via: 'loader_call', callee });
  }

  const litRe = /(?<![fF])['"]([^'"]+\.sql)['"]/g;
  for (const m of source.matchAll(litRe)) {
    const sqlPath = m[1];
    if (!sqlPath || !isStaticSqlPathLiteral(sqlPath)) continue;
    if (!sqlPath.includes('/')) continue;
    const line = lineNumberAt(source, m.index ?? 0);
    const key = `lit:${line}:${sqlPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ line, sqlPath, via: 'qualified_literal' });
  }

  return out;
}
