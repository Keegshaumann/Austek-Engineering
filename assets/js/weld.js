/* ==========================================================
   Austek Engineering CC — weld motif
   Three pieces, all decorative and all droppable:
     1. hero()      torch running the seam under the hero panel
     2. sideSeam()  a seam down the page gutter that welds as
                    you scroll, cooling behind the torch line
     3. weldBoxes() a bead that traces a few boxes on reveal
   Plain canvas + SVG, no library.
   ========================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- shared: heat -> colour ---------- */
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
    var c0 = STOPS[i], c1 = STOPS[i + 1];
    var f = (h - c0[0]) / (c1[0] - c0[0] || 1);
    if (f < 0) f = 0; else if (f > 1) f = 1;
    return 'rgba(' +
      Math.round(c0[1] + (c1[1] - c0[1]) * f) + ',' +
      Math.round(c0[2] + (c1[2] - c0[2]) * f) + ',' +
      Math.round(c0[3] + (c1[3] - c0[3]) * f) + ',' + a + ')';
  }

  function makeSpark(x, y, up) {
    var ang = (up ? Math.PI : 0) + (Math.random() - 0.5) * 2.1;
    var sp = 70 + Math.random() * 240;
    return {
      x: x, y: y,
      vx: Math.cos(ang) * sp * 0.42 + (up ? 42 : 0),
      vy: (up ? -Math.abs(Math.sin(ang)) * sp * 0.85 - 40 : Math.sin(ang) * sp * 0.6),
      life: 0.28 + Math.random() * 0.72, age: 0,
      w: 0.7 + Math.random() * 1.5
    };
  }
  function stepSparks(list, dt) {
    for (var s, k = list.length - 1; k >= 0; k--) {
      s = list[k]; s.age += dt;
      if (s.age >= s.life) { list.splice(k, 1); continue; }
      s.vy += 620 * dt;
      s.vx *= (1 - 1.5 * dt);
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
  }
  function drawSparks(ctx, list) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i], k = 1 - s.age / s.life;
      if (k <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.018, s.y - s.vy * 0.018);
      ctx.strokeStyle = heatColor(k * 0.95, k);
      ctx.lineWidth = s.w; ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  /* ==========================================================
     1 · HERO SEAM
     ========================================================== */
  function hero() {
    var cv = $('#weld');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), host = cv.parentElement;
    var W = 0, H = 0, dpr = 1;
    var SAMPLES = 220, heat = new Float32Array(SAMPLES), sparks = [];
    var head = 0.34, speed = 0.105;
    var running = false, raf = 0, last = 0;

    function seamY(t) {
      return H * 0.93 + Math.sin(t * Math.PI * 1.7) * H * 0.028
                      + Math.sin(t * Math.PI * 4.3 + 1.2) * H * 0.009;
    }
    function seamX(t) { return -W * 0.04 + t * W * 1.08; }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function base() {
      ctx.beginPath();
      for (var i = 0; i <= SAMPLES; i++) {
        var t = i / SAMPLES;
        i ? ctx.lineTo(seamX(t), seamY(t)) : ctx.moveTo(seamX(t), seamY(t));
      }
      ctx.strokeStyle = 'rgba(236,234,230,.10)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(236,234,230,.05)'; ctx.lineWidth = 1; ctx.stroke();
    }
    function bead() {
      for (var i = 0; i < SAMPLES - 1; i++) {
        var h = heat[i];
        if (h <= 0.012) continue;
        var t0 = i / SAMPLES, t1 = (i + 1) / SAMPLES;
        ctx.beginPath();
        ctx.moveTo(seamX(t0), seamY(t0)); ctx.lineTo(seamX(t1), seamY(t1));
        ctx.strokeStyle = heatColor(h, Math.min(1, 0.35 + h));
        ctx.lineWidth = 3.5 + h * 9; ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    function glow(x, y) {
      var r = 130, g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,248,232,.85)');
      g.addColorStop(0.16, 'rgba(255,186,88,.42)');
      g.addColorStop(0.45, 'rgba(255,91,26,.16)');
      g.addColorStop(1, 'rgba(255,91,26,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,252,244,.95)';
      ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fill();
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000 || 0, 0.05); last = now;
      head += speed * dt;
      if (head > 1.12) head = -0.06;
      var idx = Math.round(head * SAMPLES);
      for (var j = idx - 2; j <= idx + 1; j++) if (j >= 0 && j < SAMPLES) heat[j] = 1;
      var decay = Math.exp(-dt * 0.5);
      for (var i = 0; i < SAMPLES; i++) heat[i] *= decay;
      var hx = seamX(head), hy = seamY(head);
      stepSparks(sparks, dt);
      if (head >= 0 && head <= 1 && sparks.length < 170)
        for (var s = 0; s < 4; s++) sparks.push(makeSpark(hx, hy, true));
      ctx.clearRect(0, 0, W, H);
      base();
      ctx.globalCompositeOperation = 'lighter';
      bead(); drawSparks(ctx, sparks);
      if (head >= 0 && head <= 1) glow(hx, hy);
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    resize();
    for (var i = 0; i < SAMPLES; i++) {
      var d = (head * SAMPLES - i) / SAMPLES;
      heat[i] = (d > 0 && d < 0.55) ? Math.max(0, 1 - d / 0.55) : 0;
    }
    if (reduced) { ctx.clearRect(0, 0, W, H); base(); ctx.globalCompositeOperation = 'lighter'; bead(); ctx.globalCompositeOperation = 'source-over'; return; }

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(host);
    } else start();
  }

  /* ==========================================================
     2 · SIDE SEAM — scroll progress, drawn as a weld bead
     Straight track so it reads as a bar; the filled length is
     how far through the page you are. Weld character comes from
     the stacked ripples in the bead, not from a wandering line.
     ========================================================== */
  function sideSeam() {
    if (reduced) return;
    if (!window.matchMedia('(min-width: 1000px)').matches) return;

    var cv = document.createElement('canvas');
    cv.className = 'weld-side';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);

    var ctx = cv.getContext('2d');
    if (!ctx) return;

    var W = 46, H = 0, dpr = 1;
    var X = 22;          // bar centre
    var BAR = 7;         // bar width
    var TOP = 76;        // clear the fixed header so the head is never hidden
    var GAP = 18;        // breathing room at the bottom
    var HOT = 38;        // only the last stretch behind the head glows
    var sparks = [], raf = 0, last = 0, running = false;
    var lastScroll = window.scrollY, vel = 0, shown = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function progress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      var p = window.scrollY / max;
      return p < 0 ? 0 : p > 1 ? 1 : p;
    }

    /* stacked crescents, the way a real bead looks */
    function ripples(toY) {
      ctx.lineWidth = 1.1;
      for (var y = TOP + 3; y < toY; y += 5) {
        var hot = Math.max(0, 1 - (toY - y) / HOT);
        ctx.beginPath();
        ctx.arc(X, y, BAR / 2 - 0.6, Math.PI * 0.12, Math.PI * 0.88);
        ctx.strokeStyle = hot > 0.05
          ? heatColor(Math.min(1, 0.55 + hot * 0.45), 0.5)
          : 'rgba(255,214,180,.20)';
        ctx.stroke();
      }
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000 || 0, 0.05); last = now;
      var sy = window.scrollY;
      vel = vel * 0.86 + Math.abs(sy - lastScroll) * 0.14;
      lastScroll = sy;

      var target = progress();
      shown += (target - shown) * Math.min(1, dt * 9);
      var botY = H - GAP;
      var fy = TOP + shown * Math.max(0, botY - TOP);

      ctx.clearRect(0, 0, W, H);

      /* empty channel, full height */
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X, TOP); ctx.lineTo(X, botY);
      ctx.strokeStyle = 'rgba(150,140,130,.22)';
      ctx.lineWidth = BAR;
      ctx.stroke();

      /* filled length — the welded run */
      if (fy > TOP + 1) {
        var span = Math.max(1, fy - TOP);
        var g = ctx.createLinearGradient(0, TOP, 0, fy);
        g.addColorStop(0, 'rgba(150,86,48,.95)');
        g.addColorStop(Math.max(0, Math.min(0.999, 1 - HOT / span)), 'rgba(196,104,50,.98)');
        g.addColorStop(1, 'rgba(255,150,60,1)');
        ctx.beginPath();
        ctx.moveTo(X, TOP); ctx.lineTo(X, fy);
        ctx.strokeStyle = g;
        ctx.lineWidth = BAR;
        ctx.stroke();

        ripples(fy);
      }

      /* head: the arc sitting at the fill point */
      ctx.globalCompositeOperation = 'lighter';
      var moving = vel > 0.6 && target < 0.999;
      if (fy > TOP) {
        var rad = moving ? 34 : 15;
        var gg = ctx.createRadialGradient(X, fy, 0, X, fy, rad);
        gg.addColorStop(0, moving ? 'rgba(255,248,232,.95)' : 'rgba(255,196,130,.5)');
        gg.addColorStop(0.25, 'rgba(255,186,88,.34)');
        gg.addColorStop(1, 'rgba(255,91,26,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(X, fy, rad, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = moving ? 'rgba(255,253,247,.98)' : 'rgba(255,178,116,.9)';
        ctx.beginPath(); ctx.arc(X, fy, moving ? BAR / 2 : BAR / 2 - 1.2, 0, Math.PI * 2); ctx.fill();

        if (moving && sparks.length < 80 && Math.random() < 0.75)
          for (var k = 0; k < 2; k++) sparks.push(makeSpark(X, fy, Math.random() > 0.4));
      }
      stepSparks(sparks, dt);
      drawSparks(ctx, sparks);
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    resize();
    shown = progress();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  }

  /* ==========================================================
     3 · WELD BOXES — a bead traces the outline on reveal
     ========================================================== */
  function weldBoxes() {
    var targets = $$('[data-weldbox]');
    if (!targets.length) return;

    var NS = 'http://www.w3.org/2000/svg';

    targets.forEach(function (el) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'weldbox');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('preserveAspectRatio', 'none');

      var beadEl = document.createElementNS(NS, 'rect');
      beadEl.setAttribute('class', 'wb-bead');
      var tipEl = document.createElementNS(NS, 'rect');
      tipEl.setAttribute('class', 'wb-tip');

      svg.appendChild(beadEl); svg.appendChild(tipEl);
      el.appendChild(svg);
      el.classList.add('weldbox-host');

      function fit() {
        var r = el.getBoundingClientRect();
        var w = Math.max(1, r.width), h = Math.max(1, r.height);
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        [beadEl, tipEl].forEach(function (n) {
          n.setAttribute('x', 1); n.setAttribute('y', 1);
          n.setAttribute('width', Math.max(1, w - 2));
          n.setAttribute('height', Math.max(1, h - 2));
        });
        var p = 2 * (w + h);
        el.style.setProperty('--wb-p', p);
        beadEl.style.strokeDasharray = p;
        tipEl.style.strokeDasharray = '18 ' + (p - 18);
      }
      fit();

      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(el);
      else window.addEventListener('resize', fit, { passive: true });

      if (reduced) { el.classList.add('is-welded'); return; }

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          io.disconnect();
          fit();
          el.classList.add('is-welded');
        }, { rootMargin: '0px 0px -12% 0px' });
        io.observe(el);
      } else {
        el.classList.add('is-welded');
      }
    });
  }

  /* ---------- boot ---------- */
  hero();
  sideSeam();
  weldBoxes();
})();
