// === X List member filter settings (popup context) ===
//
// Minimal M2 PoC entry. It persists list metadata/cache placeholders to
// chrome.storage.local; MAIN-world filter.js consumes the same key.

(function () {
  const STORAGE_KEY = 'xvm_list_member_filter_v1';
  const DEFAULTS = {
    enabled: false,
    ttlMs: 24 * 60 * 60 * 1000,
    scopes: { home: true, list: true, profile: true, status: true },
    lists: [],
  };

  function t(key, ...subs) {
    try {
      const v = chrome?.i18n?.getMessage?.(key, subs.length ? subs.map(String) : undefined);
      if (v) return v;
    } catch (_) {}
    return key;
  }

  function storageGet(key, fallback) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(key, (o) => resolve(o?.[key] ?? fallback)); }
      catch (_) { resolve(fallback); }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      try { chrome.storage.local.set(obj, resolve); }
      catch (_) { resolve(); }
    });
  }

  function normalize(raw) {
    const out = { ...DEFAULTS, scopes: { ...DEFAULTS.scopes }, lists: [] };
    if (!raw || typeof raw !== 'object') return out;
    out.enabled = raw.enabled === true;
    out.ttlMs = Number.isFinite(raw.ttlMs) ? raw.ttlMs : DEFAULTS.ttlMs;
    if (raw.scopes && typeof raw.scopes === 'object') {
      out.scopes = {
        home: raw.scopes.home !== false,
        list: raw.scopes.list !== false,
        profile: raw.scopes.profile !== false,
        status: raw.scopes.status !== false,
      };
    }
    if (Array.isArray(raw.lists)) {
      out.lists = raw.lists.map(normalizeList).filter(Boolean);
    }
    return out;
  }

  function normalizeList(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const listId = String(raw.listId || raw.id || '').trim();
    const url = String(raw.url || '').trim();
    if (!listId && !url) return null;
    return {
      listId,
      url,
      name: String(raw.name || listId || url).trim(),
      screenName: String(raw.screenName || raw.ownerScreenName || '').trim().replace(/^@+/, '').toLowerCase(),
      enabled: raw.enabled !== false,
      members: Array.isArray(raw.members) ? raw.members : [],
      fetchedAt: Number.isFinite(raw.fetchedAt) ? raw.fetchedAt : 0,
      ttlMs: Number.isFinite(raw.ttlMs) ? raw.ttlMs : DEFAULTS.ttlMs,
      lastError: raw.lastError ? String(raw.lastError) : '',
    };
  }

  function parseListInput(raw) {
    const input = String(raw || '').trim();
    if (!input) return null;
    const numeric = input.match(/^\d+$/)?.[0] || '';
    const idFromUrl = input.match(/(?:x\.com|twitter\.com)\/i\/lists\/(\d+)/i)?.[1]
      || input.match(/\/lists\/(\d+)(?:[/?#]|$)/i)?.[1]
      || numeric;
    if (!idFromUrl && !/^https?:\/\//i.test(input)) return null;
    return {
      listId: idFromUrl,
      url: /^https?:\/\//i.test(input) ? input : (idFromUrl ? `https://x.com/i/lists/${idFromUrl}` : input),
      name: idFromUrl ? `List ${idFromUrl}` : input,
      enabled: true,
      members: [],
      fetchedAt: 0,
      ttlMs: DEFAULTS.ttlMs,
      lastError: t('lfCaptureHint'),
    };
  }

  async function resolveTier() {
    const TL = globalThis.__xvmTierLogic;
    if (!TL) return { tier: 'free', daysLeft: 0, source: 'tier-logic-missing' };
    const lic = await storageGet('xvm_license_v1', null);
    const trial = await storageGet('xvm_trial_v1', null);
    return TL.resolveTierFrom(lic, trial, Date.now());
  }

  function buildSection() {
    const section = document.getElementById('list-member-filter-section');
    if (!section) return null;
    section.innerHTML = `
      <h2 class="rf-title" data-k="lfTitle"></h2>
      <p class="rf-locked-hint" id="lf-locked-hint" data-k="lfLockedHint" hidden></p>
      <label class="rf-toggle">
        <span data-k="lfEnabled"></span>
        <span class="switch">
          <input type="checkbox" id="lf-enabled" />
          <span class="slider"></span>
        </span>
      </label>
      <label class="rf-row" for="lf-list-input">
        <span data-k="lfInputLabel"></span>
        <input id="lf-list-input" type="text" placeholder="https://x.com/i/lists/1234567890" />
      </label>
      <div class="rf-actions">
        <button type="button" id="lf-add" class="rf-btn" data-k="lfAdd"></button>
        <button type="button" id="lf-save" class="rf-btn-ghost" data-k="rfSave"></button>
      </div>
      <p class="rf-rule-hint" data-k="lfCaptureHint"></p>
      <ul id="lf-list" class="col-list" aria-live="polite"></ul>
      <div class="rf-msg" id="lf-msg"></div>
    `;
    section.querySelectorAll('[data-k]').forEach((el) => { el.textContent = t(el.dataset.k); });
    return section;
  }

  function renderList(section, settings) {
    const ul = section.querySelector('#lf-list');
    ul.innerHTML = '';
    for (const list of settings.lists) {
      const li = document.createElement('li');
      li.textContent = `${list.name || list.listId || list.url} · ${list.members.length} ${t('lfMembers')}`;
      if (list.lastError) li.title = list.lastError;
      ul.appendChild(li);
    }
  }

  function setLocked(section, locked) {
    section.dataset.locked = locked ? '1' : '0';
    for (const el of section.querySelectorAll('input, button')) el.disabled = !!locked;
    const hint = section.querySelector('#lf-locked-hint');
    if (hint) hint.hidden = !locked;
  }

  async function mount() {
    const section = buildSection();
    if (!section) return;
    let settings = normalize(await storageGet(STORAGE_KEY, DEFAULTS));
    section.querySelector('#lf-enabled').checked = settings.enabled;
    renderList(section, settings);

    const { tier } = await resolveTier();
    setLocked(section, tier === 'free');

    section.querySelector('#lf-add').addEventListener('click', async () => {
      const msg = section.querySelector('#lf-msg');
      const parsed = parseListInput(section.querySelector('#lf-list-input').value);
      if (!parsed) {
        msg.textContent = t('lfInvalidInput');
        msg.dataset.kind = 'err';
        return;
      }
      settings = normalize({
        ...settings,
        lists: [...settings.lists.filter((l) => l.listId !== parsed.listId || !parsed.listId), parsed],
      });
      section.querySelector('#lf-list-input').value = '';
      renderList(section, settings);
      await storageSet({ [STORAGE_KEY]: settings });
      msg.textContent = t('lfAddedOk');
      msg.dataset.kind = 'ok';
    });

    section.querySelector('#lf-save').addEventListener('click', async () => {
      settings = normalize({ ...settings, enabled: section.querySelector('#lf-enabled').checked });
      await storageSet({ [STORAGE_KEY]: settings });
      const msg = section.querySelector('#lf-msg');
      msg.textContent = t('rfSavedOk');
      msg.dataset.kind = 'ok';
    });

    try {
      chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area !== 'local') return;
        if ('xvm_license_v1' in changes || 'xvm_trial_v1' in changes) {
          const r = await resolveTier();
          setLocked(section, r.tier === 'free');
        }
        if (STORAGE_KEY in changes) {
          settings = normalize(changes[STORAGE_KEY].newValue);
          section.querySelector('#lf-enabled').checked = settings.enabled;
          renderList(section, settings);
        }
      });
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', mount);
  window.__xvmListMemberFilterPopup = { STORAGE_KEY, DEFAULTS, mount, parseListInput };
})();
