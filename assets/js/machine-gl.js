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
  var camera = new T.PerspectiveCamera(34, 1, 1, 5000);
  camera.position.set(0, 210, 900);
  camera.lookAt(0, -10, 0);

  /* ── an environment so metal has something to reflect ──────────────────── */
  (function () {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.00, '#9fb4c9');
    grad.addColorStop(0.45, '#54606e');
    grad.addColorStop(0.55, '#2b3138');
    grad.addColorStop(1.00, '#14171a');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 512);
    /* a couple of soft highlights so metal has something to catch */
    var hl = g.createRadialGradient(64, 90, 4, 64, 90, 70);
    hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(0, 0, 128, 220);
    var hl2 = g.createRadialGradient(20, 190, 2, 20, 190, 46);
    hl2.addColorStop(0, 'rgba(190,215,255,.5)'); hl2.addColorStop(1, 'rgba(190,215,255,0)');
    g.fillStyle = hl2; g.fillRect(0, 120, 128, 160);
    var tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    if ('colorSpace' in tex) tex.colorSpace = T.SRGBColorSpace;
    scene.environment = tex;
  })();

  scene.add(new T.HemisphereLight(0xbcd2e8, 0x14171a, 0.55));
  var key = new T.DirectionalLight(0xfff3e2, 2.4);
  key.position.set(-380, 700, 460);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0015;
  var sc = key.shadow.camera;
  sc.left = -700; sc.right = 700; sc.top = 700; sc.bottom = -700;
  sc.near = 100; sc.far = 2200;
  scene.add(key);

  /* a floor the machine can actually sit on — catches the shadow, shows nothing else */
  var floor = new T.Mesh(
    new T.PlaneGeometry(3000, 3000),
    new T.ShadowMaterial({ opacity: 0.42 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -215;
  floor.receiveShadow = true;
  scene.add(floor);
  var fill = new T.DirectionalLight(0x8fb4ff, 0.6);
  fill.position.set(520, 180, 300); scene.add(fill);
  var rim = new T.DirectionalLight(0xff9a4d, 0.85);
  rim.position.set(240, 160, -560); scene.add(rim);

  /* ── materials ─────────────────────────────────────────────────────────── */
  function mat(color, metal, rough) {
    return new T.MeshStandardMaterial({
      color: new T.Color(color), metalness: metal, roughness: rough
    });
  }
  var MAT = {
    frame:   mat(0x59636e, 0.85, 0.42),
    dark:    mat(0x39424c, 0.80, 0.50),
    casing:  mat(0x5d6b7a, 0.55, 0.42),
    bronze:  mat(0xc4903f, 0.95, 0.26),
    bronze2: mat(0xb0713a, 0.95, 0.30),
    steel:   mat(0x99a3ad, 0.92, 0.22),
    motor:   mat(0x2f4f74, 0.60, 0.40),
    copper:  mat(0xb2622f, 0.90, 0.32),
    green:   mat(0x3d6a62, 0.55, 0.45),
    painted: mat(0x47524b, 0.25, 0.62),
    loom:    mat(0x6b4a5e, 0.35, 0.60)
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

  /* ── the build ─────────────────────────────────────────────────────────── */
  part(new T.BoxGeometry(640, 34, 330), MAT.dark,  [0, -170, 0],    'frame', [0, -1, 0], 0.9);
  part(new T.BoxGeometry(640, 48, 36),  MAT.frame, [0, -140, 148],  'frame', [0, -1, .7], 0.85);
  part(new T.BoxGeometry(640, 48, 36),  MAT.frame, [0, -140, -148], 'frame', [0, -1, -.7], 0.85);
  [[-270, 150], [-270, -150], [270, 150], [270, -150]].forEach(function (b) {
    part(new T.CylinderGeometry(12, 12, 40, 12), MAT.steel, [b[0], -148, b[1]], 'frame', [0, -1, 0], 1.9);
  });

  part(new T.BoxGeometry(340, 215, 255), MAT.casing, [-40, -28, 0], 'casing', [0, .4, -1], 1.35);

  var gearBig = part(gearGeo(20, 110, 88, 38), MAT.bronze,  [-98, -26, 0], 'gears', [-.8, .6, .2], 1.55);
  var pinion  = part(gearGeo(12, 68, 52, 38),  MAT.bronze2, [80, -26, 0],  'gears', [.5, 1, .25], 1.55);

  var shaft = new T.CylinderGeometry(16, 16, 480, 20);
  shaft.rotateZ(Math.PI / 2);
  part(shaft, MAT.steel, [40, -26, 0], 'shaft', [.2, .75, .95], 1.25);
  [[-195, [-1, .15, .5]], [238, [1, .15, -.5]]].forEach(function (b) {
    var g = new T.CylinderGeometry(40, 40, 50, 24);
    g.rotateZ(Math.PI / 2);
    part(g, MAT.frame, [b[0], -26, 0], 'shaft', b[1], 1.4);
  });

  var motor = new T.CylinderGeometry(80, 80, 215, 28);
  motor.rotateZ(Math.PI / 2);
  part(motor, MAT.motor, [-305, -26, 0], 'motor', [-1, .25, -.35], 1.45);
  for (var f = 0; f < 10; f++) {
    part(new T.BoxGeometry(5, 176, 176), MAT.motor, [-398 + f * 20, -26, 0], 'motor', [-1, .25, -.35], 1.45);
  }
  var coup = new T.CylinderGeometry(48, 48, 62, 20);
  coup.rotateZ(Math.PI / 2);
  part(coup, MAT.copper, [-180, -26, 0], 'motor', [-.4, -.85, .6], 1.35);

  part(new T.BoxGeometry(155, 155, 175), MAT.green, [272, -58, 0], 'pump', [1, .3, .6], 1.35);
  var suc = new T.CylinderGeometry(42, 42, 130, 20);
  suc.rotateZ(Math.PI / 2);
  part(suc, MAT.green, [368, -58, 0], 'pump', [1, .4, .7], 1.4);
  var fl = new T.CylinderGeometry(60, 60, 18, 24);
  fl.rotateZ(Math.PI / 2);
  part(fl, MAT.steel, [428, -58, 0], 'pump', [1, .45, .75], 1.45);
  part(new T.CylinderGeometry(30, 30, 200, 20), MAT.green, [272, 62, 0], 'pump', [.3, 1, .55], 1.3);

  part(new T.BoxGeometry(310, 24, 24), MAT.loom, [-120, 88, -125], 'wiring', [-.3, .9, -1], 1.5);
  part(new T.BoxGeometry(24, 135, 24), MAT.loom, [-270, 22, -125], 'wiring', [-.5, .85, -1], 1.5);
  part(new T.BoxGeometry(100, 132, 46), MAT.painted, [40, 100, -132], 'wiring', [.2, 1, -.9], 1.55);
  ['#c2603f', '#c9a13c', '#4f8fbf', '#6fae74', '#9a6fbf'].forEach(function (c, i) {
    part(new T.BoxGeometry(290, 6, 6), mat(new T.Color(c).getHex(), 0.2, 0.65),
         [-120, 76 + i * 7, -108 + i * 4], 'wiring', [-.3, .9, -1], 1.58);
  });

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
    scene.rotation.y = -0.5 + p * Math.PI * 1.6;
    scene.rotation.x = -0.06 + Math.sin(p * Math.PI) * 0.16;
    explode = p < 0.12 ? 0
            : p > 0.9 ? (1 - (p - 0.9) / 0.1) * 210
            : Math.sin(((p - 0.12) / 0.78) * Math.PI * 0.5) * 210;
    spinT = p * Math.PI * 7;

    Object.keys(GROUPS).forEach(function (k) {
      GROUPS[k].forEach(function (m) {
        var d = m.userData;
        m.position.copy(d.home).addScaledVector(d.dir, explode * d.spread);
      });
    });
    gearBig.rotation.z = spinT;
    pinion.rotation.z = -spinT * 20 / 12;

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
    A.createTimer({
      duration: 1e9, loop: true,
      onUpdate: function () { frame(); }
    });
    setProgress(0);
    layout();
    frame();   /* size and paint once up front, before the first rAF tick */
  }

  window.addEventListener('resize', function () { layout(); frame(); }, { passive: true });
  window.__gl = { scene: scene, renderer: renderer, setProgress: setProgress, groups: GROUPS, frame: frame };
})();
