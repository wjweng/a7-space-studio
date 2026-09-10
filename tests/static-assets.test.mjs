import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

const dist = resolve('dist');

test('vendored Three.js module only imports files included in dist', () => {
  const modulePath = resolve(dist, 'vendor/three.module.js');
  const source = readFileSync(modulePath, 'utf8');
  const specifiers = [...source.matchAll(/\bfrom\s*["'](\.\.?\/[^"']+)["']/g)]
    .map((match) => match[1]);

  assert.ok(specifiers.length > 0, 'expected Three.js to contain relative imports');
  for (const specifier of new Set(specifiers)) {
    const dependency = resolve(dirname(modulePath), specifier);
    assert.ok(existsSync(dependency), `missing static module dependency: ${specifier}`);
  }
});

