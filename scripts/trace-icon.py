"""Trace the Agate icon geometry from a photo of an agate slice.

Run once when the source photo changes:
    pip install opencv-python-headless numpy
    python3 scripts/trace-icon.py path/to/agate.png

Writes scripts/icon-trace.json, which scripts/gen-icon.mjs turns into the SVGs.

What it traces (all in a 100x100 box, aspect ratio kept):
  outer  - silhouette of the slice (non-white pixels)
  cavity - inner edge of the banded zone (dark region around the core)
  eye    - the small pale quadrilateral at the centre
Each contour is low-pass filtered with a Fourier series so the shape keeps its
lopsided outline but loses pixel jitter. outer and cavity are then sampled on
the same set of rays from the eye, so bands can be drawn by interpolating
between them point by point.
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else "agate.png"
OUT = Path(__file__).with_name("icon-trace.json")
RAYS = 60          # samples per band curve
HARMONICS = {"outer": 9, "cavity": 7, "eye": 3}


def biggest_contour(mask):
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return max(cs, key=cv2.contourArea)[:, 0, :].astype(float)


def component_at(mask, x, y):
    _, lbl = cv2.connectedComponents(mask)
    return ((lbl == lbl[y, x]) & (lbl > 0)).astype(np.uint8) * 255


def fourier_smooth(pts, k, n=720):
    # resample by arc length, keep the first k harmonics
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([pts, pts[:1]]), axis=0).T))]
    t = np.linspace(0, d[-1], n, endpoint=False)
    closed = np.vstack([pts, pts[:1]])
    z = np.interp(t, d, closed[:, 0]) + 1j * np.interp(t, d, closed[:, 1])
    F = np.fft.fft(z)
    keep = np.zeros_like(F)
    keep[: k + 1] = F[: k + 1]
    keep[-k:] = F[-k:]
    z = np.fft.ifft(keep)
    return np.c_[z.real, z.imag]


def ray_hits(curve, c, angles):
    # farthest intersection of each ray from c with the closed polyline
    a, b = curve, np.roll(curve, -1, axis=0)
    out = []
    for th in angles:
        u = np.array([np.cos(th), np.sin(th)])
        best = 0.0
        for p, q in zip(a, b):
            e = q - p
            den = u[0] * (-e[1]) + u[1] * e[0]
            if abs(den) < 1e-12:
                continue
            w = p - c
            r = (w[0] * (-e[1]) + w[1] * e[0]) / den
            s = (u[0] * w[1] - u[1] * w[0]) / den
            if 0 <= s <= 1 and r > best:
                best = r
        out.append(c + best * u)
    return np.array(out)


im = cv2.imread(SRC)
if im is None:
    sys.exit(f"cannot read {SRC}")
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
L = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)

# silhouette: everything that is not near-white background
stone = (~((hsv[..., 1] < 25) & (hsv[..., 2] > 225))).astype(np.uint8) * 255
stone = cv2.morphologyEx(stone, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
outer = biggest_contour(stone)
stone = np.zeros_like(stone)
cv2.drawContours(stone, [outer.astype(np.int32)[:, None, :]], -1, 255, -1)

# eye: bright blob nearest the stone's centroid-ish core
blur = cv2.GaussianBlur(L, (0, 0), 3)
M = cv2.moments(stone)
cx, cy = M["m10"] / M["m00"], M["m01"] / M["m00"]
bright = ((L > 170) & (stone > 0)).astype(np.uint8) * 255
bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
n, lbl, st, cen = cv2.connectedComponentsWithStats(bright)
cand = [i for i in range(1, n) if 40 < st[i, cv2.CC_STAT_AREA] < 3000]
eye_id = min(cand, key=lambda i: np.hypot(cen[i][0] - cx, cen[i][1] - cy))
eye_mask = (lbl == eye_id).astype(np.uint8) * 255
cs, _ = cv2.findContours(eye_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
eye = cs[0][:, 0, :].astype(float)
ex, ey = cen[eye_id]

# cavity: dark region containing the eye, inside the bands
dark = ((blur < 95) & (stone > 0)).astype(np.uint8) * 255
dark = cv2.bitwise_or(dark, cv2.dilate(eye_mask, np.ones((9, 9), np.uint8)))
dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
cavity = biggest_contour(component_at(dark, int(ex), int(ey)))

outer_s = fourier_smooth(outer, HARMONICS["outer"])
cavity_s = fourier_smooth(cavity, HARMONICS["cavity"])
eye_s = fourier_smooth(eye, HARMONICS["eye"], n=240)

c = np.array([ex, ey])
angles = np.linspace(-np.pi, np.pi, RAYS, endpoint=False)
outer_r = ray_hits(outer_s, c, angles)
cavity_r = ray_hits(cavity_s, c, angles)
eye_r = ray_hits(eye_s, c, np.linspace(-np.pi, np.pi, 16, endpoint=False))

# fit into 100x100 with a small margin, aspect kept
x0, y0 = outer_s.min(0)
x1, y1 = outer_s.max(0)
scale = 96 / max(x1 - x0, y1 - y0)
off = np.array([50 - (x0 + x1) / 2 * scale, 50 - (y0 + y1) / 2 * scale])
fit = lambda p: np.round(p * scale + off, 2).tolist()

OUT.write_text(json.dumps({
    "source": Path(SRC).name,
    "outer": fit(outer_r),
    "cavity": fit(cavity_r),
    "eye": fit(eye_r),
}, indent=None) + "\n")
print("wrote", OUT)
