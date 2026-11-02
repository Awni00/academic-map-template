"""Recover line + band series from a matplotlib figure embedded as vectors in a PDF page.

Finds each axes from its dashed grid lines, calibrates x and y against the
numeric tick labels (least squares), maps every coloured line's vertices to
data units, reads the matching translucent band (fill_between) as its min/max
at each x, and names series from the legend entry next to their colour.

Run:
  uv run --with pymupdf python scripts/figures/extract_curves.py FILE.pdf PAGE [--clip x0,y0,x1,y1]

Prints CSV to stdout: panel,series,color,x,y,lo,hi (panel is the title text above the axes).
"""
import argparse
import csv
import sys
import unicodedata

import pymupdf

ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("page", type=int)
ap.add_argument("--clip", help="only consider axes inside x0,y0,x1,y1")
ap.add_argument("--digits", type=int, default=4)
args = ap.parse_args()

page = pymupdf.open(args.pdf)[args.page]
clip = [float(v) for v in args.clip.split(",")] if args.clip else None
drawings = page.get_drawings()


def points(d):
    out = []
    for item in d["items"]:
        for q in item[1:]:
            if hasattr(q, "x"):
                out.append((q.x, q.y))
    return out


def is_black(c):
    return c is not None and max(c) < 0.05


# Text lines with spans merged ("0", ".", "6" -> "0.6").
lines = []
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        text = unicodedata.normalize("NFKC", "".join(s["text"] for s in line["spans"])).strip()
        if text:
            lines.append((text, pymupdf.Rect(line["bbox"])))


def number(t):
    try:
        return float(t.replace("−", "-"))
    except ValueError:
        return None


# Grid lines: dashed black two-point segments.
vgrid, hgrid = [], []
for d in drawings:
    if d.get("dashes") and d["dashes"].strip() not in ("[] 0", "") and is_black(d.get("color")):
        p = points(d)
        if len(p) == 2:
            (x0, y0), (x1, y1) = p
            if abs(x0 - x1) < 0.01:
                vgrid.append((x0, min(y0, y1), max(y0, y1)))
            elif abs(y0 - y1) < 0.01:
                hgrid.append((y0, min(x0, x1), max(x0, x1)))

# Axes = distinct (x-extent of horizontal grids) x (y-extent of vertical grids).
axes = []
for xr in sorted({(round(a, 2), round(b, 2)) for _, a, b in hgrid}):
    for yr in sorted({(round(a, 2), round(b, 2)) for _, a, b in vgrid}):
        vs = [x for x, a, b in vgrid if (round(a, 2), round(b, 2)) == yr and xr[0] - 0.1 <= x <= xr[1] + 0.1]
        hs = [y for y, a, b in hgrid if (round(a, 2), round(b, 2)) == xr and yr[0] - 0.1 <= y <= yr[1] + 0.1]
        if vs and hs:
            r = pymupdf.Rect(xr[0], yr[0], xr[1], yr[1])
            if clip and not pymupdf.Rect(*clip).contains(r):
                continue
            axes.append((r, sorted(vs), sorted(hs)))


def fit(pairs):
    n = len(pairs)
    mx = sum(p for p, _ in pairs) / n
    mv = sum(v for _, v in pairs) / n
    sxx = sum((p - mx) ** 2 for p, _ in pairs)
    a = sum((p - mx) * (v - mv) for p, v in pairs) / sxx
    b = mv - a * mx
    resid = max(abs(a * p + b - v) for p, v in pairs)
    return (lambda p: a * p + b), resid


# Legend boxes: light-grey stroked, white-filled rounded rects.
legend_boxes = []
for d in drawings:
    c, f = d.get("color"), d.get("fill")
    if c and f and min(f) > 0.99 and 0.7 < min(c) and max(c) < 0.9:
        legend_boxes.append(d["rect"])


