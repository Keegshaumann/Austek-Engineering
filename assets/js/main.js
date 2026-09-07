/* ==========================================================
   Austek Engineering CC
   Progressive enhancement only — the page is fully readable
   and usable with this file blocked or failing.
   ========================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------
     CONFIG — set this to a form endpoint to receive
     enquiries in an inbox / dashboard instead of opening
     the visitor's mail client.

     Works with Formspree ("https://formspree.io/f/xxxxxxx")
     or Web3Forms ("https://api.web3forms.com/submit").
     Leave empty to keep the mailto fallback.
  ------------------------------------------------------ */
  var FORM_ENDPOINT = '';
  var CONTACT_EMAIL = 'ykhunoo@yahoo.com';

  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mark JS as live. Until this runs nothing is hidden, so a
     script failure degrades to plain visible content. */
  d.documentElement.classList.add('js');

  /* ---------------- header ---------------- */
  var hdr = $('#hdr');
  var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 10); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- mobile nav ---------------- */
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });

  /* ---------------- reveals ---------------- */
  var revealAll = function () { $$('.reveal').forEach(function (el) { el.classList.add('is-in'); }); };

  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
    /* Failsafe: never leave content stranded at opacity 0. */
    setTimeout(revealAll, 4000);
  }

  /* ---------------- counters ---------------- */
  var countUp = function (el) {
    var to = parseInt(el.dataset.to, 10);
    if (reduced || isNaN(to)) { el.textContent = to; return; }
    var start = null, dur = 1100;
    var tick = function (t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  var nums = $$('[data-to]');
  if (nums.length) {
    if (!('IntersectionObserver' in window)) { nums.forEach(countUp); }
    else {
      var nio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          nio.unobserve(e.target);
          countUp(e.target);
        });
      }, { threshold: 0.6 });
      nums.forEach(function (el) { nio.observe(el); });
    }
  }

  /* ---------------- footer year ---------------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- quote form ---------------- */
  var form = $('#quoteForm');
  if (!form) return;
  var note = $('#formNote');

  var setError = function (input, msg) {
    var field = input.closest('.f');
    var slot = field ? field.querySelector('[data-err]') : null;
    field && field.classList.toggle('is-bad', !!msg);
    if (slot) slot.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  var validate = function () {
    var ok = true, first = null;
    ['name', 'phone', 'details'].forEach(function (n) {
      var i = form.elements[n];
      if (!i) return;
      if (!i.value.trim()) { setError(i, 'Required'); ok = false; first = first || i; }
      else setError(i, '');
    });
    var em = form.elements.email;
    if (em && em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) {
      setError(em, 'Enter a valid email address'); ok = false; first = first || em;
    } else if (em) setError(em, '');
    if (first) first.focus();
    return ok;
  };

  var mailtoFallback = function (data) {
    var body = [
      'Name: ' + data.name,
      'Company: ' + (data.company || '—'),
      'Phone: ' + data.phone,
      'Email: ' + (data.email || '—'),
      'Work required: ' + data.work,
      '',
      'Details:',
      data.details
    ].join('\n');
    window.location.href = 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Quote request — ' + data.name) +
      '&body=' + encodeURIComponent(body);
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements._gotcha && form.elements._gotcha.value) return; // bot
    if (!validate()) return;

    var data = {};
    ['name', 'company', 'phone', 'email', 'work', 'details'].forEach(function (n) {
      data[n] = form.elements[n] ? form.elements[n].value.trim() : '';
    });

    var btn = form.querySelector('button[type="submit"]');

    if (!FORM_ENDPOINT) { mailtoFallback(data); return; }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('Bad response');
      form.classList.add('is-sent');
      form.reset();
      note.textContent = 'Thanks — your enquiry is in. We’ll come back to you shortly.';
      btn.textContent = 'Sent';
    }).catch(function () {
      btn.disabled = false;
      btn.innerHTML = 'Send enquiry <span aria-hidden="true">&rarr;</span>';
      note.textContent = 'That didn’t send. Please call 083 745 5505 or email ' + CONTACT_EMAIL + '.';
      mailtoFallback(data);
    });
  });
})();
