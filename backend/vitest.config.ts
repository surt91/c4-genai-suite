import ts from 'typescript';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Compiles the TypeScript files with the TypeScript compiler (one program for the whole project) like `nest build`.
 *
 * Transpile-only compilers (vite's default oxc, swc, esbuild) do not work for this code base: without type information
 * they emit different decorator metadata (e.g. `Object` instead of `String` for string union types, which breaks the
 * TypeORM column types) and keep imports of interfaces, which creates import cycles.
 */
function typescript(): Plugin {
  const configFile = ts.findConfigFile(import.meta.dirname, (file) => ts.sys.fileExists(file))!;
  const config: unknown = ts.readConfigFile(configFile, (file) => ts.sys.readFile(file)).config;
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, import.meta.dirname);
  const options: ts.CompilerOptions = {
    ...parsed.options,
    incremental: false,
    declaration: false,
    sourceMap: true,
    inlineSources: true,
    noEmit: false,
  };
  let program: ts.Program | undefined;

  return {
    name: 'typescript',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.ts') || file.includes('/node_modules/')) {
        return undefined;
      }
      // (re)create the program when a file is new or has been changed (watch mode), reusing the unchanged files
      if (program?.getSourceFile(file)?.text !== code) {
        const rootNames = [...new Set([...parsed.fileNames, ...(program?.getRootFileNames() ?? []), file])];
        program = ts.createProgram({ rootNames, options, oldProgram: program });
      }
      let output = '';
      let map: string | undefined;
      program.emit(program.getSourceFile(file), (name, text) => {
        if (name.endsWith('.js')) {
          output = text.replace(/\n\/\/# sourceMappingURL=.*$/, '');
        } else if (name.endsWith('.js.map')) {
          map = text;
        }
      });
      return { code: output, map };
    },
  };
}

export default defineConfig({
  plugins: [typescript()],
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'Unit Tests',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.e2e.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'E2E Tests',
          include: ['src/**/*.e2e.spec.ts'],
          globalSetup: ['./vitest.setup.e2e.ts'],
          setupFiles: ['./vitest.setup-db.e2e.ts'],
        },
      },
    ],
  },
});
