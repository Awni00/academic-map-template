# Library Code

This directory contains shared implementation logic for articles, graph building,
math rendering, homepage news, publications, routes, search, and wikilinks.

Ownership: template-owned. Downstream sites should usually influence this logic
through config, content, and data. Direct edits are local divergence unless the
change is made upstream.

Subdirectories group utilities by domain: `article/`, `graph/`, `math/`,
`news/`, `publications/`, `routes/`, `search/`, and `wikilinks/`.

See [Repo Ownership](../../docs/repo-ownership.md) for the full policy.