def legend_map(box):
    out = {}
    for d in drawings:
        c = d.get("color")
        p = points(d)
        if d.get("fill") is None and c and not is_black(c) and 2 <= len(p) <= 4 and box.contains(d["rect"]):
            ys = {round(y, 2) for _, y in p}
            if len(ys) != 1:
                continue
            y = p[0][1]
            xend = max(x for x, _ in p)
            best = None
            for t, r in lines:
                if abs((r.y0 + r.y1) / 2 - y) < 2.5 and xend <= r.x0 <= xend + 12:
                    best = (r.x0, t) if best is None or r.x0 < best[0] else best
            # A label can be split over several text lines (spaces); join those on the row.
            row = sorted((r.x0, t) for t, r in lines if abs((r.y0 + r.y1) / 2 - y) < 2.5 and r.x0 >= xend and r.x1 <= box.x1 + 1)
            if row:
                out[tuple(round(v, 3) for v in c)] = " ".join(t for _, t in row)
    return out


writer = csv.writer(sys.stdout)
writer.writerow(["panel", "series", "color", "x", "y", "lo", "hi"])
for rect, vs, hs in axes:
    xpairs, ypairs = [], []
    for t, r in lines:
        v = number(t)
        if v is None:
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        if rect.y1 < r.y0 < rect.y1 + 12:
            gx = min(vs, key=lambda x: abs(x - cx))
            if abs(gx - cx) < 2.5:
                xpairs.append((gx, v))
        if rect.x0 - 25 < r.x1 < rect.x0:
            gy = min(hs, key=lambda y: abs(y - cy))
            if abs(gy - cy) < 2.5:
                ypairs.append((gy, v))
    fx, rx = fit(xpairs)
    fy, ry = fit(ypairs)
    above = [(t, r) for t, r in lines if rect.y0 - 14 < r.y1 <= rect.y0 + 0.5 and rect.x0 - 25 <= r.x0 and r.x1 <= rect.x1 + 25]
    nearest = max((r.y1 for _, r in above), default=0)
    title = " ".join(t for t, r in sorted(above, key=lambda l: l[1].x0) if r.y1 > nearest - 1.5)
    inside = [b for b in legend_boxes if rect.contains(b)]
    outside = [b for b in legend_boxes if not any(a[0].intersects(b) for a in axes)]
    names = legend_map((inside or outside)[0]) if (inside or outside) else {}
    print(f"# axes {tuple(round(v, 2) for v in rect)} title={title!r} xticks={xpairs} (resid {rx:.2g}) yticks={ypairs} (resid {ry:.2g}) legend={names}", file=sys.stderr)

    bands = {}
    for d in drawings:
        f = d.get("fill")
        if f and d.get("fill_opacity") is not None and d["fill_opacity"] < 0.5 and any(rect.x0 <= x <= rect.x1 and rect.y0 <= y <= rect.y1 for x, y in points(d)):
            bands.setdefault(tuple(round(v, 3) for v in f), []).extend(points(d))
    legend_rects = inside
    for d in drawings:
        c = d.get("color")
        p = points(d)
        if d.get("fill") is not None or not c or is_black(c) or len(p) < 2 or d.get("dashes", "").strip() not in ("[] 0", ""):
            continue
        if not all(rect.x0 - 0.5 <= x <= rect.x1 + 0.5 and rect.y0 - 0.5 <= y <= rect.y1 + 0.5 for x, y in p) or any(b.contains(d["rect"]) for b in legend_rects):
            continue
        key = tuple(round(v, 3) for v in c)
        verts = []
        for q in p:
            if not verts or abs(verts[-1][0] - q[0]) > 1e-6 or abs(verts[-1][1] - q[1]) > 1e-6:
                verts.append(q)
        band = bands.get(key, [])
        for x, y in verts:
            at = [by for bx, by in band if abs(bx - x) < 1e-3]
            lo = fy(max(at)) if at else ""
            hi = fy(min(at)) if at else ""
            r = lambda v: round(v, args.digits) if v != "" else ""
            writer.writerow([title, names.get(key, str(key)), "#%02x%02x%02x" % tuple(round(v * 255) for v in c), r(fx(x)), r(fy(y)), r(lo), r(hi)])
