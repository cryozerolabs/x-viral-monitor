// === XVM Pro popup wiring (popup context) ===
//
// Renders the tier banner + license activation/management section in the
// extension popup. Popup runs in extension context so it has direct
// chrome.storage + fetch access — but we keep tier resolution logic
// IDENTICAL to src/premium/license/isolated.js to maintain the ADR-0004
// "single tier resolution path" invariant in spirit (any future change to
// tier rules must be made in BOTH places, which the license-slice tests
// will catch via duplicated invariant assertions).
//
// Buy URLs (Creem checkout). Live mode product IDs locked 2026-05-19 #45:
//   Monthly $9 — prod_7f7t9EHK3RJlOK37DWr7J
//   Annual  $90 — prod_69yTiXGXb04DKm46DNVbN9

(() => {
  const LICENSE_PROXY_URL = '__XVM_LICENSE_WORKER__';
  const BUY_URL_MONTHLY = 'https://www.creem.io/payment/prod_7f7t9EHK3RJlOK37DWr7J';
  const BUY_URL_ANNUAL  = 'https://www.creem.io/payment/prod_69yTiXGXb04DKm46DNVbN9';

  const TRIAL_DAYS = 14;
  const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
  const STORAGE_KEY = 'xvm_license_v1';
  const TRIAL_KEY = 'xvm_trial_v1';
  const KEY_RE = /^[A-Za-z0-9_\-]{8,128}$/;

  // ─── chrome.storage promises ────────────────────────────────────────
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

  // ─── Tier resolver (mirror of isolated.js — same invariants) ────────
  function trialStatus(rec) {
    if (!rec || !Number.isFinite(rec.startAt)) return { isTrialing: false, daysLeft: 0 };
    const msLeft = TRIAL_MS - (Date.now() - rec.startAt);
    if (msLeft <= 0) return { isTrialing: false, daysLeft: 0 };
    return { isTrialing: true, daysLeft: Math.ceil(msLeft / 86400000) };
  }
  async function getLicenseStatus() {
    const stored = await storageGet(STORAGE_KEY, null);
    if (!stored?.key || !stored?.instanceId) return { tier: 'free', record: null, source: 'none' };
    const sinceCheck = Date.now() - (stored.lastChecked || 0);
    if (stored.status && stored.status !== 'active') return { tier: 'free', record: stored, source: 'expired' };
    if (sinceCheck <= RECHECK_INTERVAL_MS) return { tier: 'pro', record: stored, source: 'cached' };
    if (sinceCheck > OFFLINE_GRACE_MS) return { tier: 'free', record: stored, source: 'expired' };
    return { tier: 'pro', record: stored, source: 'offline-grace' };
  }
  async function resolveTier() {
    const lic = await getLicenseStatus();
    if (lic.tier === 'pro') return { tier: 'pro', daysLeft: 0, source: lic.source, record: lic.record };
    const trial = await storageGet(TRIAL_KEY, null);
    const t = trialStatus(trial);
    if (t.isTrialing) return { tier: 'trial', daysLeft: t.daysLeft, source: 'trial', record: lic.record };
    return { tier: 'free', daysLeft: 0, source: 'none', record: lic.record };
  }

  // ─── Activate via Worker proxy ──────────────────────────────────────
  async function activate(rawKey) {
    const key = String(rawKey || '').trim();
    if (!KEY_RE.test(key)) return { ok: false, error: 'invalid_format' };
    if (LICENSE_PROXY_URL === '__XVM_LICENSE_WORKER__') {
      return { ok: false, error: 'worker_url_unset' };
    }
    let deviceId = await storageGet('xvm_device_id', null);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await storageSet({ xvm_device_id: deviceId });
    }
    let envelope;
    try {
      const res = await fetch(`${LICENSE_PROXY_URL}/activate`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, instance_name: `Popup — ${deviceId.slice(0, 8)}` }),
      });
      envelope = await res.json();
    } catch (e) {
      return { ok: false, error: 'network', message: String(e?.message || e) };
    }
    if (!envelope?.ok) return { ok: false, error: 'activation_failed', detail: envelope };
    const data = envelope.data || {};
    const inst = data.instance || {};
    const record = {
      key, instanceId: inst.id || null, instanceName: inst.name || null,
      deviceId, activatedAt: Date.now(), lastChecked: Date.now(), lastTriedAt: Date.now(),
      status: data.status || 'active',
      activationLimit: data.activation_limit ?? null,
      activationUsage: data.activation ?? null,
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : null,
      productId: data.product_id || null,
    };
    await storageSet({ [STORAGE_KEY]: record });
    return { ok: true, record };
  }

  async function deactivate() {
    const stored = await storageGet(STORAGE_KEY, null);
    if (!stored?.key) return { ok: true };
    if (LICENSE_PROXY_URL !== '__XVM_LICENSE_WORKER__' && stored.instanceId) {
      try {
        await fetch(`${LICENSE_PROXY_URL}/deactivate`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: stored.key, instance_id: stored.instanceId }),
        });
      } catch (_) {}
    }
    await new Promise((r) => chrome.storage.local.remove(STORAGE_KEY, r));
    return { ok: true };
  }

  // ─── Mask license key for display ───────────────────────────────────
  function maskKey(k) {
    if (!k) return '';
    if (k.length <= 8) return '••••••••';
    return `${k.slice(0, 4)}••••${k.slice(-4)}`;
  }

  // ─── Render ─────────────────────────────────────────────────────────
  function render(container, info) {
    const tier = info.tier;
    const days = info.daysLeft;
    container.dataset.tier = tier;
    container.innerHTML = '';

    // Tier banner
    const banner = document.createElement('div');
    banner.className = 'xvm-pro-banner';
    let tierLabel, tierIcon;
    if (tier === 'pro')        { tierLabel = 'Pro'; tierIcon = '✨'; }
    else if (tier === 'trial') { tierLabel = `Trial — ${days} day${days === 1 ? '' : 's'} left`; tierIcon = '⏳'; }
    else                       { tierLabel = 'Free'; tierIcon = '🌱'; }
    banner.innerHTML = `<span class="xvm-pro-icon">${tierIcon}</span> <span class="xvm-pro-tier">${tierLabel}</span>`;
    container.appendChild(banner);

    // Trial-ending nudge (≤ 3 days)
    if (tier === 'trial' && days <= 3) {
      const nudge = document.createElement('div');
      nudge.className = 'xvm-pro-nudge';
      nudge.textContent = `Your trial ends in ${days} day${days === 1 ? '' : 's'}. Upgrade to keep Pro features.`;
      container.appendChild(nudge);
    }

    // Free / Trial → Upgrade CTAs
    if (tier !== 'pro') {
      const cta = document.createElement('div');
      cta.className = 'xvm-pro-cta';
      const m = document.createElement('a');
      m.className = 'xvm-pro-btn'; m.href = BUY_URL_MONTHLY; m.target = '_blank'; m.rel = 'noopener';
      m.textContent = 'Monthly · $9';
      const a = document.createElement('a');
      a.className = 'xvm-pro-btn xvm-pro-btn-primary'; a.href = BUY_URL_ANNUAL; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Annual · $90 (save 17%)';
      cta.append(m, a);
      container.appendChild(cta);

      // Activation form
      const form = document.createElement('div');
      form.className = 'xvm-pro-activate';
      form.innerHTML = `
        <label class="xvm-pro-act-label">Already bought? Enter your license key:</label>
        <div class="xvm-pro-act-row">
          <input type="text" id="xvm-pro-key" placeholder="creem-XXXXX..." autocomplete="off" />
          <button type="button" id="xvm-pro-activate">Activate</button>
        </div>
        <div class="xvm-pro-msg" id="xvm-pro-msg"></div>
      `;
      container.appendChild(form);

      form.querySelector('#xvm-pro-activate').addEventListener('click', async () => {
        const keyInput = form.querySelector('#xvm-pro-key');
        const msg = form.querySelector('#xvm-pro-msg');
        const btn = form.querySelector('#xvm-pro-activate');
        const key = keyInput.value.trim();
        if (!KEY_RE.test(key)) {
          msg.textContent = 'License key format is invalid.';
          msg.dataset.kind = 'err';
          return;
        }
        btn.disabled = true; btn.textContent = 'Activating…';
        const res = await activate(key);
        btn.disabled = false; btn.textContent = 'Activate';
        if (res.ok) {
          msg.textContent = 'License activated. Reload x.com to apply.';
          msg.dataset.kind = 'ok';
          refresh();
        } else if (res.error === 'worker_url_unset') {
          msg.textContent = 'License proxy not configured yet — contact support.';
          msg.dataset.kind = 'err';
        } else {
          msg.textContent = `Activation failed: ${res.error}${res.message ? ' — ' + res.message : ''}`;
          msg.dataset.kind = 'err';
        }
      });
    } else {
      // Pro: show masked key + deactivate
      const rec = info.record || {};
      const box = document.createElement('div');
      box.className = 'xvm-pro-licbox';
      box.innerHTML = `
        <div class="xvm-pro-licrow"><span>License</span><code>${maskKey(rec.key)}</code></div>
        <div class="xvm-pro-licrow"><span>Activated</span><span>${rec.activatedAt ? new Date(rec.activatedAt).toLocaleDateString() : '—'}</span></div>
        ${rec.expiresAt ? `<div class="xvm-pro-licrow"><span>Renews</span><span>${new Date(rec.expiresAt).toLocaleDateString()}</span></div>` : ''}
        <div class="xvm-pro-act-row">
          <a class="xvm-pro-btn" href="https://www.creem.io/dashboard" target="_blank" rel="noopener">Manage subscription</a>
          <button type="button" id="xvm-pro-deactivate" class="xvm-pro-btn-ghost">Deactivate</button>
        </div>
        <div class="xvm-pro-msg" id="xvm-pro-msg"></div>
      `;
      container.appendChild(box);
      box.querySelector('#xvm-pro-deactivate').addEventListener('click', async () => {
        const msg = box.querySelector('#xvm-pro-msg');
        msg.textContent = 'Deactivating…';
        const res = await deactivate();
        msg.textContent = res.ok ? 'Deactivated.' : 'Deactivation failed.';
        msg.dataset.kind = res.ok ? 'ok' : 'err';
        refresh();
      });
    }
  }

  async function refresh() {
    const container = document.getElementById('xvm-pro-section');
    if (!container) return;
    const info = await resolveTier();
    render(container, info);
  }

  // Re-render on storage changes (license activate/deactivate from elsewhere)
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (STORAGE_KEY in changes || TRIAL_KEY in changes) refresh();
    });
  } catch (_) {}

  // Seed trial in popup context too (defensive — isolated.js does this on
  // any x.com page load, but popup may open before user visits x.com on a
  // fresh install).
  (async () => {
    const rec = await storageGet(TRIAL_KEY, null);
    if (!rec || !Number.isFinite(rec.startAt)) {
      await storageSet({ [TRIAL_KEY]: { startAt: Date.now() } });
    }
    refresh();
  })();

  // Expose for popup.js if it wants to manually trigger refresh.
  window.__xvmProPopup = { refresh, resolveTier };
})();
