/* ==========================================================================
   Austek — a small flat-shaded 3D core, rendered to SVG.
   Painter's algorithm, per-face lambert shading, parts that explode outward
   and carry their own callout. No dependencies.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ── maths ─────────────────────────────────────────────────────────────── */
  var V = function (x, y, z) { return { x: x, y: y, z: z }; };
  function add(a, b) { return V(a.x + b.x, a.y + b.y, a.z + b.z); }
  function sub(a, b) { return V(a.x - b.x, a.y - b.y, a.z - b.z); }
  function scale(a, s) { return V(a.x * s, a.y * s, a.z * s); }
  function cross(a, b) {
    return V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function norm(a) {
    var l = Math.hypot(a.x, a.y, a.z) || 1;
    return V(a.x / l, a.y / l, a.z / l);
  }

  /* ── geometry builders ─────────────────────────────────────────────────── */
  function box(w, h, d) {
    var x = w / 2, y = h / 2, z = d / 2;
    return {
      verts: [V(-x,-y,-z),V(x,-y,-z),V(x,y,-z),V(-x,y,-z),
              V(-x,-y, z),V(x,-y, z),V(x,y, z),V(-x,y, z)],
      faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]
    };
  }

  /* prism along Y */
  function cyl(r, h, seg, r2) {
    r2 = (r2 === undefined) ? r : r2;
    var verts = [], faces = [], i;
    for (i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2;
      verts.push(V(Math.cos(a) * r, -h / 2, Math.sin(a) * r));
      verts.push(V(Math.cos(a) * r2, h / 2, Math.sin(a) * r2));
    }
    for (i = 0; i < seg; i++) {
      var j = (i + 1) % seg;
      faces.push([i * 2, j * 2, j * 2 + 1, i * 2 + 1]);
    }
    var top = [], bot = [];
    for (i = 0; i < seg; i++) { top.push(i * 2 + 1); bot.push((seg - 1 - i) * 2); }
    faces.push(top); faces.push(bot);
    return { verts: verts, faces: faces };
  }

  /* extruded spur gear, axis along Y */
  function gear(teeth, rOut, rRoot, thick) {
    var prof = [], i;
    for (i = 0; i < teeth; i++) {
      var ap = Math.PI * 2 / teeth, a = i * ap;
      prof.push([rRoot, a], [rOut, a + ap * 0.26], [rOut, a + ap * 0.5], [rRoot, a + ap * 0.76]);
    }
    var verts = [], faces = [], n = prof.length;
    for (i = 0; i < n; i++) {
      var r = prof[i][0], t = prof[i][1];
      verts.push(V(Math.cos(t) * r, -thick / 2, Math.sin(t) * r));
      verts.push(V(Math.cos(t) * r,  thick / 2, Math.sin(t) * r));
    }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      faces.push([i * 2, j * 2, j * 2 + 1, i * 2 + 1]);
    }
    var top = [], bot = [];
    for (i = 0; i < n; i++) { top.push(i * 2 + 1); bot.push((n - 1 - i) * 2); }
    faces.push(top); faces.push(bot);
    return { verts: verts, faces: faces };
  }

  /* lay a Y-axis solid down so it reads as a wheel or a barrel */
  function swapYZ(geo) {
    return { verts: geo.verts.map(function (v) { return V(v.x, v.z, v.y); }), faces: geo.faces };
  }
  function swapYX(geo) {
    return { verts: geo.verts.map(function (v) { return V(v.y, v.x, v.z); }), faces: geo.faces };
  }

  /* ── shading ───────────────────────────────────────────────────────────── */
  var LIGHT = norm(V(-0.45, 0.82, 0.36));

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(Math.min(255, r * amt));
    g = Math.round(Math.min(255, g * amt));
    b = Math.round(Math.min(255, b * amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ── scene ─────────────────────────────────────────────────────────────── */
  function Scene(svgEl, opts) {
    opts = opts || {};
    this.svg = svgEl;
    this.parts = [];
    this.cx = opts.cx || 700;
    this.cy = opts.cy || 500;
    this.fov = opts.fov || 1500;
    this.dist = opts.dist || 900;
    this.scale = opts.scale || 1;
    this.yaw = 0; this.pitch = -0.42; this.explode = 0;
    this.pool = [];
    this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.group);
  }

  Scene.prototype.addPart = function (part) {
    part.origin = part.origin || V(0, 0, 0);
    part.dir = part.dir || V(0, 1, 0);
    part.spin = part.spin || 0;
    this.parts.push(part);
    return part;
  };

  Scene.prototype.project = function (p) {
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var x = p.x * cy - p.z * sy;
    var z = p.x * sy + p.z * cy;
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var y = p.y * cp - z * sp;
    var zz = p.y * sp + z * cp;
    var d = this.fov / (this.fov + zz + this.dist);
    return { x: this.cx + x * d * this.scale, y: this.cy - y * d * this.scale, z: zz };
  };

  Scene.prototype.render = function () {
    var self = this, tris = [];

    this.parts.forEach(function (part) {
      var off = scale(part.dir, self.explode * (part.spread === undefined ? 1 : part.spread));
      var spin = part.spin ? part.spin * self.spinT : 0;
      var cs = Math.cos(spin), sn = Math.sin(spin);

      var world = part.geo.verts.map(function (v) {
        var vx = v.x, vz = v.z;
        if (spin) { vx = v.x * cs - v.z * sn; vz = v.x * sn + v.z * cs; }
        return add(add(V(vx, v.y, vz), part.origin), off);
      });
      var proj = world.map(function (v) { return self.project(v); });

      part.geo.faces.forEach(function (f) {
        var a = world[f[0]], b = world[f[1]], c = world[f[2]];
        var nrm = norm(cross(sub(b, a), sub(c, a)));
        var lam = 0.42 + 0.58 * Math.max(0, dot(nrm, LIGHT));
        var depth = 0, d = '';
        for (var i = 0; i < f.length; i++) {
          var pp = proj[f[i]];
          depth += pp.z;
          d += (i ? 'L' : 'M') + pp.x.toFixed(1) + ' ' + pp.y.toFixed(1);
        }
        tris.push({
          d: d + 'Z',
          fill: shade(part.color, lam * (part.dim || 1)),
          depth: depth / f.length,
          op: part.opacity === undefined ? 1 : part.opacity
        });
      });
    });

    tris.sort(function (p, q) { return q.depth - p.depth; });

    /* reuse path nodes — rebuilding the DOM every frame is the slow way */
    var need = tris.length;
    while (this.pool.length < need) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('stroke-linejoin', 'round');
      this.group.appendChild(el);
      this.pool.push(el);
    }
    for (var i = 0; i < this.pool.length; i++) {
      var node = this.pool[i];
      if (i < need) {
        var t = tris[i];
        node.setAttribute('d', t.d);
        node.setAttribute('fill', t.fill);
        node.setAttribute('opacity', t.op);
        node.removeAttribute('display');
      } else {
        node.setAttribute('display', 'none');
      }
    }
    this.faceCount = need;
  };

  Scene.prototype.anchorOf = function (part) {
    var off = scale(part.dir, this.explode * (part.spread === undefined ? 1 : part.spread));
    return this.project(add(part.origin, off));
  };

  global.M3 = {
    V: V, box: box, cyl: cyl, gear: gear, swapYZ: swapYZ, swapYX: swapYX,
    Scene: Scene, shade: shade
  };
})(window);
