// #45 step 3 — popup UI contract tests.
// Pins the popup-pro wiring + the "still no Creem secret in code" invariant.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const html = readFileSync(resolve(repo, 'popup.html'), 'utf8');
const js   = readFileSync(resolve(repo, 'src/premium/license/popup-pro.js'), 'utf8');

describe('#45 step 3 — popup pro UI', () => {
  it('popup.html includes the pro section + script', () => {
    expect(/id="xvm-pro-section"/.test(html),
      'popup.html must include <section id="xvm-pro-section">'
    ).toBe(true);
    expect(/<script\s+src="src\/premium\/license\/popup-pro\.js"/.test(html),
      'popup.html must load src/premium/license/popup-pro.js'
    ).toBe(true);
  });

  it('popup-pro.js contains NO Creem API key literal', () => {
    expect(/creem_(?:live|test)_[A-Za-z0-9]/.test(js),
      'popup-pro.js must not embed a Creem API key'
    ).toBe(false);
  });

  it('popup-pro.js never calls api.creem.io directly', () => {
    expect(/api\.creem\.io/.test(js),
      'popup-pro.js must call the Worker proxy, not Creem directly'
    ).toBe(false);
  });

  it('popup-pro.js still uses the __XVM_LICENSE_WORKER__ placeholder', () => {
    expect(/__XVM_LICENSE_WORKER__/.test(js),
      'popup-pro.js must keep the build-time placeholder until DEPLOY.md substitution'
    ).toBe(true);
  });

  it('popup-pro.js mirrors RECHECK_INTERVAL_MS / OFFLINE_GRACE_MS / TRIAL_DAYS', () => {
    // Mirrors are intentional duplicates with isolated.js for the popup
    // context. Drift between popup and isolated would create a "tier
    // inconsistency" UX bug. If you change one, change both — and these
    // tests will fail until you do.
    expect(/RECHECK_INTERVAL_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(js),
      'popup-pro.js must declare RECHECK_INTERVAL_MS = 24h'
    ).toBe(true);
    expect(/OFFLINE_GRACE_MS\s*=\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(js),
      'popup-pro.js must declare OFFLINE_GRACE_MS = 7d'
    ).toBe(true);
    expect(/TRIAL_DAYS\s*=\s*14/.test(js),
      'popup-pro.js must declare TRIAL_DAYS = 14'
    ).toBe(true);
  });

  it('popup-pro.js wires both Creem payment URLs', () => {
    expect(/prod_7f7t9EHK3RJlOK37DWr7J/.test(js),
      'popup-pro.js must reference Monthly product (prod_7f7...)'
    ).toBe(true);
    expect(/prod_69yTiXGXb04DKm46DNVbN9/.test(js),
      'popup-pro.js must reference Annual product (prod_69y...)'
    ).toBe(true);
  });

  it('popup-pro.js masks license keys', () => {
    expect(/maskKey/.test(js),
      'popup-pro.js must mask license keys for display'
    ).toBe(true);
  });

  it('popup-pro.js handles tier-trial-nearing-end nudge (≤ 3 days)', () => {
    expect(/days\s*<=\s*3/.test(js),
      'popup-pro.js must show a nudge when daysLeft ≤ 3'
    ).toBe(true);
  });
});
