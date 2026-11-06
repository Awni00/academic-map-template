# Repo Ownership

This template is easiest to maintain when template-owned files and site-owned
files stay separate.

## Template-Owned Paths

These paths define reusable behavior and should usually change in the template
repository first:

```txt
src/components/
src/layouts/
src/lib/
src/pages/
src/styles/
src/config/defaults/
src/dev/
scripts/
tests/
astro.config.ts
src/content.config.ts
package.json
package-lock.json
tsconfig.json
vitest.config.ts
playwright.config.ts
eslint.config.js
```

Use these paths for general features, layout improvements, graph behavior,
validation, routing, build configuration, and shared styling.

## Site-Owned Paths

These paths are intended to be edited in each website repository:

```txt
src/site/
src/content/
src/data/
public/profile.*
public/og-image.*
public/favicon.svg
public/apple-touch-icon.png
public/cv.pdf
public/site/
```

Use these paths for identity, navigation overrides, content, publications, news,
profile images, CV files, and personal static assets.

The template includes a complete starter demo in some site-owned paths. After a
site adopts the template, that starter material becomes the site's content. The
template should avoid changing starter content in future updates unless a schema
or feature change requires it.

## Local Divergence

A downstream site can edit template-owned files, but that is local divergence.
It may be worthwhile for a one-off personal design, but it makes future template
merges more likely to conflict.

Prefer this order:

1. Try to express the change in `src/site/config.ts`.
2. If the change is generally useful, implement it in the template repository.
3. Merge the template update into the downstream site.
4. Only edit template-owned files directly in a site when the change is truly
   site-specific and worth the merge cost.

## Conflict Policy

When syncing from the template:

- Favor the downstream site for `src/site/`, `src/content/`, `src/data/`, and
  personal public assets.
- Favor the template for shared components, layouts, library code, scripts,
  tests, and defaults.
- When a template update requires content changes, make the content changes in a
  separate follow-up commit so they are easy to review.
