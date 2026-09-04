#!/usr/bin/env python3
"""
Generates the axonometric machine drawing for the Austek landing page and
injects it into index.html between the MACHINE:BEGIN / MACHINE:END markers.

World axes:  X along the vessel,  Z across the skid,  Y up.
Projection:  standard 30 degree isometric.
"""
import math, re, pathlib

C, S = math.cos(math.radians(30)), math.sin(math.radians(30))
OX, OY = 700.0, 720.0

def P(x, y, z):
    return ((x - z) * C + OX, (x + z) * S - y + OY)

def f(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def pt(p): return '%s %s' % (f(p[0]), f(p[1]))

def poly(points, cls, closed=True, extra=''):
    d = 'M' + ' L'.join(pt(p) for p in points) + (' Z' if closed else '')
    return '<path class="%s" d="%s"%s/>' % (cls, d, extra)

def ring(xc, r, cls, n=56, y0=250.0, z0=0.0, closed=True, arc=(0, 360)):
    """circle in the Y/Z plane at station xc — the vessel's cross-section"""
    a0, a1 = math.radians(arc[0]), math.radians(arc[1])
    pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        pts.append(P(xc, y0 + math.sin(a) * r, z0 + math.cos(a) * r))
    return poly(pts, cls, closed)

def line(p1, p2, cls):
    return '<path class="%s" d="M%s L%s"/>' % (cls, pt(p1), pt(p2))

def circle2d(cx, cy, r, cls):
    return '<circle class="%s" cx="%s" cy="%s" r="%s"/>' % (cls, f(cx), f(cy), f(r))

def box(x0, x1, y0, y1, z0, z1, cls):
    """axonometric box — three visible faces"""
    o = []
    top = [P(x0,y1,z0), P(x1,y1,z0), P(x1,y1,z1), P(x0,y1,z1)]
    left = [P(x0,y0,z1), P(x1,y0,z1), P(x1,y1,z1), P(x0,y1,z1)]
    right = [P(x1,y0,z0), P(x1,y0,z1), P(x1,y1,z1), P(x1,y1,z0)]
    for face in (top, left, right):
        o.append(poly(face, cls))
    return o

# ─────────────────────────────────────────────────────── vessel geometry ──
VX0, VX1, R, YC = -300.0, 300.0, 150.0, 250.0

out = {i: [] for i in range(1, 9)}

# ── 01 · setting out ──────────────────────────────────────────────────────
g = out[1]
for i in range(-4, 5):                                   # ground grid
    g.append(line(P(i*100, 0, -260), P(i*100, 0, 260), 'm-grid'))
    g.append(line(P(-440, 0, i*65), P(440, 0, i*65), 'm-grid'))
g.append(line(P(VX0-120, YC, 0), P(VX1+120, YC, 0), 'm-cl'))      # axis
g.append(line(P(0, YC-R-70, 0), P(0, YC+R+70, 0), 'm-cl'))
for x in (VX0, VX1):                                     # extension lines
    g.append(line(P(x, 0, 250), P(x, 0, 330), 'm-dim'))
g.append(line(P(VX0, 0, 320), P(VX1, 0, 320), 'm-dim'))
p = P(0, 0, 350)
g.append('<text class="m-dimt" x="%s" y="%s" text-anchor="middle">6 000 T/T</text>' % (f(p[0]), f(p[1])))
p = P(VX1+150, YC, 0)
g.append('<text class="m-dimt" x="%s" y="%s">OD 3 000</text>' % (f(p[0]), f(p[1])))

# ── 02 · rolled shell + dished ends ───────────────────────────────────────
g = out[2]
for i in range(17):                                      # cross-section rings
    x = VX0 + (VX1 - VX0) * i / 16
    g.append(ring(x, R, 'm-ring' if i % 4 else 'm-ring m-ring--major'))
for k in range(16):                                      # generatrices
    a = math.radians(k * 22.5)
    y, z = YC + math.sin(a) * R, math.cos(a) * R
    g.append(line(P(VX0, y, z), P(VX1, y, z), 'm-gen'))
for j in range(1, 7):                                    # dished ends
    t = j / 7.0
    rr = R * math.sqrt(max(0.0, 1 - t * t))
    g.append(ring(VX0 - t * 78, rr, 'm-ring'))
    g.append(ring(VX1 + t * 78, rr, 'm-ring'))
g.append(ring(VX0, R, 'm-edge'))
g.append(ring(VX1, R, 'm-edge'))

# ── 03 · welded out ───────────────────────────────────────────────────────
g = out[3]
for x in (VX0 + 200, VX0 + 400):                         # circumferential seams
    g.append(ring(x, R + 1.5, 'm-seam'))
seam = []                                                # longitudinal seam
for i in range(41):
    x = VX0 + (VX1 - VX0) * i / 40
    seam.append(P(x, YC + R + 2, 0))
g.append(poly(seam, 'm-seam', closed=False))
for i in range(34):                                      # weld cap ripples
    x = VX0 + (VX1 - VX0) * i / 33
    a, b = P(x, YC + R + 7, -9), P(x, YC + R + 7, 9)
    g.append('<path class="m-bead" d="M%s Q %s %s"/>' % (pt(a), pt(P(x + 9, YC + R + 13, 0)), pt(b)))

# ── 04 · skid frame + saddles ─────────────────────────────────────────────
g = out[4]
for z in (-170, 170):                                    # longitudinal rails
    g += box(-420, 420, 0, 34, z - 16, z + 16, 'm-face')
for i in range(7):                                       # cross members
    x = -420 + 140 * i
    g += box(x - 12, x + 12, 4, 26, -170, 170, 'm-face')
for x in (-180.0, 180.0):                                # saddles
    for j in range(9):                                   # saddle ribs
        a = math.radians(180 + 22.5 * j)
        g.append(line(P(x, 34, math.cos(a) * R * 0.98),
                      P(x, YC + math.sin(a) * R, math.cos(a) * R), 'm-rib'))
    g.append(ring(x, R + 4, 'm-saddle', arc=(180, 360)))
    g += box(x - 26, x + 26, 0, 34, -R, R, 'm-face')
for zx in (-400, 400):                                   # anchor bolts
    for zz in (-170, 170):
        g.append(circle2d(*P(zx, 36, zz), 5, 'm-bolt'))

# ── 05 · nozzles, manway, bolt circles ────────────────────────────────────
g = out[5]
def nozzle(x, z, h, r, bolts=8):
    o, ang = [], math.atan2(YC, 0)
    base_y = YC + math.sqrt(max(R*R - z*z, 1))
    for j in range(5):
        o.append(ring(x, r, 'm-noz', n=28, y0=base_y + h * j / 4, z0=z))
    o.append(line(P(x - r, base_y, z), P(x - r, base_y + h, z), 'm-noz'))
    o.append(line(P(x + r, base_y, z), P(x + r, base_y + h, z), 'm-noz'))
    o.append(ring(x, r * 1.55, 'm-flange', n=32, y0=base_y + h, z0=z))
    o.append(ring(x, r * 1.9, 'm-flange', n=32, y0=base_y + h + 8, z0=z))
    for b in range(bolts):
        a = 2 * math.pi * b / bolts
        o.append(circle2d(*P(x + math.cos(a) * r * 1.72, base_y + h + 8, z + math.sin(a) * r * 1.72), 3.6, 'm-bolt'))
    return o
g += nozzle(-150, 0, 60, 26)
g += nozzle(60, 0, 74, 32, 10)
g += nozzle(210, 0, 52, 20)
for j in range(4):                                       # manway
    g.append(ring(VX1 + 84 + j * 5, R * 0.46, 'm-flange', n=40))
for b in range(16):
    a = 2 * math.pi * b / 16
    g.append(circle2d(*P(VX1 + 99, YC + math.sin(a) * R * 0.55, math.cos(a) * R * 0.55), 4.4, 'm-bolt'))
g.append(ring(VX1 + 99, R * 0.36, 'm-noz', n=40))

# ── 06 · pipework + valve ─────────────────────────────────────────────────
g = out[6]
run = [P(60, YC - R, 0), P(60, 96, 0), P(60, 96, 250), P(330, 96, 250), P(330, 60, 250)]
g.append(poly(run, 'm-pipe', closed=False))
for i in range(1, len(run)):                             # pipe wall offset
    pass
for spot, ax in ((P(60, 150, 0), 1), (P(60, 96, 150), 0), (P(250, 96, 250), 0)):
    for d in (-7, 7):
        g.append('<path class="m-fl" d="M%s L%s"/>' % (
            pt((spot[0] - 22, spot[1] + d)), pt((spot[0] + 22, spot[1] + d))))
    for b in range(6):
        a = 2 * math.pi * b / 6
        g.append(circle2d(spot[0] + math.cos(a) * 17, spot[1] + math.sin(a) * 10, 2.6, 'm-bolt'))
hw = P(60, 200, 0)                                       # valve handwheel
g.append('<ellipse class="m-noz" cx="%s" cy="%s" rx="34" ry="17"/>' % (f(hw[0]), f(hw[1])))
g.append('<ellipse class="m-noz" cx="%s" cy="%s" rx="22" ry="11"/>' % (f(hw[0]), f(hw[1])))
for b in range(8):
    a = 2 * math.pi * b / 8
    g.append(line((hw[0], hw[1]), (hw[0] + math.cos(a) * 34, hw[1] + math.sin(a) * 17), 'm-spoke'))
g.append(line(P(60, 150, 0), P(60, 200, 0), 'm-noz'))

# ── 07 · pump, motor, drive ───────────────────────────────────────────────
g = out[7]
g += box(280, 400, 34, 96, 200, 300, 'm-face')           # pump body
g += box(150, 280, 34, 110, 205, 295, 'm-face')          # motor
for i in range(14):                                      # cooling fins
    x = 155 + i * 9
    g.append(line(P(x, 110, 205), P(x, 110, 295), 'm-fin'))
    g.append(line(P(x, 34, 205), P(x, 110, 205), 'm-fin'))
for j in range(5):                                       # coupling guard
    g.append(ring(280 + j * 5, 30, 'm-noz', n=24, y0=72, z0=250))
g.append(line(P(400, 65, 250), P(430, 65, 250), 'm-noz'))
for b in range(8):                                       # pump flange
    a = 2 * math.pi * b / 8
    g.append(circle2d(*P(400, 65 + math.sin(a) * 26, 250 + math.cos(a) * 26), 3.2, 'm-bolt'))

# ── 08 · access, platform, instruments ────────────────────────────────────
g = out[8]
PY_ = YC + R + 16
for z in (-96, 96):                                      # platform stringers
    g.append(line(P(-210, PY_, z), P(250, PY_, z), 'm-rail'))
for i in range(24):                                      # grating
    x = -210 + i * 20
    g.append(line(P(x, PY_, -96), P(x, PY_, 96), 'm-grate'))
for i in range(9):                                       # handrail posts
    x = -210 + i * 57.5
    g.append(line(P(x, PY_, 96), P(x, PY_ + 88, 96), 'm-rail'))
for h in (44, 88):                                       # rails
    g.append(line(P(-210, PY_ + h, 96), P(250, PY_ + h, 96), 'm-rail'))
g.append(line(P(-210, PY_ + 88, -96), P(250, PY_ + 88, -96), 'm-rail'))
for i in range(15):                                      # ladder rungs
    y = 20 + i * 26
    g.append(line(P(-250, y, -60), P(-250, y, -20), 'm-rung'))
for z in (-60, -20):                                     # stringers
    g.append(line(P(-250, 10, z), P(-250, PY_ + 40, z), 'm-rail'))
for j in range(6):                                       # cage hoops
    y = 150 + j * 60
    g.append(ring(-250, 46, 'm-cage', n=22, y0=y, z0=-40, arc=(200, 340)))
gp = P(210, YC + R + 96, 0)                              # gauge
g.append('<circle class="m-gauge" cx="%s" cy="%s" r="30"/>' % (f(gp[0]), f(gp[1])))
for t in range(24):
    a = math.radians(t * 15)
    r0 = 24 if t % 3 else 20
    g.append(line((gp[0] + math.cos(a) * r0, gp[1] + math.sin(a) * r0),
                  (gp[0] + math.cos(a) * 29, gp[1] + math.sin(a) * 29), 'm-tick'))
g.append('<path class="m-needle" id="mNeedle" d="M%s L%s"/>' % (pt(gp), pt((gp[0], gp[1] - 24))))
g.append(circle2d(gp[0], gp[1], 3, 'm-bolt'))
for lbl, wp in (('PT-01', P(250, YC + R + 130, 0)), ('P-101', P(220, 130, 250)),
                ('V-201', P(60, 236, 0)), ('AUSTEK ENGINEERING CC', P(-380, 70, 190))):
    g.append('<text class="m-tag" x="%s" y="%s">%s</text>' % (f(wp[0] + 12), f(wp[1]), lbl))

# ─────────────────────────────────────────────────────────────── assemble ──
NAMES = ['setting out', 'rolled shell', 'welded out', 'skid frame',
         'nozzles and manway', 'pipework', 'pump and drive', 'access and instruments']
parts = ['<svg id="machineSvg" viewBox="0 0 1400 1060" preserveAspectRatio="xMidYMid meet">']
parts.append('''  <defs>
    <radialGradient id="mHeat">
      <stop offset="0%" stop-color="#fff3d6" stop-opacity=".95"/>
      <stop offset="35%" stop-color="#ffcf7a" stop-opacity=".45"/>
      <stop offset="100%" stop-color="#ff7b3a" stop-opacity="0"/>
    </radialGradient>
  </defs>''')
total = 0
for i in range(1, 9):
    parts.append('  <!-- %02d · %s -->' % (i, NAMES[i - 1]))
    parts.append('  <g class="ph" id="ph%d">' % i)
    for el in out[i]:
        parts.append('    ' + el)
    total += len(out[i])
    if i == 3:
        parts.append('    <circle class="m-arc" id="mArc" cx="%s" cy="%s" r="34" fill="url(#mHeat)" opacity="0"/>'
                     % (f(P(VX0, YC + R, 0)[0]), f(P(VX0, YC + R, 0)[1])))
    parts.append('  </g>')
parts.append('</svg>')
svg = '\n'.join(parts)

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
new = re.sub(r'(<!-- MACHINE:BEGIN -->).*?(<!-- MACHINE:END -->)',
             lambda m: m.group(1) + '\n' + svg + '\n    ' + m.group(2),
             html, flags=re.S)
if new == html:
    new = html.replace('<svg id="machineSvg"', '<!-- MACHINE:BEGIN -->\n' + svg + '\n<!-- MACHINE:END -->\n<svg id="OLD_machineSvg"', 1)
(root / 'index.html').write_text(new)
print('generated %d drawn elements across 8 phases' % total)
