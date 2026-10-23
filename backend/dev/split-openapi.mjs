// Splits the generated backend spec into the dev spec (everything not flagged `x-external`) and the external spec
// (only the flagged operations/schemas plus everything they reference).
// Usage: node dev/split-openapi.mjs <dev-spec.json> <external-spec.json>
import { readFileSync, writeFileSync } from 'node:fs';

const FLAG = 'x-external';
const [devFile, externalFile] = process.argv.slice(2);
if (!devFile || !externalFile) {
  console.error('usage: node dev/split-openapi.mjs <dev-spec.json> <external-spec.json>');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(devFile, 'utf8'));
const escape = (key) => encodeURIComponent(String(key).replaceAll('~', '~0').replaceAll('/', '~1'));
const unescape = (segment) => decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~');

/** Calls `callback(parent, key, path)` for every property (depth first, pre-order) as JSON pointer `#/a/b`. */
const walk = (node, callback, path = '#') => {
  for (const key of Object.keys(node)) {
    const childPath = `${path}/${escape(key)}`;
    callback(node, key, childPath);
    const child = node[key];
    if (child !== null && typeof child === 'object') {
      walk(child, callback, childPath);
    }
  }
};

const get = (root, pointer) => {
  let node = root;
  for (const segment of pointer.split('/').slice(1).map(unescape)) {
    if (node === null || typeof node !== 'object' || !(segment in node)) return undefined;
    node = node[segment];
  }
  return node;
};

/** Sets the value at `pointer`, creating missing objects on the way. */
const set = (root, pointer, value) => {
  const segments = pointer.split('/').slice(1).map(unescape);
  let node = root;
  for (const segment of segments.slice(0, -1)) {
    node[segment] ??= {};
    node = node[segment];
  }
  node[segments.at(-1)] = value;
};

// Move all flagged objects from `dev` to `external` (same location).
const dev = structuredClone(spec);
const external = {};
const removedPaths = [];
walk(dev, (parent, key, path) => {
  if (parent[key]?.[FLAG]) {
    if (Array.isArray(parent)) {
      const arrayPath = path.slice(0, path.lastIndexOf('/'));
      if (get(external, arrayPath) === undefined) set(external, arrayPath, []);
    }
    set(external, path, structuredClone(parent[key]));
    removedPaths.push(path);
    delete parent[key];
  }
});
const compactArrays = (root) =>
  walk(root, (parent, key) => {
    if (Array.isArray(parent[key])) parent[key] = parent[key].filter((e) => e !== undefined);
  });
compactArrays(dev);
compactArrays(external);

// dev: drop `$ref`s to removed objects in arrays and paths without any operation left
walk(dev, (parent) => {
  if (Array.isArray(parent)) {
    for (let i = parent.length - 1; i >= 0; i--) {
      if (removedPaths.includes(parent[i]?.$ref)) parent.splice(i, 1);
    }
  }
});
for (const path of Object.keys(dev.paths ?? {})) {
  if (Object.keys(dev.paths[path]).length === 0) delete dev.paths[path];
}

// external: pull in everything referenced (transitively) so the spec is valid on its own
let changed = true;
while (changed) {
  changed = false;
  walk(external, (parent, key) => {
    const ref = parent[key];
    if (key === '$ref' && typeof ref === 'string' && ref.startsWith('#') && !get(external, ref)) {
      set(external, ref, get(spec, ref));
      changed = true;
    }
  });
}
const result = {
  openapi: spec.openapi,
  info: { ...external.info, title: spec.info.title, version: spec.info.version },
  ...external,
};
if (!result.security && Array.isArray(spec.security)) {
  const schemes = Object.keys(result.components?.securitySchemes ?? {});
  result.security = spec.security
    .map((req) => Object.fromEntries(Object.entries(req).filter(([name]) => schemes.includes(name))))
    .filter((req) => Object.keys(req).length > 0);
}
result.paths ??= {};

writeFileSync(externalFile, JSON.stringify(result, null, 2));
writeFileSync(devFile, JSON.stringify(dev, null, 2));
