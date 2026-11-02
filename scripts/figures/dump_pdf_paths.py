"""Dump the vector paths and text spans on page 1 of a matplotlib PDF.

Used to recover figure data from published PDFs: find the axis frame and
tick-label positions in the output, then map path coordinates back to data
units. Record the result in src/data/figures/<post>/provenance.yaml as
`vector-extracted` (see docs/figures.md).

Run: uv run --with pymupdf python scripts/figures/dump_pdf_paths.py FILE.pdf

Each path prints as: C <stroke rgb> F <fill rgb> W <width> D <dashes> <n> <points>
Each text span prints as: T <text> <bbox>
"""
import sys

import pymupdf

page = pymupdf.open(sys.argv[1])[0]

for d in page.get_drawings():
    pts = []
    for item in d["items"]:
        for q in item[1:]:
            if hasattr(q, "x"):
                pts.append((round(q.x, 2), round(q.y, 2)))
            elif hasattr(q, "x0"):
                pts.append(((round(q.x0, 2), round(q.y0, 2)), (round(q.x1, 2), round(q.y1, 2))))
    print("C", d.get("color"), "F", d.get("fill"), "W", d.get("width"), "D", d.get("dashes"), len(pts), pts)

for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            print("T", repr(span["text"]), [round(v, 1) for v in span["bbox"]])
