/* ==========================================================================
   Austek — the machine: a geared pump skid, built from M3 primitives.
   Scroll rotates it, pulls it apart, and each part brings its own callout.
   ========================================================================== */
(function () {
  'use strict';
  var svg = document.getElementById('m3');
  if (!svg || !window.M3 || !window.anime) return;

  var M = window.M3, V = M.V, A = window.anime;
  var utils = A.utils, animate = A.animate, onScroll = A.onScroll, stagger = A.stagger;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = new M.Scene(svg, { cx: 700, cy: 470, scale: 1.05, dist: 820 });

  var STEEL = '#5a646f', DARK = '#3c444e';

  /* ── the build ─────────────────────────────────────────────────────────── */
  var P = {};

  P.frame = scene.addPart({
    geo: M.box(620, 34, 320), origin: V(0, -168, 0), dir: V(0, -1, 0), spread: 0.9,
    color: '#333a43', key: 'frame'
  });
  P.railL = scene.addPart({
    geo: M.box(620, 46, 34), origin: V(0, -138, 143), dir: V(0, -1, 0.6), spread: 0.8,
    color: '#2e353d', key: 'frame'
  });
  P.railR = scene.addPart({
    geo: M.box(620, 46, 34), origin: V(0, -138, -143), dir: V(0, -1, -0.6), spread: 0.8,
    color: '#2e353d', key: 'frame'
  });

  P.casing = scene.addPart({
    geo: M.box(330, 210, 250), origin: V(-40, -30, 0), dir: V(0, 0.35, -1), spread: 1.25,
    color: '#4e5a67', opacity: 0.92, key: 'casing'
  });

  P.gearBig = scene.addPart({
    geo: M.swapYZ(M.gear(20, 108, 86, 36)), origin: V(-96, -26, 0),
    dir: V(-0.75, 0.62, 0.15), spread: 1.5, spin: 1,
    color: '#c08a3e', key: 'gears'
  });
  P.pinion = scene.addPart({
    geo: M.swapYZ(M.gear(12, 66, 50, 36)), origin: V(78, -26, 0),
    dir: V(0.45, 0.95, 0.2), spread: 1.5, spin: -1.667,
    color: '#b06f38', key: 'gears'
  });

  P.shaft = scene.addPart({
    geo: M.swapYX(M.cyl(15, 470, 14)), origin: V(40, -26, 0),
    dir: V(0.2, 0.7, 0.9), spread: 1.2, color: '#8d959e', key: 'shaft'
  });
  P.bearL = scene.addPart({
    geo: M.swapYX(M.cyl(38, 46, 16)), origin: V(-190, -26, 0),
    dir: V(-1, 0.15, 0.5), spread: 1.35, color: '#697380', key: 'shaft'
  });
  P.bearR = scene.addPart({
    geo: M.swapYX(M.cyl(38, 46, 16)), origin: V(232, -26, 0),
    dir: V(1, 0.15, -0.5), spread: 1.35, color: '#697380', key: 'shaft'
  });

  P.motor = scene.addPart({
    geo: M.swapYX(M.cyl(78, 210, 20)), origin: V(-300, -26, 0),
    dir: V(-1, 0.25, -0.35), spread: 1.4, color: '#37506b', key: 'motor'
  });
  for (var f = 0; f < 9; f++) {
    scene.addPart({
      geo: M.box(6, 172, 172), origin: V(-390 + f * 20, -26, 0),
      dir: V(-1, 0.25, -0.35), spread: 1.4, color: '#2f4560', key: 'motor'
    });
  }

  P.coupling = scene.addPart({
    geo: M.swapYX(M.cyl(46, 60, 14)), origin: V(-176, -26, 0),
    dir: V(-0.4, -0.8, 0.6), spread: 1.3, color: '#a8582f', key: 'motor'
  });

  P.pump = scene.addPart({
    geo: M.box(150, 150, 170), origin: V(268, -60, 0), dir: V(1, 0.3, 0.6), spread: 1.3,
    color: '#3f5d58', key: 'pump'
  });
  P.suction = scene.addPart({
    geo: M.swapYX(M.cyl(40, 120, 14)), origin: V(360, -60, 0),
    dir: V(1, 0.4, 0.7), spread: 1.35, color: '#4b6f6a', key: 'pump'
  });
  P.flange = scene.addPart({
    geo: M.swapYX(M.cyl(58, 16, 18)), origin: V(418, -60, 0),
    dir: V(1, 0.45, 0.75), spread: 1.4, color: '#5d837d', key: 'pump'
  });
  P.riser = scene.addPart({
    geo: M.cyl(28, 190, 14), origin: V(268, 60, 0), dir: V(0.3, 1, 0.55), spread: 1.25,
    color: '#4b6f6a', key: 'pump'
  });

  /* wiring loom + control box */
  P.conduit = scene.addPart({
    geo: M.box(300, 22, 22), origin: V(-120, 84, -120), dir: V(-0.3, 0.9, -1), spread: 1.45,
    color: '#6b4a5e', key: 'wiring'
  });
  P.conduit2 = scene.addPart({
    geo: M.box(22, 130, 22), origin: V(-266, 20, -120), dir: V(-0.5, 0.85, -1), spread: 1.45,
    color: '#6b4a5e', key: 'wiring'
  });
  P.ctrl = scene.addPart({
    geo: M.box(96, 128, 44), origin: V(40, 96, -128), dir: V(0.2, 1, -0.9), spread: 1.5,
    color: '#46504a', key: 'wiring'
  });
  for (var w = 0; w < 5; w++) {
    scene.addPart({
      geo: M.box(280, 5, 5), origin: V(-120, 74 + w * 7, -104 + w * 4),
      dir: V(-0.3, 0.9, -1), spread: 1.52,
      color: ['#c2603f','#c9a13c','#4f8fbf','#6fae74','#9a6fbf'][w], key: 'wiring'
    });
  }

  /* holding-down bolts */
  [[-260,140],[-260,-140],[260,140],[260,-140]].forEach(function (b) {
    scene.addPart({
      geo: M.cyl(11, 34, 8), origin: V(b[0], -146, b[1]), dir: V(0, -1, 0), spread: 1.9,
      color: '#7b838d', key: 'frame'
    });
  });

  /* ── render loop ───────────────────────────────────────────────────────── */
  scene.spinT = 0;
  var baseYaw = -0.5;

  function draw() {
    scene.render();
    positionCallouts();
  }

  /* ── callouts: leader lines from a part out to its content card ────────── */
  var lead = document.getElementById('m3Leads');
  var cards = [].slice.call(document.querySelectorAll('.mcard'));
  var leadEls = cards.map(function () {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('class', 'm3-lead');
    lead.appendChild(el);
    return el;
  });

  function positionCallouts() {
    var box = svg.getBoundingClientRect();
    var vb = 1400, vbh = 940;
    cards.forEach(function (card, i) {
      var part = P[card.dataset.part];
      if (!part) return;
      var on = card.classList.contains('is-on');
      var a = scene.anchorOf(part);
      var cr = card.getBoundingClientRect();
      /* card edge nearest the part, in svg user units */
      var ex = ((cr.left + (a.x > vb / 2 ? 0 : cr.width) - box.left) / box.width) * vb;
      var ey = ((cr.top + cr.height / 2 - box.top) / box.height) * vbh;
      leadEls[i].setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
                                   ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
      leadEls[i].setAttribute('opacity', on ? 0.55 : 0);
    });
  }

  /* ── scroll: rotate, pull apart, reveal each part's card in turn ───────── */
  var ORDER = ['frame', 'casing', 'gears', 'shaft', 'motor', 'pump', 'wiring'];

  function setProgress(p) {
    scene.yaw = baseYaw + p * Math.PI * 1.55;
    scene.pitch = -0.42 + Math.sin(p * Math.PI) * 0.20;
    /* hold assembled, pull apart through the middle, settle back */
    var e = p < 0.12 ? 0
          : p > 0.9  ? (1 - (p - 0.9) / 0.1) * 190
          : Math.sin(((p - 0.12) / 0.78) * Math.PI * 0.5) * 190;
    scene.explode = e;
    scene.spinT = p * Math.PI * 6;

    var idx = Math.min(ORDER.length - 1, Math.floor(((p - 0.1) / 0.78) * ORDER.length));
    cards.forEach(function (c) {
      c.classList.toggle('is-on', ORDER[idx] === c.dataset.key && p > 0.12 && p < 0.93);
    });
    var st = document.getElementById('m3Stage');
    if (st) st.textContent = (p < 0.12 ? 'Assembled' : p > 0.93 ? 'Reassembled' : cardName(ORDER[idx]));
    var bar = document.getElementById('m3Bar');
    if (bar) bar.style.setProperty('--mp', (p * 100).toFixed(1) + '%');
    draw();
  }

  function cardName(key) {
    var c = document.querySelector('.mcard[data-key="' + key + '"]');
    return c ? c.dataset.name : key;
  }

  if (reduced) {
    setProgress(0.5);
  } else {
    var prog = { v: 0 };
    animate(prog, {
      v: [0, 1], ease: 'linear', duration: 1000,
      onUpdate: function () { setProgress(utils.clamp(prog.v, 0, 1)); },
      autoplay: onScroll({
        target: document.documentElement,
        enter: 'top top', leave: 'bottom bottom', sync: true
      })
    });
    /* keep it alive even when the page is still */
    A.createTimer({
      duration: 16000, loop: true,
      onUpdate: function (t) {
        baseYaw = -0.5 + Math.sin(t.currentTime / 16000 * Math.PI * 2) * 0.05;
      }
    });
    setProgress(0);
  }

  window.addEventListener('resize', draw, { passive: true });
  window.__m3 = { scene: scene, setProgress: setProgress };
})();
