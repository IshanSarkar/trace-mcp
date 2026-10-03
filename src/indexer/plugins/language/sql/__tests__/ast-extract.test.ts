import { describe, expect, it } from 'vitest';
import { extractCtesFromTree } from '../ast-extract.js';
import { parseSqlSource } from '../sql-parser.js';

describe('extractCtesFromTree', () => {
  it('uses identifier start line and CTE node end line', async () => {
    const sql = `WITH a AS (
  SELECT 1
), b AS (SELECT 2)`;
    const tree = await parseSqlSource(sql);
    const ctes = extractCtesFromTree(tree.rootNode);
    tree.delete();
    const a = ctes.find((c) => c.name === 'a');
    expect(a?.lineStart).toBe(1);
    expect(a?.lineEnd).toBeGreaterThan(1);
  });
});
