import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ok } from '../../src/errors.js';
import { buildProjectContext } from '../../src/indexer/project-context.js';
import { PluginRegistry } from '../../src/plugin-api/registry.js';
import type {
  FileParseResult,
  FrameworkPlugin,
  LanguagePlugin,
  ProjectContext,
} from '../../src/plugin-api/types.js';

function makeLanguagePlugin(name: string, priority: number, extensions: string[]): LanguagePlugin {
  return {
    manifest: { name, version: '1.0.0', priority },
    supportedExtensions: extensions,
    extractSymbols: () => ok({ status: 'ok', symbols: [] } as FileParseResult),
  };
}

function makeFrameworkPlugin(
  name: string,
  priority: number,
  deps: string[] = [],
  detect = true,
): FrameworkPlugin {
  return {
    manifest: { name, version: '1.0.0', priority, dependencies: deps },
    detect: () => detect,
    registerSchema: () => ({}),
  };
}

const mockCtx: ProjectContext = {
  rootPath: '/tmp/test',
  configFiles: [],
};

describe('plugin registry', () => {
  it('sorts language plugins by priority', () => {
    const registry = new PluginRegistry();
    registry.registerLanguagePlugin(makeLanguagePlugin('vue', 10, ['.vue']));
    registry.registerLanguagePlugin(makeLanguagePlugin('php', 0, ['.php']));
    registry.registerLanguagePlugin(makeLanguagePlugin('ts', 5, ['.ts']));

    const plugins = registry.getLanguagePlugins();
    expect(plugins.map((p) => p.manifest.name)).toEqual(['php', 'ts', 'vue']);
  });

  it('finds language plugin by file extension', () => {
    const registry = new PluginRegistry();
    registry.registerLanguagePlugin(makeLanguagePlugin('php', 0, ['.php']));
    registry.registerLanguagePlugin(makeLanguagePlugin('ts', 5, ['.ts', '.tsx']));

    expect(registry.getLanguagePluginForFile('app/Models/User.php')?.manifest.name).toBe('php');
    expect(registry.getLanguagePluginForFile('src/App.tsx')?.manifest.name).toBe('ts');
    expect(registry.getLanguagePluginForFile('readme.md')).toBeUndefined();
  });

  it('routes .h to the C plugin, not FORM (TRA-832 regression)', () => {
    // Both plugins used to declare `.h`; FORM's lower priority number won the
    // shared extension, so every C/C++ header in every repo was silently
    // indexed as the FORM symbolic-computation language instead of C.
    const registry = PluginRegistry.createWithDefaults();
    expect(registry.getLanguagePluginForFile('src/server.h')?.manifest.name).toBe('c-language');
  });

  it('topological sorts framework plugins by dependencies', () => {
    const registry = new PluginRegistry();
    registry.registerFrameworkPlugin(
      makeFrameworkPlugin('inertia', 20, ['laravel', 'vue-framework']),
    );
    registry.registerFrameworkPlugin(makeFrameworkPlugin('vue-framework', 10));
    registry.registerFrameworkPlugin(makeFrameworkPlugin('laravel', 0));

    const result = registry.getActiveFrameworkPlugins(mockCtx);
    expect(result.isOk()).toBe(true);

    const names = result._unsafeUnwrap().map((p) => p.manifest.name);
    expect(names.indexOf('laravel')).toBeLessThan(names.indexOf('inertia'));
    expect(names.indexOf('vue-framework')).toBeLessThan(names.indexOf('inertia'));
  });

  it('detects circular dependencies', () => {
    const registry = new PluginRegistry();
    registry.registerFrameworkPlugin(makeFrameworkPlugin('a', 0, ['b']));
    registry.registerFrameworkPlugin(makeFrameworkPlugin('b', 0, ['a']));

    const result = registry.getActiveFrameworkPlugins(mockCtx);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('PLUGIN_ERROR');
  });

  it('filters inactive framework plugins', () => {
    const registry = new PluginRegistry();
    registry.registerFrameworkPlugin(makeFrameworkPlugin('laravel', 0, [], true));
    registry.registerFrameworkPlugin(makeFrameworkPlugin('nuxt', 10, [], false));

    const result = registry.getActiveFrameworkPlugins(mockCtx);
    expect(result.isOk()).toBe(true);

    const names = result._unsafeUnwrap().map((p) => p.manifest.name);
    expect(names).toEqual(['laravel']);
  });

  it('handles missing dependency in active set gracefully', () => {
    const registry = new PluginRegistry();
    // inertia depends on laravel, but laravel is not active (detect=false)
    registry.registerFrameworkPlugin(makeFrameworkPlugin('inertia', 10, ['laravel']));
    registry.registerFrameworkPlugin(makeFrameworkPlugin('laravel', 0, [], false));

    const result = registry.getActiveFrameworkPlugins(mockCtx);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().map((p) => p.manifest.name)).toEqual(['inertia']);
  });

  describe('multi-root framework detection cache (GH#1441 regression)', () => {
    const ctxFor = (rootPath: string): ProjectContext => ({
      rootPath,
      configFiles: [],
      detectedVersions: [],
      allDependencies: [],
    });

    it('does not leak one project detection into another on a shared registry', () => {
      const registry = new PluginRegistry();
      registry.registerFrameworkPlugin({
        manifest: { name: 'proj-a-fw', version: '1.0.0', priority: 0 },
        detect: (ctx) => ctx.rootPath === '/projects/a',
        registerSchema: () => ({}),
      });

      // Both query orders must give per-root answers: the daemon worker pool
      // shares one registry across projects, and the first project used to
      // stamp its frameworks onto every later one (0 routes/migrations).
      for (const first of ['/projects/a', '/projects/b'] as const) {
        const second = first === '/projects/a' ? '/projects/b' : '/projects/a';
        const r1 = registry.getActiveFrameworkPlugins(ctxFor(first));
        const r2 = registry.getActiveFrameworkPlugins(ctxFor(second));
        expect(r1.isOk() && r2.isOk()).toBe(true);
        const names = (root: string) =>
          (root === first ? r1 : r2)._unsafeUnwrap().map((p) => p.manifest.name);
        expect(names('/projects/a')).toEqual(['proj-a-fw']);
        expect(names('/projects/b')).toEqual([]);
      }
    });

    it('clearCaches() invalidates every root', () => {
      let detectCalls = 0;
      const registry = new PluginRegistry();
      registry.registerFrameworkPlugin({
        manifest: { name: 'counted', version: '1.0.0', priority: 0 },
        detect: () => {
          detectCalls++;
          return true;
        },
        registerSchema: () => ({}),
      });

      registry.getActiveFrameworkPlugins(ctxFor('/projects/a'));
      registry.getActiveFrameworkPlugins(ctxFor('/projects/b'));
      expect(detectCalls).toBe(2);
      // Cached: no more detect calls.
      registry.getActiveFrameworkPlugins(ctxFor('/projects/a'));
      registry.getActiveFrameworkPlugins(ctxFor('/projects/b'));
      expect(detectCalls).toBe(2);

      registry.clearCaches();
      registry.getActiveFrameworkPlugins(ctxFor('/projects/a'));
      registry.getActiveFrameworkPlugins(ctxFor('/projects/b'));
      expect(detectCalls).toBe(4);
    });

    describe('shared defaults registry over real project dirs', () => {
      let tmpHome = '';
      afterEach(() => {
        if (tmpHome) rmSync(tmpHome, { recursive: true, force: true });
        tmpHome = '';
      });

      const setupMixedRoots = () => {
        tmpHome = mkdtempSync(join(tmpdir(), 'trace-mcp-gh1441-'));
        const laravelRoot = join(tmpHome, 'laravel-app');
        const plainRoot = join(tmpHome, 'plain-app');
        mkdirSync(laravelRoot, { recursive: true });
        mkdirSync(plainRoot, { recursive: true });
        writeFileSync(
          join(laravelRoot, 'composer.json'),
          JSON.stringify({ require: { 'laravel/framework': '^11.0' } }),
          'utf-8',
        );
        writeFileSync(join(plainRoot, 'package.json'), JSON.stringify({}), 'utf-8');
        return { laravelRoot, plainRoot };
      };

      it.each([['laravel-first'], ['plain-first']])(
        'detects laravel only for the laravel root (%s query order)',
        (order) => {
          const { laravelRoot, plainRoot } = setupMixedRoots();
          const registry = PluginRegistry.createWithDefaults();
          const laravelCtx = buildProjectContext(laravelRoot);
          const plainCtx = buildProjectContext(plainRoot);

          const [firstCtx, secondCtx] =
            order === 'laravel-first' ? [laravelCtx, plainCtx] : [plainCtx, laravelCtx];
          const rFirst = registry.getActiveFrameworkPlugins(firstCtx);
          const rSecond = registry.getActiveFrameworkPlugins(secondCtx);
          expect(rFirst.isOk() && rSecond.isOk()).toBe(true);

          const names = (r: typeof rFirst) => r._unsafeUnwrap().map((p) => p.manifest.name);
          const laravelNames = names(order === 'laravel-first' ? rFirst : rSecond);
          const plainNames = names(order === 'laravel-first' ? rSecond : rFirst);
          expect(laravelNames).toContain('laravel');
          expect(plainNames).not.toContain('laravel');
        },
      );
    });
  });
});
