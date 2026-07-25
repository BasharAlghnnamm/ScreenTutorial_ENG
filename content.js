// ScreenTutorial — Content Script
// Detects user interactions (clicks, inputs) and reports them to the background.

(function () {
  if (window.__screenTutorialLoaded) return;
  window.__screenTutorialLoaded = true;

  let recording = false;
  let lastTarget = null;
  let lastTime = 0;
  const DEBOUNCE = 400; // ms, per-element
  let indicator = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  browser.runtime.sendMessage({ type: 'GET_STATUS' }).then(s => {
    recording = s.recording;
    if (recording) showIndicator();
  }).catch(() => {});

  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'RECORDING_STATE') {
      recording = msg.recording;
      recording ? showIndicator() : hideIndicator();
    }
  });

  // ── Recording indicator (Shadow DOM, non-intrusive) ───────────────────────

  function showIndicator() {
    if (indicator) return;
    indicator = document.createElement('div');
    try {
      const shadow = indicator.attachShadow({ mode: 'closed' });
      shadow.innerHTML =
        '<style>' +
        ':host{all:initial;position:fixed;top:12px;right:12px;z-index:2147483647;pointer-events:none}' +
        '.b{background:rgba(231,76,60,.92);color:#fff;padding:5px 14px;border-radius:20px;' +
        'font:600 13px/1 system-ui,sans-serif;display:flex;align-items:center;gap:7px;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
        '.d{width:8px;height:8px;background:#fff;border-radius:50%;animation:p 1.4s ease-in-out infinite}' +
        '@keyframes p{0%,100%{opacity:1}50%{opacity:.2}}' +
        '</style><div class="b"><span class="d"></span>REC</div>';
    } catch {
      // Fallback when Shadow DOM is unavailable
      indicator.style.cssText =
        'position:fixed;top:12px;right:12px;z-index:2147483647;pointer-events:none;' +
        'background:rgba(231,76,60,.92);color:#fff;padding:5px 14px;border-radius:20px;' +
        'font:600 13px/1 system-ui,sans-serif';
      indicator.textContent = '\u25CF REC';
    }
    document.documentElement.appendChild(indicator);
  }

  function hideIndicator() {
    if (indicator) { indicator.remove(); indicator = null; }
  }

  // ── Element analysis ──────────────────────────────────────────────────────

  function info(el) {
    const tag = el.tagName.toLowerCase();
    return {
      tag,
      text: (el.textContent || '').trim().slice(0, 100),
      ariaLabel: el.getAttribute('aria-label') || '',
      placeholder: el.getAttribute('placeholder') || '',
      title: el.getAttribute('title') || '',
      alt: el.getAttribute('alt') || '',
      label: findLabel(el),
      type: el.getAttribute('type') || '',
      name: el.getAttribute('name') || ''
    };
  }

  function findLabel(el) {
    if (el.id) {
      try {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) return lbl.textContent.trim().slice(0, 80);
      } catch { /* ignore */ }
    }
    const p = el.closest('label');
    return p ? p.textContent.trim().slice(0, 80) : '';
  }

  function describe(action, i) {
    const id = i.ariaLabel || i.label || i.title || i.placeholder || i.alt
      || (i.text.length <= 60 ? i.text : i.text.slice(0, 57) + '\u2026') || '';

    if (action === 'click') {
      if (i.tag === 'a') return 'Click the link "' + (id || 'link') + '"';
      if (i.tag === 'button' || i.type === 'submit' || i.type === 'button')
        return 'Click the button "' + (id || 'button') + '"';
      if (i.type === 'checkbox' || i.type === 'radio')
        return 'Check "' + (id || i.type) + '"';
      return id ? 'Click "' + id + '"' : 'Click the ' + i.tag + ' element';
    }
    if (action === 'input') {
      const f = i.label || i.placeholder || i.ariaLabel || i.title || 'field';
      return 'Type text in "' + f + '"';
    }
    if (action === 'select') {
      const f = i.label || i.ariaLabel || i.title || 'dropdown';
      return 'Select an option in "' + f + '"';
    }
    return id ? 'Action on "' + id + '"' : 'Action on ' + i.tag;
  }

  // ── Highlight clicked element ─────────────────────────────────────────────

  function highlight(el) {
    const r = el.getBoundingClientRect();
    const h = document.createElement('div');
    h.style.cssText =
      'position:fixed;top:' + (r.top - 3) + 'px;left:' + (r.left - 3) + 'px;' +
      'width:' + (r.width + 6) + 'px;height:' + (r.height + 6) + 'px;' +
      'border:3px solid #e74c3c;border-radius:4px;background:rgba(231,76,60,.08);' +
      'z-index:2147483646;pointer-events:none';
    document.documentElement.appendChild(h);
    return function () { h.remove(); };
  }

  // ── Send action to background ─────────────────────────────────────────────

  function send(action, el) {
    var now = Date.now();
    if (el === lastTarget && now - lastTime < DEBOUNCE) return;
    lastTarget = el;
    lastTime = now;

    var desc = describe(action, info(el));

    // Send immediately so the screenshot captures the page BEFORE
    // any visual side-effect (dropdown, modal, navigation…)
    browser.runtime.sendMessage({
      type: 'ACTION',
      action: action,
      description: desc,
      url: location.href
    }).catch(function () {});

    // Highlight for visual feedback only (not in the screenshot)
    var cleanup = highlight(el);
    setTimeout(cleanup, 800);
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  document.addEventListener('click', function (e) {
    if (!recording) return;
    var t = e.target;

    // Walk up to the closest interactive ancestor
    var interactive = t.closest(
      'a, button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], summary'
    );
    if (interactive) t = interactive;

    var tag = t.tagName.toLowerCase();

    // Skip text inputs / selects — the change event is more informative
    if (tag === 'select' || tag === 'textarea') return;
    if (tag === 'input' && ['checkbox', 'radio', 'submit', 'button'].indexOf(t.type || '') === -1) return;

    // Only capture significant clicks
    var dominated = ['a', 'button', 'input', 'summary'].indexOf(tag) !== -1;
    var roled = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch']
      .indexOf(t.getAttribute('role')) !== -1;
    if (!dominated && !roled && !interactive) return;

    send('click', t);
  }, true);

  document.addEventListener('change', function (e) {
    if (!recording) return;
    var t = e.target;
    var tag = t.tagName.toLowerCase();
    if (tag === 'select') send('select', t);
    else if (tag === 'input' || tag === 'textarea') send('input', t);
  }, true);

})();
