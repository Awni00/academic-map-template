2026-08-09 16:01 | human | create | Task created (t-20260809-C99S)
2026-08-15 20:56 | human | plan | Task started
2026-08-15 21:06 | agent | update | Config+schema+layout+styles landed. Found and fixed a pre-existing template bug: the documented 'layout:' frontmatter key is reserved by @astrojs/mdx (emits 'import __astro_layout_component__ from <value>'), so any .mdx using it failed the build. Renamed the key to 'article:' across schema, placement.ts, toc.ts, validate.ts, and tests.
2026-08-15 21:17 | agent | update | Verified: lint clean, 44 unit tests, validate 0 warnings, astro build green (22 pages), 16 e2e tests. Added e2e guard for the abstract layout + the article frontmatter key. Fixed commentary flush-bottom bug caught in visual review.
2026-08-15 21:17 | human | complete | Task marked completed
