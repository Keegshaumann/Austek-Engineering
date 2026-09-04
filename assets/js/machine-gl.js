/* ==========================================================================
   Austek — the machine, rendered on the GPU.
   Real materials, real lights, real depth. Scroll turns it, pulls it apart,
   and each group of parts brings its own callout.
   ========================================================================== */
(function () {
  'use strict';
  var canvas = document.getElementById('m3c');
  if (!canvas || !window.THREE || !window.anime) return;

  var T = window.THREE, A = window.anime;
  var utils = A.utils, animate = A.animate, onScroll = A.onScroll;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── renderer ──────────────────────────────────────────────────────────── */
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(26, 1, 1, 6000);
  camera.position.set(215, 560, 1960);   /* owns the frame, stays clear of the edges */
  camera.lookAt(-10, -30, 0);

  /* ── an environment so metal has something to reflect ──────────────────── */
  (function () {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.00, '#3a424c');
    grad.addColorStop(0.45, '#22272d');
    grad.addColorStop(0.55, '#15181c');
    grad.addColorStop(1.00, '#0c0e10');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 512);
    /* a couple of soft highlights so metal has something to catch */
    var hl = g.createRadialGradient(64, 90, 4, 64, 90, 70);
    hl.addColorStop(0, 'rgba(255,226,190,.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(0, 0, 128, 220);
    var hl2 = g.createRadialGradient(20, 190, 2, 20, 190, 46);
    hl2.addColorStop(0, 'rgba(190,215,255,.5)'); hl2.addColorStop(1, 'rgba(190,215,255,0)');
    g.fillStyle = hl2; g.fillRect(0, 120, 128, 160);
    var tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    if ('colorSpace' in tex) tex.colorSpace = T.SRGBColorSpace;
    scene.environment = tex;
  })();

  scene.add(new T.HemisphereLight(0x6f7d8c, 0x0e1013, 0.34));

  /* key is deliberately soft — it models the form but does not define it */
  var key = new T.DirectionalLight(0xdfe6ee, 0.85);
  key.position.set(-420, 720, 520);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0015;
  var sc = key.shadow.camera;
  sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900;
  sc.near = 100; sc.far = 4200;
  scene.add(key);

  /* the rim does the work: warm, hard, from behind — this is the edge light
     that makes every silhouette read against the dark ground */
  var rimA = new T.DirectionalLight(0xffd9b0, 3.4);
  rimA.position.set(-260, 300, -820); scene.add(rimA);
  var rimB = new T.DirectionalLight(0xffc79a, 2.0);
  rimB.position.set(520, 120, -640); scene.add(rimB);
  var fill = new T.DirectionalLight(0x9fb6d4, 0.30);
  fill.position.set(620, 60, 380); scene.add(fill);

  var floor = new T.Mesh(
    new T.PlaneGeometry(4000, 4000),
    new T.ShadowMaterial({ opacity: 0.30 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -215;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── materials ─────────────────────────────────────────────────────────── */
  function mat(color, metal, rough) {
    return new T.MeshStandardMaterial({
      color: new T.Color(color), metalness: metal, roughness: rough
    });
  }
  /* One body colour. The form is read through rim light and silhouette, not
     through parts being different colours — that is what made it read as toys. */
  var GRAPHITE = 0x2a2d31;
  function body(v, rough) { return mat(v, 0.28, rough === undefined ? 0.52 : rough); }
  var MAT = {
    frame:   body(0x303338, 0.58),
    dark:    body(0x25282c, 0.62),
    casing:  body(0x33373c, 0.50),
    bronze:  body(0x35383d, 0.44),
    bronze2: body(0x303338, 0.46),
    steel:   body(0x3a3e44, 0.38),
    motor:   body(0x2b2e33, 0.55),
    copper:  body(0x35383d, 0.46),
    green:   body(0x2e3135, 0.54),
    painted: body(0x282b2f, 0.66),
    loom:    body(0x303338, 0.60)
  };

  /* ── geometry helpers ──────────────────────────────────────────────────── */
  function gearGeo(teeth, rOut, rRoot, thick) {
    var shape = new T.Shape(), ap = Math.PI * 2 / teeth;
    for (var i = 0; i < teeth; i++) {
      var a = i * ap;
      var p = [[rRoot, a], [rOut, a + ap * 0.27], [rOut, a + ap * 0.5], [rRoot, a + ap * 0.75]];
      for (var j = 0; j < 4; j++) {
        var x = Math.cos(p[j][1]) * p[j][0], y = Math.sin(p[j][1]) * p[j][0];
        if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
    }
    shape.closePath();
    var hole = new T.Path();
    hole.absarc(0, 0, rRoot * 0.26, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    var g = new T.ExtrudeGeometry(shape, {
      depth: thick, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2, curveSegments: 3
    });
    g.translate(0, 0, -thick / 2);
    return g;
  }

  var GROUPS = {};
  function part(geo, material, pos, key, dir, spread) {
    var m = new T.Mesh(geo, material);
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(pos[0], pos[1], pos[2]);
    m.userData.home = m.position.clone();
    m.userData.dir = new T.Vector3(dir[0], dir[1], dir[2]).normalize();
    m.userData.spread = spread === undefined ? 1 : spread;
    scene.add(m);
    (GROUPS[key] = GROUPS[key] || []).push(m);
    return m;
  }

  /* ── turned-part helpers ───────────────────────────────────────────────
     The assembly is lathe-work: concentric rings, knurled bands, curved
     shells. Boxes read as slabs under a rim light; turned forms give the
     thin bright crescent on the silhouette that reads as machined metal. */

  function disc(r, thick, seg) {
    var g = new T.CylinderGeometry(r, r, thick, seg || 64);
    g.rotateZ(Math.PI / 2);
    return g;
  }
  function taper(r1, r2, len, seg) {
    var g = new T.CylinderGeometry(r1, r2, len, seg || 64);
    g.rotateZ(Math.PI / 2);
    return g;
  }

  /* a stack of fine rings — the ribbing that gives the surface its grain */
  function ribbed(x0, len, r, count, rib, key, dir, spread, matr) {
    for (var i = 0; i < count; i++) {
      var x = x0 + (len * i / (count - 1));
      part(disc(r + rib, 4.5, 56), matr, [x, 0, 0], key, dir, spread);
    }
    part(taper(r, r, len, 64), matr, [x0 + len / 2, 0, 0], key, dir, spread);
  }

  /* knurling: fine axial teeth round a band */
  function knurl(x, r, teeth, width, key, dir, spread, matr) {
    part(disc(r - 3, width, 64), matr, [x, 0, 0], key, dir, spread);
    for (var i = 0; i < teeth; i++) {
      var a = i / teeth * Math.PI * 2;
      var t = new T.BoxGeometry(width, 7, 3.2);
      var m = part(t, matr, [x, Math.sin(a) * r, Math.cos(a) * r], key, dir, spread);
      m.rotation.x = -a;
    }
  }

  /* a curved cover plate — the pieces that lift away */
  function shell(x, len, r, thick, aStart, aLen, key, dir, spread, matr) {
    var sh = new T.Shape();
    sh.absarc(0, 0, r + thick, aStart, aStart + aLen, false);
    sh.absarc(0, 0, r, aStart + aLen, aStart, true);
    var g = new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 44 });
    g.rotateY(Math.PI / 2);
    g.translate(0, 0, 0);
    return part(g, matr, [x, 0, 0], key, dir, spread);
  }

  var BODY = MAT.casing, DEEP = MAT.dark, BRIGHT = MAT.steel;

  /* ── the assembly, on one axis ─────────────────────────────────────────── */

  /* nose: stepped concentric rings */
  part(disc(62, 16, 64),  BRIGHT, [-408, 0, 0], 'pump', [-1, .12, .3], 1.5);
  part(disc(74, 20, 64),  BODY,   [-392, 0, 0], 'pump', [-1, .12, .3], 1.5);
  part(taper(74, 96, 46), BODY,   [-360, 0, 0], 'pump', [-1, .12, .3], 1.5);
  part(disc(100, 14, 64), BRIGHT, [-334, 0, 0], 'pump', [-1, .12, .3], 1.5);

  /* knurled adjusting band */
  knurl(-300, 112, 78, 54, 'pump', [-1, .2, .25], 1.45, BODY);
  part(disc(116, 8, 64), BRIGHT, [-272, 0, 0], 'pump', [-1, .2, .25], 1.45);

  /* forward barrel, finely ribbed */
  ribbed(-258, 190, 122, 22, 4, 'casing', [-.35, .9, .25], 1.3, BODY);

  /* bolted mid flange */
  part(disc(150, 20, 64), DEEP, [-52, 0, 0], 'shaft', [.1, 1, .2], 1.25);
  for (var b = 0; b < 14; b++) {
    var ab = b / 14 * Math.PI * 2;
    part(new T.CylinderGeometry(7, 7, 26, 6), BRIGHT,
         [-52, Math.sin(ab) * 132, Math.cos(ab) * 132], 'shaft', [.1, 1, .2], 1.25);
  }

  /* main barrel */
  ribbed(-34, 196, 142, 26, 4, 'frame', [0, -1, .35], 1.2, BODY);

  /* cooling fin stack */
  for (var fi = 0; fi < 34; fi++) {
    part(disc(168, 5, 56), DEEP, [176 + fi * 5.4, 0, 0], 'motor', [1, .35, -.4], 1.4);
  }
  part(taper(150, 150, 190, 64), BODY, [265, 0, 0], 'motor', [1, .35, -.4], 1.4);

  /* rear cap with bolt circle */
  part(taper(150, 128, 44, 64), BODY, [382, 0, 0], 'motor', [1, .4, -.45], 1.45);
  part(disc(132, 16, 64), DEEP,  [408, 0, 0], 'motor', [1, .4, -.45], 1.45);
  for (var c2 = 0; c2 < 10; c2++) {
    var ac = c2 / 10 * Math.PI * 2;
    part(new T.CylinderGeometry(6, 6, 22, 6), BRIGHT,
         [412, Math.sin(ac) * 106, Math.cos(ac) * 106], 'motor', [1, .4, -.45], 1.45);
  }

  /* the two cover shells that lift away */
  shell(-238, 200, 126, 11, Math.PI * 0.18, Math.PI * 0.62, 'casing', [.15, 1, .55], 1.9, BODY);
  shell(-20, 210, 146, 11, Math.PI * 1.12, Math.PI * 0.60, 'casing', [-.1, -1, -.6], 1.9, BODY);

  /* what the covers hide: the gear train */
  var gearBig = part(gearGeo(22, 96, 76, 30), BRIGHT, [-140, 0, 0], 'gears', [0, .35, 1], 1.75);
  gearBig.rotation.y = Math.PI / 2;
  var pinion = part(gearGeo(13, 58, 44, 30), BRIGHT, [-140, 118, 0], 'gears', [.2, 1, .8], 1.75);
  pinion.rotation.y = Math.PI / 2;

  /* central shaft through the whole assembly */
  part(taper(26, 26, 780, 32), BRIGHT, [10, 0, 0], 'shaft', [0, .25, 1], 1.35);

  /* cable gland + conduit off the rear */
  part(new T.CylinderGeometry(26, 26, 60, 24), DEEP, [330, 120, 0], 'wiring', [.3, 1, -.7], 1.6);
  part(new T.CylinderGeometry(15, 15, 150, 20), BODY, [330, 190, 0], 'wiring', [.3, 1, -.7], 1.6);
  for (var k2 = 0; k2 < 5; k2++) {
    part(disc(30, 4, 40), BRIGHT, [316 + k2 * 7, 120, 0], 'wiring', [.3, 1, -.7], 1.6);
  }

  /* ── scroll choreography ───────────────────────────────────────────────── */
  var ORDER = ['frame', 'casing', 'gears', 'shaft', 'motor', 'pump', 'wiring'];
  var cards = [].slice.call(document.querySelectorAll('.mcard'));
  var leadSvg = document.getElementById('m3Leads');
  var leads = cards.map(function () {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('class', 'm3-lead');
    leadSvg.appendChild(el);
    return el;
  });
  var anchorFor = {};
  cards.forEach(function (c) { anchorFor[c.dataset.key] = GROUPS[c.dataset.key][0]; });

  var explode = 0, spinT = 0;
  var tmp = new T.Vector3();

  function layout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w * renderer.getPixelRatio() || camera.aspect !== w / h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function drawLeads() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    leadSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var box = canvas.getBoundingClientRect();
    cards.forEach(function (card, i) {
      var m = anchorFor[card.dataset.key];
      if (!m) return;
      var on = card.classList.contains('is-on');
      leads[i].setAttribute('opacity', on ? 0.5 : 0);
      if (!on) return;
      tmp.copy(m.position).project(camera);
      var ax = (tmp.x * 0.5 + 0.5) * w, ay = (-tmp.y * 0.5 + 0.5) * h;
      var cr = card.getBoundingClientRect();
      var ex = cr.left - box.left + (ax > w / 2 ? 0 : cr.width);
      var ey = cr.top - box.top + cr.height / 2;
      leads[i].setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) +
                                 ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
    });
  }

  function setProgress(p) {
    scene.rotation.y = -0.62 + p * Math.PI * 1.15;
    scene.rotation.x = -0.04 + Math.sin(p * Math.PI) * 0.12;
    explode = p < 0.12 ? 0
            : p > 0.9 ? (1 - (p - 0.9) / 0.1) * 34
            : Math.sin(((p - 0.12) / 0.78) * Math.PI * 0.5) * 34;
    spinT = p * Math.PI * 7;

    Object.keys(GROUPS).forEach(function (k) {
      GROUPS[k].forEach(function (m) {
        var d = m.userData;
        m.position.copy(d.home).addScaledVector(d.dir, explode * d.spread);
      });
    });


    var idx = Math.min(ORDER.length - 1, Math.floor(((p - 0.1) / 0.78) * ORDER.length));
    cards.forEach(function (c) {
      c.classList.toggle('is-on', ORDER[idx] === c.dataset.key && p > 0.12 && p < 0.93);
    });
    var st = document.getElementById('m3Stage');
    if (st) st.textContent = p < 0.12 ? 'Assembled' : p > 0.93 ? 'Reassembled'
            : (document.querySelector('.mcard[data-key="' + ORDER[idx] + '"]') || {}).dataset.name;
    var bar = document.getElementById('m3Bar');
    if (bar) bar.style.setProperty('--mp', (p * 100).toFixed(1) + '%');
  }

  function frame() {
    layout();
    renderer.render(scene, camera);
    drawLeads();
  }

  if (reduced) {
    setProgress(0.45); frame();
  } else {
    var prog = { v: 0 };
    animate(prog, {
      v: [0, 1], ease: 'linear', duration: 1000,
      onUpdate: function () { setProgress(utils.clamp(prog.v, 0, 1)); },
      autoplay: onScroll({
        target: document.documentElement,
        enter: 'top top', leave: 'bottom bottom',
        sync: 0.12          /* eased follow, not a hard 1:1 snap */
      })
    });
    /* one render loop, always live */
    /* the drive never stops — it turns whether or not the page is moving */
    var idle = 0;
    A.createTimer({
      duration: 1e9, loop: true,
      onUpdate: function (t) {
        idle = t.currentTime * 0.00055;
        gearBig.rotation.z = idle;
        pinion.rotation.z = -idle * 20 / 12;
        frame();
      }
    });
    setProgress(0);
    layout();
    frame();   /* size and paint once up front, before the first rAF tick */
  }

  window.addEventListener('resize', function () { layout(); frame(); }, { passive: true });
  window.__gl = { scene: scene, camera: camera, renderer: renderer, setProgress: setProgress, groups: GROUPS, frame: frame };
})();
