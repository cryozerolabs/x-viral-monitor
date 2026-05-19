// #45 popup redesign — Accordion (info architecture C) + minimal shadcn
// (path B). Pins the 4-section accordion structure + default-collapsed
// invariant + the new leaderboard-on-by-default decision.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const html   = readFileSync(resolve(repo, 'popup.html'), 'utf8');
const bridge = readFileSync(resolve(repo, 'bridge.js'),  'utf8');
const popup  = readFileSync(resolve(repo, 'popup.js'),   'utf8');

describe('#45 popup accordion (info-arch C + shadcn minimal)', () => {
  const REQUIRED_SECTIONS = [
    'acc-rate-filter',
    'acc-leaderboard',
    'acc-pro',
    'acc-other',
  ];

  it('declares exactly 4 accordion <details> sections', () => {
    for (const id of REQUIRED_SECTIONS) {
      expect(new RegExp(`<details[^>]*id="${id}"`).test(html),
        `popup.html must contain <details id="${id}">`
      ).toBe(true);
    }
    // Count must match — no extras / no fewer.
    const detailsCount = (html.match(/<details\b[^>]*class="acc"/g) || []).length;
    expect(detailsCount).toBe(REQUIRED_SECTIONS.length);
  });

  it('all accordion sections are default-collapsed (no open attribute)', () => {
    for (const id of REQUIRED_SECTIONS) {
      const tag = html.match(new RegExp(`<details[^>]*id="${id}"[^>]*>`))?.[0] || '';
      expect(/\bopen\b/.test(tag),
        `<details id="${id}"> must NOT have the 'open' attribute (must default collapsed)`
      ).toBe(false);
    }
  });

  it('keeps the existing IDs that popup.js + popup-pro.js + popup-rate-filter.js hook', () => {
    // popup-rate-filter.js renders into #rate-filter-section
    expect(/id="rate-filter-section"/.test(html)).toBe(true);
    // popup-pro.js renders into #xvm-pro-section
    expect(/id="xvm-pro-section"/.test(html)).toBe(true);
    // popup.js hooks (form / inputs / feature toggles)
    for (const id of ['settings-form', 'trending', 'viral', 'badge-style', 'reset',
                      'feat-leaderboard', 'feat-copy-md', 'feat-starchart',
                      'feat-bookmark-count', 'lb-count', 'lb-col-list',
                      'lb-reset-pos', 'lb-reset-msg',
                      'grok-template-select', 'grok-prompt', 'grok-prompt-save',
                      'grok-article-template-select', 'grok-article-prompt']) {
      expect(new RegExp(`id="${id}"`).test(html), `popup.html must keep id="${id}"`).toBe(true);
    }
  });

  it('dark shadcn theme tokens declared on :root', () => {
    expect(/--bg:\s*#020617/.test(html), 'slate-950 bg token').toBe(true);
    expect(/--surface:\s*#0f172a/.test(html), 'slate-900 surface token').toBe(true);
    expect(/--accent:\s*#06b6d4/.test(html), 'cyan-500 accent token').toBe(true);
  });

  it('accordion summaries use i18n keys (no hardcoded section titles)', () => {
    expect(/data-i18n="accRateFilter"/.test(html)).toBe(true);
    expect(/data-i18n="accLeaderboard"/.test(html)).toBe(true);
    expect(/data-i18n="accPro"/.test(html)).toBe(true);
    expect(/data-i18n="accOther"/.test(html)).toBe(true);
  });

  it('en + zh_CN locales declare the new accordion i18n keys', () => {
    const en = JSON.parse(readFileSync(resolve(repo, '_locales/en/messages.json'), 'utf8'));
    const zh = JSON.parse(readFileSync(resolve(repo, '_locales/zh_CN/messages.json'), 'utf8'));
    for (const key of ['accRateFilter', 'accRateFilterSub', 'accLeaderboard', 'accPro', 'accOther']) {
      expect(en[key]?.message, `en must declare ${key}`).toBeTruthy();
      expect(zh[key]?.message, `zh_CN must declare ${key}`).toBeTruthy();
    }
  });
});

describe('#45 leaderboard defaults to enabled (popup redesign)', () => {
  it('bridge.js DEFAULT_FEATURES.featureVelocityLeaderboard === true', () => {
    expect(/featureVelocityLeaderboard:\s*true/.test(bridge),
      'bridge.js must default featureVelocityLeaderboard to true'
    ).toBe(true);
  });
  it('popup.js DEFAULT featureVelocityLeaderboard === true (mirror)', () => {
    expect(/featureVelocityLeaderboard:\s*true/.test(popup),
      'popup.js must mirror featureVelocityLeaderboard default to true'
    ).toBe(true);
  });
});
