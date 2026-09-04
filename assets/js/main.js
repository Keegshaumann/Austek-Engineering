/* ==========================================================================
   Austek Engineering CC — motion. anime.js v4 (https://animejs.com)
   ========================================================================== */
(function () {
  'use strict';

  var A = window.anime;
  var animate = A.animate,
      stagger = A.stagger,
      createTimeline = A.createTimeline,
      onScroll = A.onScroll,
      ScrollObserver = A.ScrollObserver,
      utils = A.utils,
      svg = A.svg;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = A.cubicBezier(.22, .68, .28, 1);

  document.getElementById('yr').textContent = new Date().getFullYear();

  /* ───────────────────────────────────────────────────────────────── nav ── */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');

  new ScrollObserver({
    target: '.hero',
    enter: 'top+=40 top',
    leave: 'bottom bottom',
    onEnter: function () { nav.classList.add('is-stuck'); },
    onEnterBackward: function () { nav.classList.remove('is-stuck'); }
  });

  burger.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && !reduced) {
      animate(links.querySelectorAll('a'), {
        opacity: [0, 1], x: [24, 0], duration: 480, delay: stagger(55), ease: EASE
      });
    }
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' && links.classList.contains('is-open')) {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  /* nav inverts while a steel-paper section sits under it */
  document.querySelectorAll('.is-light').forEach(function (section) {
    new ScrollObserver({
      target: section,
      enter: 'top+=34 top',
      leave: 'top+=34 bottom',
      onEnter: function () { nav.classList.add('on-light'); },
      onLeave: function () { nav.classList.remove('on-light'); },
      onEnterBackward: function () { nav.classList.add('on-light'); },
      onLeaveBackward: function () { nav.classList.remove('on-light'); }
    });
  });

  /* ─────────────────────────────────────────────────── copy phone number ── */
  var copyBtn = document.getElementById('copyPhone');
  copyBtn.addEventListener('click', function () {
    var label = copyBtn.querySelector('.mono');
    var original = label.textContent;
    var done = function () {
      label.textContent = 'Copied';
      copyBtn.classList.add('is-done');
      setTimeout(function () {
        label.textContent = original;
        copyBtn.classList.remove('is-done');
      }, 1600);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyBtn.dataset.phone).then(done, function () {
        window.location.href = 'tel:+27' + copyBtn.dataset.phone.slice(1);
      });
    } else {
      window.location.href = 'tel:+27' + copyBtn.dataset.phone.slice(1);
    }
  });

  /* ─────────────────────────────────────────────────────────────── form ── */
  var form = document.getElementById('quoteForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var body = [
      'Name: ' + (d.get('name') || ''),
      'Company: ' + (d.get('company') || ''),
      'Phone: ' + (d.get('phone') || ''),
      'Email: ' + (d.get('email') || ''),
      'Work required: ' + (d.get('type') || ''),
      '', d.get('message') || ''
    ].join('\n');
    window.location.href = 'mailto:ykhunoo@yahoo.com'
      + '?subject=' + encodeURIComponent('Website enquiry — ' + (d.get('type') || 'General'))
      + '&body=' + encodeURIComponent(body);
  });

  /* ══════════════════════════════ HERO: self-erecting steel platform ══════ */
  var buildSvg = document.getElementById('build');
  var hatch    = document.getElementById('bHatch');
  var weldsG   = document.getElementById('bWelds');
  var statusEl = document.getElementById('bStatus');
  var statusTx = document.getElementById('bStatusTxt');

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ground hatching under the base line */
  for (var h = 0; h < 34; h++) {
    var hx = 46 + h * 16;
    hatch.appendChild(svgEl('line', {
      x1: hx, y1: 556, x2: hx - 11, y2: 570, class: 'b-hatch'
    }));
  }

  /* every welded joint on the frame */
  var JOINTS = [
    [150, 528], [470, 528],            /* column bases            */
    [150, 214], [470, 214],            /* column / main beam      */
    [150, 384], [470, 384],            /* column / walkway        */
    [176, 522], [444, 522],            /* lower brace feet        */
    [310, 400],                        /* lower brace apex        */
    [176, 224], [444, 224],            /* upper brace feet        */
    [310, 370]                         /* upper brace apex        */
  ];

  var flashes = [], sparks = [];
  JOINTS.forEach(function (j) {
    var g = svgEl('g', {});
    var f = svgEl('circle', { cx: j[0], cy: j[1], r: 26, fill: 'url(#flash)', class: 'b-flash' });
    g.appendChild(f);
    flashes.push(f);
    for (var a = 0; a < 5; a++) {
      var ang = (a * 72 + utils.random(-18, 18)) * Math.PI / 180;
      var sp = svgEl('line', {
        x1: j[0], y1: j[1],
        x2: (j[0] + Math.cos(ang) * 20).toFixed(1),
        y2: (j[1] + Math.sin(ang) * 20).toFixed(1),
        class: 'b-spark'
      });
      g.appendChild(sp);
      sparks.push(sp);
    }
    weldsG.appendChild(g);
  });

  /* flashes grouped by the build stage that creates them */
  function jointsAt(idx) { return idx.map(function (i) { return flashes[i]; }); }
  function sparksAt(idx) {
    var out = [];
    idx.forEach(function (i) { out = out.concat(sparks.slice(i * 5, i * 5 + 5)); });
    return out;
  }

  var stage = function (el) { return Array.prototype.slice.call(document.querySelectorAll('[data-stage="' + el + '"]')); };

  if (!reduced) {
    utils.set('.b-flash', { scale: 0, opacity: 0 });
    utils.set('#bGround, #bHatch line', { opacity: 0 });

    /* ---- weld helper: flash + spark burst at a set of joints -------------- */
    var weld = function (tl, idx, at) {
      tl.add(jointsAt(idx), {
        scale: [0.2, 1.9], opacity: [0, 1, 0],
        duration: 620, ease: 'out(3)', delay: stagger(60)
      }, at);
      tl.add(sparksAt(idx), {
        opacity: [0, .95, 0],
        duration: 520, ease: 'out(2)', delay: stagger(14)
      }, at + 40);
      return tl;
    };

    var say = function (txt) { return function () { statusTx.textContent = txt; }; };

    var bt = createTimeline({ defaults: { ease: EASE } });

    /* 00 · site */
    bt.add('#bGround', { opacity: [0, .32], duration: 500 }, 0)
      .add('#bHatch line', { opacity: [0, .14], duration: 400, delay: stagger(14) }, 120)
      .add(statusEl, { opacity: [0, 1], duration: 500 }, 120);

    /* 01 · base plates drop in */
    bt.add(stage(0), {
      opacity: [0, 1], scale: [.4, 1], y: [-26, 0],
      duration: 640, delay: stagger(110), onBegin: say('Setting base plates')
    }, 420);
    weld(bt, [0, 1], 1000);

    /* 02 · columns rise */
    bt.add(stage(1), {
      opacity: [0, 1], scaleY: [0, 1],
      duration: 900, delay: stagger(150), ease: 'out(3)', onBegin: say('Raising columns')
    }, 1180);

    /* 03 · main beam extends across */
    bt.add(stage(2), {
      opacity: [0, 1], scaleX: [0, 1],
      duration: 800, ease: 'out(3)', onBegin: say('Landing the main beam')
    }, 2020);
    weld(bt, [2, 3], 2720);

    /* 04 · gussets */
    bt.add(stage(3), {
      opacity: [0, 1], scale: [0, 1],
      duration: 480, delay: stagger(90), onBegin: say('Fitting gussets')
    }, 2860);

    /* 05 · walkway beam */
    bt.add(stage(4), {
      opacity: [0, 1], scaleX: [0, 1],
      duration: 760, ease: 'out(3)', onBegin: say('Hanging the walkway')
    }, 3200);
    weld(bt, [4, 5], 3860);

    /* 06 · bracing shoots in */
    var braces = stage(5).concat(stage(6)).map(function (g) {
      return svg.createDrawable(g.querySelector('path'));
    });
    utils.set(braces, { draw: '0 0' });
    bt.add(stage(5).concat(stage(6)), { opacity: [0, 1], duration: 120, onBegin: say('Bracing the frame') }, 4020);
    bt.add(braces, { draw: ['0 0', '0 1'], duration: 620, delay: stagger(130), ease: 'out(3)' }, 4020);
    weld(bt, [6, 7, 8, 9, 10, 11], 4680);

    /* 07 · handrail */
    bt.add(stage(7), {
      opacity: [0, 1], scaleY: [0, 1],
      duration: 500, delay: stagger(80), ease: 'out(3)', onBegin: say('Standing the handrail')
    }, 4900);

    var rails = stage(8).map(function (g) { return svg.createDrawable(g.querySelector('path')); });
    utils.set(rails, { draw: '0 0' });
    bt.add(stage(8), { opacity: [0, 1], duration: 100 }, 5320);
    bt.add(rails, { draw: ['0 0', '0 1'], duration: 620, delay: stagger(140), ease: 'out(3)' }, 5320);

    /* 08 · signed off — the frame stays standing */
    bt.add(statusEl, { opacity: [1, 1], duration: 10, onBegin: say('Welded out · signed off') }, 6060);

    /* it keeps breathing once it's up: the joints tick over on a slow loop */
    animate(flashes, {
      scale: [{ to: 1.5 }, { to: 0.2 }],
      opacity: [{ to: .5 }, { to: 0 }],
      duration: 1500,
      ease: 'out(3)',
      delay: stagger(230),
      loop: true,
      loopDelay: 2600
    });

    /* re-run the erection sequence when you come back to the top */
    new ScrollObserver({
      target: '.hero',
      enter: 'top top',
      onEnterBackward: function () { if (bt.completed) bt.restart(); }
    });

    /* ─────────────────────────────────────────────────────── hero copy in ── */
    utils.set('.hero__grid, .hero__specs li, .hero__foot > *', { opacity: 0 });
    utils.set('.hero__specs', { opacity: 1 });

    var ht = createTimeline({ defaults: { ease: EASE } });
    ht.add('.logo, .nav__links a, .nav__act .pill', { opacity: [0, 1], y: [-12, 0], duration: 620, delay: stagger(65) }, 60)
      .add('.tag', { opacity: [0, 1], y: [12, 0], duration: 600 }, 200)
      .add('.hero__h1 .w', { y: ['102%', '0%'], opacity: [0, 1], duration: 900, delay: stagger(75) }, 260)
      /* a weld pass runs under each line as it lands */
      .add('.seam', { opacity: [0, 1], scaleX: [0, 1], duration: 540, delay: stagger(220), ease: 'out(3)' }, 640)
      .add('.seam', { opacity: [1, 0], duration: 620, delay: stagger(220) }, 1220)
      .add('.hero__sub', { opacity: [0, 1], y: [16, 0], duration: 700 }, 700)
      .add('.hero__cta', { opacity: [0, 1], y: [16, 0], duration: 700 }, 800)
      .add('.hero__specs li', { opacity: [0, 1], x: [-16, 0], duration: 620, delay: stagger(90) }, 900)
      .add('.hero__grid', { opacity: [0, 1], scale: [1.16, 1], duration: 1600 }, 0)
      .add('.hero__foot > *', { opacity: [0, 1], y: [10, 0], duration: 700, delay: stagger(120) }, 1100);
    animate('.pd', { opacity: [1, .3], duration: 900, loop: true, alternate: true, ease: 'inOut(2)' });
  }

  /* ──────────────────────── scroll-triggered reveals — anime Scroll Observer ─ */
  /* `enter` reads as "<container threshold> <target threshold>" and defaults to
     'end start'. Nudged up so things land just before they're fully in view.   */
  var ENTER = 'bottom-=60 top';

  var reveals = [];

  function revealOnScroll(animation, target) {
    if (reduced) { animation.complete(); return; }
    reveals.push({ anim: animation, el: target });
    new ScrollObserver({
      target: target,
      enter: ENTER,
      onEnter: function () {
        /* already above the fold when the observer woke up — don't rewind it */
        if (target.getBoundingClientRect().bottom < 0) { animation.complete(); return; }
        animation.play();
      },
      onLeave: function () { animation.complete(); }
    });
  }

  /* A Scroll Observer emits nothing for a target that is already behind you, so
     anything above the viewport on load — a deep link like /#work, a restored
     scroll position, a bfcache return — is settled to its finished state
     instead of being left at opacity 0.                                        */
  function settleReveals() {
    reveals.forEach(function (r) {
      if (r.el.getBoundingClientRect().bottom < 0) r.anim.complete();
    });
  }
  function settleSoon() { settleReveals(); setTimeout(settleReveals, 300); }
  window.addEventListener('load', settleSoon);
  window.addEventListener('pageshow', settleSoon);
  window.addEventListener('hashchange', function () { setTimeout(settleReveals, 700); });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealOnScroll(animate(el, {
      opacity: [0, 1], y: [22, 0], duration: 850, ease: EASE, autoplay: false
    }), el);
  });

  document.querySelectorAll('.reveal-stagger').forEach(function (grp) {
    revealOnScroll(animate(grp.children, {
      opacity: [0, 1], y: [22, 0], duration: 850, ease: EASE,
      delay: stagger(70), autoplay: false
    }), grp);
  });

  document.querySelectorAll('.num[data-count]').forEach(function (el) {
    var to = +el.dataset.count, sfx = el.dataset.suffix || '', o = { v: 0 };
    revealOnScroll(animate(o, {
      v: to, duration: 1600, ease: 'out(3)', autoplay: false,
      onUpdate: function () { el.textContent = utils.round(o.v, 0) + sfx; }
    }), el);
  });

  /* ─────────────────────────── scroll-scrubbed spool assembly (the rig) ─── */
  var rig = document.getElementById('process');
  var parts = Array.prototype.slice.call(document.querySelectorAll('.asm .pt'));
  var callouts = Array.prototype.slice.call(document.querySelectorAll('.asm .co'));
  var leaders = Array.prototype.slice.call(document.querySelectorAll('.asm .ld'));
  var centre = document.querySelectorAll('#asmCl path');
  var scrubBar = document.getElementById('scrubBar');
  var scrubLbl = document.getElementById('scrubLbl');

  for (var t = 0; t < 22; t++) scrubBar.appendChild(document.createElement('i'));
  var scrubTicks = Array.prototype.slice.call(scrubBar.children);

  /* set exploded start state */
  var SPREAD = 0.5; /* keeps exploded parts inside the drawing frame */
  parts.forEach(function (p) {
    var dx = (+p.dataset.dx || 0) * SPREAD;
    var dy = (+p.dataset.dy || 0) * SPREAD;
    p.dataset.ex = dx + ',' + dy;
    utils.set(p, { x: dx, y: dy, opacity: 0.22, rotate: dx > 0 ? 4 : -4 });
  });
  utils.set(callouts, { opacity: 0 });

  var drawables = leaders.concat(Array.prototype.slice.call(centre)).map(function (p) {
    return svg.createDrawable(p);
  });
  utils.set(drawables, { draw: '0 0' });

  /* the whole assembly timeline is scrubbed straight off scroll position */
  var rigTl = createTimeline({
    defaults: { ease: EASE },
    autoplay: reduced ? false : onScroll({
      target: rig,
      enter: 'top top',
      leave: 'bottom bottom',
      sync: 0.2,
      onUpdate: function (observer) { paintScrub(observer.progress); }
    })
  });

  rigTl.add(drawables[drawables.length - 1], { draw: ['0 0', '0 1'], duration: 600 }, 0);

  parts.forEach(function (p, idx) {
    rigTl.add(p, {
      x: 0, y: 0, rotate: 0, opacity: 1, duration: 900
    }, 200 + idx * 130);
  });

  callouts.forEach(function (c, idx) {
    var at = 1500 + idx * 300;
    rigTl.add(c, { opacity: [0, 1], duration: 260 }, at);
    rigTl.add(drawables[idx], { draw: ['0 0', '0 1'], duration: 560 }, at);
  });

  rigTl.add('.asm .b', { opacity: [0, 1], scale: [.6, 1], duration: 500, delay: stagger(120) }, 1400);
  rigTl.add('#tb', { opacity: [0, 1], translateX: [16, 0], duration: 700 }, 2600);

  /* on small screens crop the drawing to the spool and drop the annotations */
  var asmEl = document.getElementById('asm');
  var narrow = window.matchMedia('(max-width: 820px)');
  function fitAsm() {
    asmEl.setAttribute('viewBox', narrow.matches ? '54 52 950 356' : '0 0 1600 470');
  }
  fitAsm();
  (narrow.addEventListener ? narrow.addEventListener('change', fitAsm) : narrow.addListener(fitAsm));

  var PASSES = 5;
  function paintScrub(p) {
    var lit = Math.round(p * scrubTicks.length);
    scrubTicks.forEach(function (tk, i) { tk.classList.toggle('on', i < lit); });
    var pass = Math.min(PASSES, Math.max(1, Math.ceil(p * PASSES) || 1));
    scrubLbl.textContent = 'PASS 0' + pass + ' / 0' + PASSES;
  }

  if (reduced) {
    rigTl.seek(rigTl.duration);
    paintScrub(1);
  }

  /* ══════════════════════════ CAPABILITY · steel-plate ripple (grid stagger) ═ */
  var plate = document.getElementById('plate');
  if (plate && !reduced) {
    var ROWS = 5;
    var plateLoop = null, plateWave = null;

    function buildPlate() {
      if (plateLoop) plateLoop.revert();
      if (plateWave) plateWave.revert();
      plate.innerHTML = '';
      plate.appendChild(document.createElement('i'));
      /* read the real column count off the layout so the grid stagger matches */
      var cols = getComputedStyle(plate).gridTemplateColumns.split(' ').length;
      var total = cols * ROWS;
      for (var i = 1; i < total; i++) plate.appendChild(document.createElement('i'));

      var cells = plate.querySelectorAll('i');
      var grid = [cols, ROWS];

      plateWave = animate(cells, {
        opacity: [{ to: .6 }, { to: .07 }],
        scaleY: [{ to: 2.2 }, { to: 1 }],
        duration: 900,
        ease: 'inOut(2)',
        delay: stagger(38, { grid: grid, from: 'center' }),
        autoplay: false
      });

      /* slow heat pulse that keeps travelling across the plate */
      plateLoop = animate(cells, {
        opacity: [{ to: .3 }, { to: .07 }],
        duration: 1400,
        ease: 'inOut(2)',
        delay: stagger(90, { grid: grid, from: 'first' }),
        loop: true,
        loopDelay: 2400
      });
    }

    buildPlate();

    new ScrollObserver({
      target: plate,
      enter: 'bottom-=40 top',
      onEnter: function () { if (plateWave) plateWave.restart(); }
    });

    var plateResize;
    window.addEventListener('resize', function () {
      clearTimeout(plateResize);
      plateResize = setTimeout(buildPlate, 220);
    }, { passive: true });
  }

  /* ══════════════════════════════ SITES · route with a travelling marker ════ */
  var routeSvg = document.getElementById('routeSvg');
  if (routeSvg && !reduced) {
    var routeLine = svg.createDrawable('#routeLine');
    var nodes = routeSvg.querySelectorAll('.r-node');
    var hits = routeSvg.querySelectorAll('.r-hit');

    utils.set(routeLine, { draw: '0 0' });
    utils.set(nodes, { opacity: 0 });
    utils.set('#routeVan', { opacity: 0 });

    var routeIn = createTimeline({ defaults: { ease: EASE }, autoplay: false })
      .add(routeLine, { draw: ['0 0', '0 1'], duration: 1500, ease: 'out(2)' }, 0)
      .add(nodes, { opacity: [0, 1], y: [10, 0], duration: 600, delay: stagger(320) }, 400)
      .add('#routeVan', { opacity: [0, 1], duration: 400 }, 1300);

    revealOnScroll(routeIn, routeSvg);

    /* marker runs the route, following the path's own curve */
    animate('#routeVan', {
      ...svg.createMotionPath('#routeLine'),
      duration: 5200,
      ease: 'inOut(2)',
      loop: true,
      loopDelay: 500,
      delay: 1400
    });

    /* the two live sites ping */
    animate(hits, {
      scale: [1, 2.1],
      opacity: [.45, 0],
      duration: 2200,
      ease: 'out(3)',
      loop: true,
      delay: stagger(700)
    });
  }

  /* ══════════════════════════════ WORK · images drift as they pass ══════════ */
  if (!reduced) {
    document.querySelectorAll('.gal__i').forEach(function (fig, i) {
      animate(fig.querySelector('img'), {
        scale: [1.14, 1.02],
        y: ['-2%', '2%'],
        ease: 'linear',
        autoplay: onScroll({
          target: fig,
          enter: 'bottom top',
          leave: 'top bottom',
          sync: 0.5 + (i % 3) * 0.12
        })
      });
    });
  }

  /* ══════════════════════════ ABOUT · the quote lands word by word ══════════ */
  var quote = document.querySelector('.quote blockquote');
  if (quote && !reduced) {
    var split = A.text.splitText(quote, { words: true, chars: false });
    utils.set(split.words, { opacity: 0, y: 14 });
    var quoteIn = animate(split.words, {
      opacity: [0, 1], y: [14, 0],
      duration: 700, ease: EASE, delay: stagger(46), autoplay: false
    });
    new ScrollObserver({
      target: quote,
      enter: 'bottom-=60 top',
      onEnter: function () { quoteIn.play(); },
      onLeave: function () { quoteIn.complete(); }
    });
  }

  /* ══════════════════════════ CAPABILITY INDEX · row hover ══════════════════ */
  if (!reduced) {
    document.querySelectorAll('.idx__i').forEach(function (row) {
      var dot = row.querySelector('i');
      var arw = row.querySelector('span');
      row.addEventListener('mouseenter', function () {
        animate(dot, { scale: [1, 2.2, 1.5], duration: 520, ease: 'out(3)' });
        animate(arw, { x: [0, 6], duration: 360, ease: EASE });
      });
      row.addEventListener('mouseleave', function () {
        animate(dot, { scale: 1, duration: 380, ease: EASE });
        animate(arw, { x: 0, duration: 380, ease: EASE });
      });
    });
  }

  /* ══════════════════════════ TICKER · driven by anime, pauses on hover ═════ */
  var belt = document.querySelector('.belt');
  var beltTrack = document.querySelector('.belt__t');
  if (beltTrack && !reduced) {
    beltTrack.style.animation = 'none'; /* hand over from CSS */
    var beltRun = animate(beltTrack, {
      x: ['0%', '-50%'],
      duration: 44000,
      ease: 'linear',
      loop: true
    });
    belt.addEventListener('mouseenter', function () { beltRun.pause(); });
    belt.addEventListener('mouseleave', function () { beltRun.play(); });
  }

  /* ───────────────────────────────────── contact image drift, scroll-synced ── */
  if (!reduced) {
    animate('.cta__bg img', {
      scale: [1.06, 1.16],
      y: ['0%', '-4%'],
      ease: 'linear',
      autoplay: onScroll({
        target: '.cta',
        enter: 'bottom top',
        leave: 'top bottom',
        sync: 0.35
      })
    });
  }

  /* ─────────────────────────────────────────────────────── micro-reactions ─ */
  if (!reduced) {
    document.querySelectorAll('.gal__i').forEach(function (el) {
      el.addEventListener('mouseenter', function () { animate(el, { scale: 1.008, duration: 400, ease: EASE }); });
      el.addEventListener('mouseleave', function () { animate(el, { scale: 1, duration: 500, ease: EASE }); });
    });
  }
})();
