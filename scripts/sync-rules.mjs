#!/usr/bin/env node
// Generate src/premium/content-filter/rules.js from bootstrap-rules.json so
// the MAIN-world cold-start fallback stays intentionally small. The full
// rules.json is fetched remotely at runtime and can change without a rebuild.
//
// Usage: node scripts/sync-rules.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = resolve(root, 'src/premium/content-filter/bootstrap-rules.json');
const jsPath = resolve(root, 'src/premium/content-filter/rules.js');

const rules = JSON.parse(readFileSync(jsonPath, 'utf8'));
const body = JSON.stringify(rules, null, 2);

const out = `// AUTO-GENERATED from bootstrap-rules.json by scripts/sync-rules.mjs — do not edit.
//
// Minimal bootstrap fallback for the MAIN-world content filter. Remote
// rules fetched by isolated.js override this at runtime via
// XVM_CONTENT_FILTER_RULES_UPDATE.
(function () {
  window.__xvmContentFilterBuiltinRules = ${body};
})();
`;

writeFileSync(jsPath, out);
console.log('[sync-rules] regenerated', jsPath);
