/* Habuild prototype analytics — Mixpanel
   Project: User Research (3998338)
   Prototype: skill-assessment v1
*/
(function () {
  const MIXPANEL_TOKEN = '81929a7952506e86cd230338890d3298';
  const PROTOTYPE_NAME = 'skill-assessment';
  const PROTOTYPE_VERSION = 'v1';

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:');
  const MIXPANEL_ENABLED = !isLocalhost;

  const log = (...args) => console.info('[hb-analytics]', ...args);
  log('boot · enabled =', MIXPANEL_ENABLED, '· host =', window.location.hostname);

  const SCREEN_MAP = {
    1: 'intro',
    2: 'how_it_works',
    3: 'breathe_in',
    4: 'hold',
    5: 'analyzing',
    6: 'result',
    7: 'active_breathing',
    8: 'complete'
  };

  const state = {
    initialized: false,
    identified: false,
    name: null,
    phone: null,
    sessionStart: Date.now(),
    screensViewed: 0,
    lastScreen: null,
    lastScreenEnteredAt: Date.now(),
    scrollDepthFired: {}
  };

  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments); } catch (e) { /* never break UI */ }
    };
  }

  function deviceType() {
    return window.innerWidth <= 768 ? 'mobile' : 'desktop';
  }

  function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
  }

  function validPhone(raw) {
    const d = normalizePhone(raw);
    return /^[6-9]\d{9}$/.test(d);
  }

  function initMixpanel() {
    if (!MIXPANEL_ENABLED) { log('init skipped (localhost)'); return; }
    if (typeof mixpanel === 'undefined') { log('init FAILED — mixpanel global missing'); return; }
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: false,
      track_pageview: false,
      persistence: 'localStorage',
      ignore_dnt: true,
      loaded: () => log('mixpanel loaded · distinct_id =', mixpanel.get_distinct_id && mixpanel.get_distinct_id())
    });
    state.initialized = true;
    log('init OK · token =', MIXPANEL_TOKEN.slice(0, 6) + '…');
  }

  function registerSuperProps(extra) {
    if (!state.initialized) return;
    const base = {
      user_name: state.name,
      user_phone: state.phone,
      prototype_name: PROTOTYPE_NAME,
      prototype_version: PROTOTYPE_VERSION,
      device_type: deviceType(),
      referrer: document.referrer || 'direct',
      entry_screen: SCREEN_MAP[1] || 'unknown'
    };
    mixpanel.register(Object.assign(base, extra || {}));
  }

  function identifyUser(name, phone, firstTime) {
    if (!state.initialized) { log('identify skipped (not init)'); return; }
    state.name = name;
    state.phone = phone;
    mixpanel.identify(phone);
    const profile = { $name: name, $phone: phone };
    if (firstTime) profile.first_seen = new Date().toISOString();
    mixpanel.people.set(profile);
    registerSuperProps();
    state.identified = true;
    log('identified ·', name, '·', phone, '· firstTime =', !!firstTime);
  }

  window.track = safe(function (event, props) {
    if (!MIXPANEL_ENABLED) { log('track skipped (disabled):', event); return; }
    if (!state.initialized) { log('track skipped (not init):', event); return; }
    if (!state.phone) { log('track skipped (no identity):', event); return; }
    log('→ track:', event, props || {});
    mixpanel.track(event, props || {});
  });

  /* ─── Identity capture modal ─────────────────────────────── */
  function injectModalStyles() {
    if (document.getElementById('hb-id-styles')) return;
    const s = document.createElement('style');
    s.id = 'hb-id-styles';
    s.textContent = `
      .hb-id-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15,23,42,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
        font-family: "Poppins", -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .hb-id-card {
        width: 100%; max-width: 380px;
        background: #FDF7EE; border-radius: 20px;
        padding: 28px 24px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.3);
      }
      .hb-id-card h3 {
        font-family: "Fraunces", Georgia, serif;
        font-weight: 700; font-size: 24px; line-height: 1.15;
        color: #0F172A; margin: 0 0 6px; letter-spacing: -0.02em;
      }
      .hb-id-card .hb-id-sub {
        font-size: 14px; color: #475569; margin: 0 0 22px; line-height: 1.5;
      }
      .hb-id-field { margin-bottom: 14px; }
      .hb-id-field label {
        display: block; font-size: 12px; font-weight: 600;
        color: #334155; margin-bottom: 6px; letter-spacing: 0.02em;
      }
      .hb-id-field input {
        width: 100%; box-sizing: border-box;
        padding: 12px 14px; border-radius: 12px;
        border: 1.5px solid #EDDFCC; background: #fff;
        font-family: inherit; font-size: 15px; color: #0F172A;
        outline: none; transition: border-color 0.15s;
      }
      .hb-id-field input:focus { border-color: #B1570D; }
      .hb-id-err {
        font-size: 12px; color: #B91C1C; margin-top: 6px; min-height: 16px;
      }
      .hb-id-btn {
        width: 100%; height: 50px; border-radius: 28px;
        background: #B1570D; color: #fff; border: 0; cursor: pointer;
        font-family: inherit; font-weight: 600; font-size: 15px;
        margin-top: 6px; transition: background 0.15s;
      }
      .hb-id-btn:hover { background: #89430A; }
      .hb-id-btn:disabled { background: #B1570D; opacity: 0.5; cursor: not-allowed; }
      .hb-id-foot {
        font-size: 11px; color: #64748B; text-align: center; margin-top: 14px;
      }
    `;
    document.head.appendChild(s);
  }

  function showIdentityModal() {
    injectModalStyles();
    const overlay = document.createElement('div');
    overlay.className = 'hb-id-overlay';
    overlay.innerHTML = `
      <div class="hb-id-card">
        <h3>Before we begin</h3>
        <p class="hb-id-sub">Tell us your name and phone so we can save your result and share your breathing pattern with you.</p>
        <div class="hb-id-field">
          <label for="hb-id-name">Your name</label>
          <input id="hb-id-name" type="text" autocomplete="name" placeholder="e.g. Sushma" />
        </div>
        <div class="hb-id-field">
          <label for="hb-id-phone">Phone number</label>
          <input id="hb-id-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile" />
          <div class="hb-id-err" id="hb-id-err"></div>
        </div>
        <button class="hb-id-btn" id="hb-id-submit">Start the test</button>
        <div class="hb-id-foot">Used only for Habuild research. We won't spam you.</div>
      </div>
    `;
    document.body.appendChild(overlay);
    const nameEl = overlay.querySelector('#hb-id-name');
    const phoneEl = overlay.querySelector('#hb-id-phone');
    const errEl = overlay.querySelector('#hb-id-err');
    const btn = overlay.querySelector('#hb-id-submit');

    nameEl.focus();

    function submit() {
      const name = (nameEl.value || '').trim();
      const phoneRaw = (phoneEl.value || '').trim();
      if (name.length < 2) { errEl.textContent = 'Please enter your name.'; nameEl.focus(); return; }
      if (!validPhone(phoneRaw)) { errEl.textContent = 'Enter a valid 10-digit Indian mobile.'; phoneEl.focus(); return; }
      const phone = normalizePhone(phoneRaw);
      localStorage.setItem('user_name', name);
      localStorage.setItem('user_phone', phone);
      identifyUser(name, phone, true);
      window.track('Identity Captured', { name: name, phone: phone });
      overlay.remove();
      fireInitialScreenView();
    }
    btn.addEventListener('click', submit);
    phoneEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') phoneEl.focus(); });
  }

  /* ─── Screen tracking via MutationObserver ──────────────── */
  function currentScreenName() {
    const active = document.querySelector('.screen.active');
    if (!active) return null;
    return SCREEN_MAP[active.dataset.step] || ('screen_' + active.dataset.step);
  }

  function fireScreenViewed(name) {
    if (!name || name === state.lastScreen) return;
    const now = Date.now();
    const timeOnPrev = state.lastScreen ? Math.round((now - state.lastScreenEnteredAt) / 1000) : 0;
    window.track('Screen Viewed', {
      screen_name: name,
      screen_path: '/' + name,
      time_on_prev_screen_sec: timeOnPrev
    });
    state.lastScreen = name;
    state.lastScreenEnteredAt = now;
    state.screensViewed += 1;
  }

  function fireInitialScreenView() {
    const name = currentScreenName();
    if (name) fireScreenViewed(name);
  }

  function watchScreens() {
    const screens = document.querySelectorAll('.screen');
    if (!screens.length) return;
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (el.classList.contains('active')) {
            const name = SCREEN_MAP[el.dataset.step] || ('screen_' + el.dataset.step);
            fireScreenViewed(name);
          }
        }
      });
    });
    screens.forEach(s => observer.observe(s, { attributes: true, attributeFilter: ['class'] }));
  }

  /* ─── Delegated CTA click listener ──────────────────────── */
  function wireClickDelegate() {
    document.addEventListener('click', safe(function (e) {
      const el = e.target.closest('[data-track]');
      if (!el) return;
      const kind = el.dataset.track;
      const screenName = currentScreenName();
      const baseProps = {
        cta_label: el.dataset.ctaLabel || (el.textContent || '').trim().slice(0, 40),
        cta_location: el.dataset.ctaLocation || screenName,
        screen_name: screenName
      };

      // Enrichment for prototype-specific moments
      const enriched = Object.assign({}, baseProps);
      const label = baseProps.cta_label;
      if (label === 'Stop') {
        const heldEl = document.getElementById('holdNum');
        enriched.held_seconds = heldEl ? parseInt(heldEl.textContent, 10) || 0 : null;
      }
      if (label === 'Start Now' || label === 'Try again') {
        const pat = document.getElementById('resultPattern');
        const held = document.getElementById('resultHeldNum');
        enriched.pattern = pat ? pat.textContent : null;
        enriched.held_seconds = held ? parseInt(held.textContent, 10) || 0 : null;
      }
      if (label === 'Done') {
        const pat = document.getElementById('completePattern');
        const dur = document.getElementById('completeDur');
        enriched.pattern = pat ? pat.textContent : null;
        enriched.session_duration = dur ? dur.textContent : null;
      }

      if (kind === 'cta' || kind === 'back') {
        window.track('CTA Clicked', enriched);
      } else if (kind === 'card') {
        window.track('Card Tapped', {
          card_id: el.dataset.cardId,
          card_title: el.dataset.cardTitle,
          card_position: el.dataset.cardPosition,
          screen_name: screenName
        });
      }
    }), true);
  }

  /* ─── Session end ───────────────────────────────────────── */
  function wireSessionEnd() {
    window.addEventListener('beforeunload', safe(function () {
      if (!state.phone) return;
      const sec = Math.round((Date.now() - state.sessionStart) / 1000);
      window.track('Session Ended', {
        session_duration_sec: sec,
        screens_viewed: state.screensViewed,
        last_screen: state.lastScreen
      });
    }));
  }

  /* ─── Bootstrap ─────────────────────────────────────────── */
  function bootstrap() {
    initMixpanel();
    wireClickDelegate();
    wireSessionEnd();
    watchScreens();

    const storedName = localStorage.getItem('user_name');
    const storedPhone = localStorage.getItem('user_phone');
    if (storedName && storedPhone && validPhone(storedPhone)) {
      identifyUser(storedName, normalizePhone(storedPhone), false);
      fireInitialScreenView();
    } else {
      // Block until identity captured
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showIdentityModal);
      } else {
        showIdentityModal();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
