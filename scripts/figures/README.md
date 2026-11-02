# Figure tools

Optional Python helpers for recovering chart data from vector PDFs, for
`<Chart>`. Run them with [uv](https://docs.astral.sh/uv/); nothing is
installed into the project.

| Script              | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `dump_pdf_paths.py` | Prints every vector path and text span on a PDF's first page.       |
| `extract_curves.py` | Recovers line-and-band series from a matplotlib figure, as CSV.     |

```bash
uv run --with pymupdf python scripts/figures/dump_pdf_paths.py FIGURE.pdf
```

Scripts for one post's data go in `scripts/figures/<post>/`.

Ownership: template-owned (the per-post folders are the site's). See
[Figures](../../docs/figures.md) for the figure system, data provenance and
how to use these tools.
