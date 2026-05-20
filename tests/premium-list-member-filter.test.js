// #60 Pro M2 PoC — X List member filter wiring and runtime contracts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const gate = readFileSync(resolve(repo, 'src/premium/license/gate.js'), 'utf8');
const bridge = readFileSync(resolve(repo, 'bridge.js'), 'utf8');
const filter = readFileSync(resolve(repo, 'src/premium/list-member-filter/filter.js'), 'utf8');
const popup = readFileSync(resolve(repo, 'src/premium/list-member-filter/popup-list-member-filter.js'), 'utf8');
const html = readFileSync(resolve(repo, 'popup.html'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(repo, 'manifest.json'), 'utf8'));

describe('#60 Pro M2 — X List member filter PoC', () => {
  it('declares list-member-filter as a gated Trial/Pro feature', () => {
    expect(/['"]list-member-filter['"]\s*:\s*['"]trial['"]/.test(gate),
      'gate.js FEATURE_TIER must include list-member-filter as trial/pro'
    ).toBe(true);
    expect(filter).toMatch(/__xvmPro\?\.isFeatureEnabled\(['"]list-member-filter['"]\)/);
  });

  it('loads MAIN-world runtime after gate/rate-filter and before content.js', () => {
    const main = manifest.content_scripts.find((cs) => cs.world === 'MAIN');
    expect(main).toBeTruthy();
    const order = main.js;
    const gIdx = order.indexOf('src/premium/license/gate.js');
    const rfIdx = order.indexOf('src/premium/rate-filter/filter.js');
    const lfIdx = order.indexOf('src/premium/list-member-filter/filter.js');
    const cIdx = order.indexOf('content.js');
    expect(lfIdx).toBeGreaterThan(gIdx);
    expect(lfIdx).toBeGreaterThan(rfIdx);
    expect(lfIdx).toBeLessThan(cIdx);
  });

  it('uses an independent storage key, message bus, and hide marker', () => {
    expect(filter).toMatch(/STORAGE_KEY\s*=\s*['"]xvm_list_member_filter_v1['"]/);
    expect(filter).toMatch(/HIDE_ATTR\s*=\s*['"]data-xvm-list-member-hidden['"]/);
    expect(filter).toMatch(/XVM_LIST_MEMBER_FILTER_REQUEST/);
    expect(filter).toMatch(/XVM_LIST_MEMBER_FILTER_UPDATE/);
    expect(bridge).toMatch(/XVM_LIST_MEMBER_FILTER_REQUEST/);
    expect(bridge).not.toMatch(/XVM_LIST_MEMBER_FILTER_SET/);
    expect(bridge).toMatch(/xvm_list_member_filter_v1/);
  });

  it('pins cache contract fields for list metadata, members, ttl, and lastError', () => {
    for (const token of ['listId', 'url', 'name', 'screenName', 'members', 'userId', 'fetchedAt', 'ttlMs', 'lastError']) {
      expect(filter, `filter.js must preserve ${token}`).toMatch(new RegExp(`\\b${token}\\b`));
    }
  });

  it('filters current tweets by reply/tweet author from status links', () => {
    expect(filter).toMatch(/articleAuthor/);
    expect(filter).toMatch(/querySelectorAll\?\.\(['"]a\[href\*="\/status\/"\]['"]\)/);
    expect(filter).toMatch(/href\.match\(\s*\/\^\\\/\(\[\^\/\?#\]\+\)\\\/status\\\/\\d\+/);
    expect(filter).toMatch(/members\.handles\.has\(handle\)/);
  });

  it('hides the cellInnerDiv ancestor and restores only when no other XVM marker remains', () => {
    expect(filter).toMatch(/closest\(['"]\[data-testid="cellInnerDiv"\]['"]\)/);
    expect(filter).not.toMatch(/art\.style\.display\s*=\s*['"]none['"]/);
    expect(filter).toMatch(/querySelectorAll\(`article\[\$\{HIDE_ATTR\}\]`\)/);
    expect(filter).toMatch(/removeAttribute\(HIDE_ATTR\)/);
    expect(filter).toMatch(/OTHER_HIDE_ATTRS\s*=\s*\[['"]data-xvm-rate-hidden['"]\]/);
    expect(filter).toMatch(/hasOtherXvmHideMarker/);
    expect(filter).toMatch(/restoreCellIfNoOtherXvmMarker/);
    expect(filter).toMatch(/if\s*\(\s*!\s*hasOtherXvmHideMarker\(art\)\s*\)\s*cell\.style\.display\s*=\s*['"]['"]/);
  });

  it('keeps scope hooks for Home/List/Profile/Status detail', () => {
    expect(filter).toMatch(/getScopeFromPath/);
    for (const scope of ['home', 'list', 'profile', 'status']) {
      expect(filter).toMatch(new RegExp(`\\b${scope}:\\s*true\\b`));
    }
    expect(filter).toMatch(/\/\^\\\/i\\\/lists\\\//);
    expect(filter).toMatch(/\/\^\\\/\[\^\/\]\+\\\/status\\\/\\d\+/);
  });

  it('runtime revokes on feature OFF, no members, scope mismatch, or tier downgrade', () => {
    expect(filter).toMatch(/!\s*gateOpen\(\)\s*\|\|\s*!\s*SETTINGS\.enabled\s*\|\|\s*!\s*scopeAllowed\(\)/);
    expect(filter).toMatch(/!\s*members\.handles\.size\s*&&\s*!\s*members\.userIds\.size/);
    expect(filter).toMatch(/__xvmPro\?\.onTierChange\?\./);
    expect(filter).toMatch(/revoke\(\)/);
  });

  it('bridge live-syncs chrome.storage.local changes into MAIN world', () => {
    expect(bridge).toMatch(/areaName\s*===\s*['"]local['"]/);
    expect(bridge).toMatch(/changes\.xvm_list_member_filter_v1/);
    expect(bridge).toMatch(/XVM_LIST_MEMBER_FILTER_UPDATE/);
  });

  it('does not expose a page postMessage path that writes list-member storage', () => {
    expect(bridge).not.toMatch(/XVM_LIST_MEMBER_FILTER_SET/);
    expect(bridge).not.toMatch(/chrome\.storage\.local\.set\(\s*\{\s*\[LF_KEY\]/);
  });

  it('adds a popup Filter-tab entry without touching the leaderboard top', () => {
    const filterPanel = html.match(/data-tab-panel="filter"[\s\S]*?(?=<\/section>)/)?.[0] || '';
    const leaderboardPanel = html.match(/data-tab-panel="leaderboard"[\s\S]*?(?=<section role="tabpanel")/)?.[0] || '';
    expect(filterPanel).toMatch(/id="list-member-filter-section"/);
    expect(leaderboardPanel).not.toMatch(/list-member-filter-section|lf-/);
    expect(html).toMatch(/src\/premium\/list-member-filter\/popup-list-member-filter\.js/);
  });

  it('popup owns list-member storage, parses URL/listId input, and uses Pro lock', () => {
    expect(popup).toMatch(/STORAGE_KEY\s*=\s*['"]xvm_list_member_filter_v1['"]/);
    expect(popup).toMatch(/parseListInput/);
    expect(popup).toContain('x\\.com|twitter\\.com');
    expect(popup).toContain('/i\\/lists\\/');
    expect(popup).toMatch(/__xvmTierLogic/);
    expect(popup).toMatch(/tier\s*===\s*['"]free['"]/);
    expect(popup).toMatch(/chrome\.storage\.local\.set/);
  });

  it('popup i18n keys exist in all shipped locales', () => {
    const keys = ['lfTitle', 'lfLockedHint', 'lfEnabled', 'lfInputLabel', 'lfAdd', 'lfCaptureHint', 'lfInvalidInput', 'lfAddedOk', 'lfMembers'];
    for (const locale of ['en', 'zh_CN', 'ja']) {
      const messages = JSON.parse(readFileSync(resolve(repo, `_locales/${locale}/messages.json`), 'utf8'));
      for (const key of keys) {
        expect(messages[key]?.message, `${locale} must include ${key}`).toBeTruthy();
      }
    }
  });
});
