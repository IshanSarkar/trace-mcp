import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { spikeParseSqlSource } from '../../src/indexer/plugins/language/sql/spike-parse.js';
import groundTruth from './fixture-ground-truth.json';
import { fixtureFile } from './fixture-paths.js';

describe('tree-sitter-sql spike (public fixture pack)', () => {
  for (const fixture of groundTruth.fixtures) {
    it(`${fixture.id}: extracts expected CTEs`, async () => {
      const full = fixtureFile(fixture.path);
      expect(full).toBeTruthy();
      const original = fs.readFileSync(full!, 'utf8');
      const result = await spikeParseSqlSource(original);
      const expectedStatus = (fixture as { parse_status?: string }).parse_status;
      if (expectedStatus === 'partial') {
        expect(result.status).toBe('partial');
      } else {
        expect(result.status).not.toBe('failed');
      }
      const names = result.ctes.map((c) => c.name).sort();
      const expected = fixture.ctes.map((c) => c.name).sort();
      expect(names).toEqual(expected);
    });
  }

  it('parent_etl: MATERIALIZED CTEs and :: casts parse clean', async () => {
    const full = fixtureFile('etl/parent_etl.sql');
    expect(full).toBeTruthy();
    const result = await spikeParseSqlSource(fs.readFileSync(full!, 'utf8'));
    expect(result.status).not.toBe('failed');
    expect(result.ctes.map((c) => c.name).sort()).toEqual(
      ['all_transactions', 'parent_collections'].sort(),
    );
  });

  it('lead_assignment: DISTINCT ON parses clean', async () => {
    const full = fixtureFile('etl/lead_assignment.sql');
    expect(full).toBeTruthy();
    const result = await spikeParseSqlSource(fs.readFileSync(full!, 'utf8'));
    expect(result.status).not.toBe('failed');
    expect(result.ctes.map((c) => c.name)).toEqual(['pay']);
  });

  it('uri_probability_features: Python {format} slot does not break parse', async () => {
    const full = fixtureFile('uri_probability_features.sql');
    expect(full).toBeTruthy();
    const result = await spikeParseSqlSource(fs.readFileSync(full!, 'utf8'));
    expect(result.preprocess.formatSlots.map((s) => s.name)).toContain('pool_date_filter');
    expect(result.status).not.toBe('failed');
    expect(result.ctes.length).toBeGreaterThan(0);
  });

  it('communication_etl_incremental: parses after AT TIME ZONE normalization', async () => {
    const full = fixtureFile('communication_etl_incremental.sql');
    expect(full).toBeTruthy();
    const result = await spikeParseSqlSource(fs.readFileSync(full!, 'utf8'));
    expect(result.status).toBe('ok');
    expect(result.ctes.map((c) => c.name).sort()).toEqual([
      'bookings',
      'communication_logs',
      'crat',
    ]);
  });

  it('base_ownership: template slots preserved', async () => {
    const full = fixtureFile('etl/base_ownership.sql');
    expect(full).toBeTruthy();
    const result = await spikeParseSqlSource(fs.readFileSync(full!, 'utf8'));
    expect(result.preprocess.templates.map((t) => t.name)).toContain('SCHEMA_NAME');
    expect(result.preprocess.bindParams).toEqual(expect.arrayContaining(['run_mode', 'id_list']));
  });
});
