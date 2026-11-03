// Form spam guard (all forms): fetches a signed load-time token from /api/form-token
// and renders Cloudflare Turnstile into the container's [data-turnstile] slot.
// api/_guard.js + api/_spam.js do the real enforcement; this only collects what the
// server needs. Usage: const g = PHGuard.protect(formOrContainer); then merge
// `await g.fields()` into the JSON body, and call g.reset() after a failed submit.
(function () {
  var SITE_KEY = '0x4AAAAAAFxlhxob60P-BGjA'; // public; widget "phuongha-loans-forms", TDJ Cloudflare

  var api = null;
  function loadTurnstile() {
    if (!api) {
      api = new Promise(function (resolve, reject) {
        if (window.turnstile) return resolve(window.turnstile);
        var s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.onload = function () { resolve(window.turnstile); };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return api;
  }

  function fetchToken() {
    return fetch('/api/form-token', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { return d.t || ''; })
      .catch(function () { return ''; });
  }

  function protect(el) {
    var token = fetchToken();
    var widgetId = null;
    var answer = '';
    var waiting = [];
    function settle(v) { answer = v || ''; waiting.splice(0).forEach(function (fn) { fn(answer); }); }

    var slot = el.querySelector('[data-turnstile]');
    if (slot && SITE_KEY) {
      loadTurnstile().then(function (ts) {
        widgetId = ts.render(slot, {
          sitekey: SITE_KEY,
          size: 'flexible',
          appearance: 'interaction-only',
          callback: settle,
          'expired-callback': function () { answer = ''; },
          'error-callback': function () { settle(''); },
        });
      }).catch(function () { settle(''); });
    }

    // Waits for Turnstile, but never more than 10s, so a blocked script can't hang
    // the form (the server then rejects it and the visitor sees the phone number).
    function turnstileAnswer() {
      if (!slot || answer) return Promise.resolve(answer);
      return new Promise(function (resolve) { waiting.push(resolve); setTimeout(function () { resolve(answer); }, 10000); });
    }

    return {
      fields: function () {
        return Promise.all([token, turnstileAnswer()]).then(function (v) {
          return { ft: v[0], 'cf-turnstile-response': v[1] };
        });
      },
      reset: function () {
        token = fetchToken();
        answer = '';
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      },
    };
  }

  window.PHGuard = { protect: protect };
})();

// Email links: the address is assembled in the browser, never written in the HTML.
// <a class="js-email" data-u="(user reversed)" data-d="(domain reversed)">. Add
// data-keep to set only the link and keep the link's own text.
(function () {
  function run() {
    var rev = function (s) { return String(s || '').split('').reverse().join(''); };
    document.querySelectorAll('.js-email').forEach(function (a) {
      var addr = rev(a.dataset.u) + '@' + rev(a.dataset.d);
      a.href = 'mailto:' + addr;
      if (!a.hasAttribute('data-keep')) a.textContent = addr;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
