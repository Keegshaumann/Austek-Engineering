/* ==========================================================
   Austek Engineering CC — hero weld animation
   A torch runs a seam, laying a bead that cools through the
   heat colours and throwing sparks. Plain canvas, no deps.
   Purely decorative: the hero reads fine without it.
   ========================================================== */
(function () {
  'use strict';

  var cv = document.getElementById('weld');
  if (!cv || !cv.getContext) return;

  var ctx = cv.getContext('2d');
  var hero = cv.parentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1;
  var SAMPLES = 220;          // bead resolution along the seam
  var heat = new Float32Array(SAMPLES);
  var sparks = [];
  var MAX_SPARKS = 170;
  var head = 0.34;            // torch starts mid-seam so the hero looks alive on load
  var speed = 0.105;          // seam lengths per second
  var running = false, raf = 0, last = 0;

  /* ---------- geometry ---------- */
  function seamY(t) {
    return H * 0.93
         + Math.sin(t * Math.PI * 1.7) * H * 0.028
         + Math.sin(t * Math.PI * 4.3 + 1.2) * H * 0.009;
  }
  function seamX(t) { return -W * 0.04 + t * W * 1.08; }

  /* ---------- heat -> colour ---------- */
  var STOPS = [
    [0.00, 46, 42, 38],
    [0.12, 120, 44, 18],
    [0.30, 214, 74, 20],
    [0.52, 255, 128, 32],
    [0.74, 255, 190, 92],
    [1.00, 255, 246, 226]
  ];
  function heatColor(h, a) {
    var i = 0;
    while (i < STOPS.length - 2 && h > STOPS[i + 1][0]) i++;
    var a0 = STOPS[i], a1 = STOPS[i + 1];
    var f = (h - a0[0]) / (a1[0] - a0[0] || 1);
    if (f < 0) f = 0; else if (f > 1) f = 1;
    return 'rgba(' +
      Math.round(a0[1] + (a1[1] - a0[1]) * f) + ',' +
      Math.round(a0[2] + (a1[2] - a0[2]) * f) + ',' +
      Math.round(a0[3] + (a1[3] - a0[3]) * f) + ',' + a + ')';
  }

  /* ---------- sizing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- sparks ---------- */
  function spawnSparks(x, y, n) {
    for (var i = 0; i < n && sparks.length < MAX_SPARKS; i++) {
      var ang = Math.PI + (Math.random() - 0.5) * 2.1;     // fan upward
      var sp = 70 + Math.random() * 260;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp * 0.42 + 42,
        vy: -Math.abs(Math.sin(ang)) * sp * 0.85 - 40,
        life: 0.28 + Math.random() * 0.72,
        age: 0,
        w: 0.7 + Math.random() * 1.5
      });
    }
  }

  /* ---------- drawing ---------- */
  function drawSeamBase() {
    ctx.beginPath();
    for (var i = 0; i <= SAMPLES; i++) {
      var t = i / SAMPLES, x = seamX(t), y = seamY(t);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = 'rgba(236,234,230,.10)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(236,234,230,.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawBead() {
    for (var i = 0; i < SAMPLES - 1; i++) {
      var h = heat[i];
      if (h <= 0.012) continue;
      var t0 = i / SAMPLES, t1 = (i + 1) / SAMPLES;
      ctx.beginPath();
      ctx.moveTo(seamX(t0), seamY(t0));
      ctx.lineTo(seamX(t1), seamY(t1));
      ctx.strokeStyle = heatColor(h, Math.min(1, 0.35 + h));
      ctx.lineWidth = 3.5 + h * 9;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function drawGlow(x, y) {
    var r = 130;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,248,232,.85)');
    g.addColorStop(0.16, 'rgba(255,186,88,.42)');
    g.addColorStop(0.45, 'rgba(255,91,26,.16)');
    g.addColorStop(1, 'rgba(255,91,26,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,252,244,.95)';
    ctx.beginPath();
    ctx.arc(x, y, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSparks() {
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      var k = 1 - s.age / s.life;
      if (k <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.018, s.y - s.vy * 0.018);
      ctx.strokeStyle = heatColor(k * 0.95, k);
      ctx.lineWidth = s.w;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  /* ---------- frame ---------- */
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;

    head += speed * dt;
    if (head > 1.12) { head = -0.06; }

    // deposit heat under the torch
    var idx = Math.round(head * SAMPLES);
    for (var j = idx - 2; j <= idx + 1; j++) {
      if (j >= 0 && j < SAMPLES) heat[j] = 1;
    }
    // cool everything
    var decay = Math.exp(-dt * 0.5);
    for (var i = 0; i < SAMPLES; i++) heat[i] *= decay;

    var hx = seamX(head), hy = seamY(head);

    // advance sparks
    for (var s, k = sparks.length - 1; k >= 0; k--) {
      s = sparks[k];
      s.age += dt;
      if (s.age >= s.life) { sparks.splice(k, 1); continue; }
      s.vy += 620 * dt;            // gravity
      s.vx *= (1 - 1.5 * dt);      // drag
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    if (head >= 0 && head <= 1) spawnSparks(hx, hy, 4);

    // render
    ctx.clearRect(0, 0, W, H);
    drawSeamBase();
    ctx.globalCompositeOperation = 'lighter';
    drawBead();
    drawSparks();
    if (head >= 0 && head <= 1) drawGlow(hx, hy);
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(frame);
  }

  /* ---------- static frame for reduced motion ---------- */
  function drawStatic() {
    resize();
    for (var i = 0; i < SAMPLES; i++) heat[i] = Math.max(0, 0.5 - i / SAMPLES * 0.5);
    ctx.clearRect(0, 0, W, H);
    drawSeamBase();
    ctx.globalCompositeOperation = 'lighter';
    drawBead();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- lifecycle ---------- */
  function start() {
    if (running || reduced) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  if (reduced) { drawStatic(); return; }

  // Pre-warm the bead behind the torch so the first frame shows hot metal.
  (function seedBead() {
    for (var i = 0; i < SAMPLES; i++) {
      var d = (head * SAMPLES - i) / SAMPLES;
      heat[i] = (d > 0 && d < 0.55) ? Math.max(0, 1 - d / 0.55) : 0;
    }
  })();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); }, 150);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(hero);
  } else {
    start();
  }
})();
