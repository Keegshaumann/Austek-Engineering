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

  if (!reduced) {
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



  /* ══════════════ THE MACHINE · one build, driven by whole-page scroll ═════ */
  var machineSvg = document.getElementById('machineSvg');
  if (machineSvg) {
    var mkEl = function (tag, attrs) {
      var n = document.createElementNS(SVGNS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };

    var seamDraw = svg.createDrawable('#ph3 .m-seam');
    var pipeDraw = svg.createDrawable('#ph6 .m-pipe');

    var STAGES = [
      '01 \u00b7 Setting out',   '02 \u00b7 Rolling the shell', '03 \u00b7 Welding out',
      '04 \u00b7 Skid & saddles', '05 \u00b7 Nozzles & manway', '06 \u00b7 Pipework',
      '07 \u00b7 Pump & drive',  '08 \u00b7 Commissioned'
    ];

    var mStage = document.getElementById('mStage');
    var mPct = document.getElementById('mPct');
    var mBar = document.getElementById('mBar');

    /* one master timeline; each phase owns a slice of the page */
    var mt = createTimeline({ defaults: { ease: EASE }, autoplay: false });

    /* 01 — setting out */
    mt.add('#ph1', { opacity: [0, 1], duration: 200 }, 0)
      .add('#ph1 .m-grid', { opacity: [0, .07], duration: 400, delay: stagger(14) }, 40)
      .add('#ph1 .m-cl', { opacity: [0, .24], duration: 400, delay: stagger(90) }, 240)
      .add('#ph1 .m-dim, #ph1 .m-dimt', { opacity: [0, .4], duration: 360, delay: stagger(60) }, 380);

    /* 02 — the shell is rolled: rings first, then the skin lines */
    mt.add('#ph2', { opacity: [0, 1], duration: 150 }, 700)
      .add('#ph2 .m-ring', { opacity: [0, .3], scale: [.6, 1], duration: 520, delay: stagger(26) }, 720)
      .add('#ph2 .m-gen', { opacity: [0, .2], duration: 420, delay: stagger(18) }, 1080)
      .add('#ph2 .m-edge', { opacity: [0, .8], duration: 480 }, 1180);

    /* 03 — seams run, weld caps ripple in behind the arc */
    mt.add('#ph3', { opacity: [0, 1], duration: 120 }, 1500)
      .add(seamDraw, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(160) }, 1520)
      .add('#ph3 .m-bead', { opacity: [0, .75], scale: [.4, 1], duration: 300, delay: stagger(26) }, 1620)
      .add('#mArc', { opacity: [0, 1, 0], scale: [.5, 1.8], duration: 1100 }, 1540);

    /* 04 — skid, saddles, holding-down bolts */
    mt.add('#ph4', { opacity: [0, 1], duration: 150 }, 2300)
      .add('#ph4 .m-face', { opacity: [0, .62], y: [22, 0], duration: 500, delay: stagger(24) }, 2320)
      .add('#ph4 .m-saddle, #ph4 .m-rib', { opacity: [0, .5], duration: 420, delay: stagger(20) }, 2600)
      .add('#ph4 .m-bolt', { opacity: [0, .62], scale: [0, 1], duration: 300, delay: stagger(50) }, 2760);

    /* 05 — nozzles and the manway bolt-up */
    mt.add('#ph5', { opacity: [0, 1], duration: 150 }, 3000)
      .add('#ph5 .m-noz', { opacity: [0, .66], scaleY: [.2, 1], duration: 420, delay: stagger(16) }, 3020)
      .add('#ph5 .m-flange', { opacity: [0, .74], duration: 360, delay: stagger(20) }, 3220)
      .add('#ph5 .m-bolt', { opacity: [0, .62], rotate: [-90, 0], duration: 300, delay: stagger(22) }, 3360);

    /* 06 — pipework routed and flanged up */
    mt.add('#ph6', { opacity: [0, 1], duration: 120 }, 3700)
      .add(pipeDraw, { draw: ['0 0', '0 1'], duration: 900 }, 3720)
      .add('#ph6 .m-fl, #ph6 .m-bolt', { opacity: [0, .6], duration: 300, delay: stagger(26) }, 4100)
      .add('#ph6 .m-noz, #ph6 .m-spoke', { opacity: [0, .6], duration: 360, delay: stagger(22) }, 4260);

    /* 07 — pump and drive land on the skid */
    mt.add('#ph7', { opacity: [0, 1], duration: 150 }, 4600)
      .add('#ph7 .m-face', { opacity: [0, .62], x: [-26, 0], duration: 520, delay: stagger(30) }, 4620)
      .add('#ph7 .m-fin', { opacity: [0, .3], duration: 300, delay: stagger(14) }, 4860)
      .add('#ph7 .m-noz, #ph7 .m-bolt', { opacity: [0, .62], duration: 340, delay: stagger(18) }, 4980);

    /* 08 — access steel, instruments, tag plates */
    mt.add('#ph8', { opacity: [0, 1], duration: 150 }, 5300)
      .add('#ph8 .m-rail', { opacity: [0, .6], duration: 420, delay: stagger(26) }, 5320)
      .add('#ph8 .m-grate', { opacity: [0, .22], duration: 300, delay: stagger(12) }, 5480)
      .add('#ph8 .m-rung, #ph8 .m-cage', { opacity: [0, .45], x: [-14, 0], duration: 340, delay: stagger(16) }, 5600)
      .add('#ph8 .m-gauge, #ph8 .m-tick', { opacity: [0, .6], duration: 360, delay: stagger(10) }, 5860)
      .add('#mNeedle', { rotate: [0, 138], duration: 900, ease: 'out(3)' }, 5980)
      .add('#ph8 .m-tag', { opacity: [0, .42], duration: 400, delay: stagger(90) }, 6060);

    if (reduced) {
      mt.seek(mt.duration);
      mStage.textContent = STAGES[STAGES.length - 1];
      mPct.textContent = '100%';
    } else {
      /* the rig is live: the gauge needle breathes around its set point */
      var needle = document.getElementById('mNeedle');
      A.createTimer({
        duration: 5200, loop: true,
        onUpdate: function (self) {
          if (mt.currentTime < mt.duration * 0.94) return;
          var t = self.currentTime / 5200 * Math.PI * 2;
          utils.set(needle, { rotate: 138 + Math.sin(t) * 3.4 + Math.sin(t * 3.3) * 1.1 });
        }
      });

      /* page scroll is the crank: 0 at the top, 1 at the bottom */
      var mProg = { v: 0 };
      animate(mProg, {
        v: [0, 1],
        ease: 'linear',
        duration: 1000,
        onUpdate: function () {
          var p = utils.clamp(mProg.v, 0, 1);
          mt.seek(mt.duration * p);
          var idx = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));
          mStage.textContent = STAGES[idx];
          mPct.textContent = Math.round(p * 100) + '%';
          mBar.style.setProperty('--mp', (p * 100).toFixed(1) + '%');
        },
        autoplay: onScroll({
          target: document.documentElement,
          enter: 'top top',
          leave: 'bottom bottom',
          sync: true
        })
      });
    }
  }

  /* ─────────────────────────────────────────────────────── micro-reactions ─ */
  if (!reduced) {
    document.querySelectorAll('.gal__i').forEach(function (el) {
      el.addEventListener('mouseenter', function () { animate(el, { scale: 1.008, duration: 400, ease: EASE }); });
      el.addEventListener('mouseleave', function () { animate(el, { scale: 1, duration: 500, ease: EASE }); });
    });
  }
})();
