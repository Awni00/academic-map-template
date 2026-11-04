# Public Assets

This directory contains static assets copied directly into the built site.

Ownership: mixed. Downstream sites own personal assets such as `profile.*`,
`og-image.*`, `cv.pdf`, `public/site/`, and content or publication assets.
Generic template assets, if added here, should be maintained upstream.
`public/dev/` holds files for the dev-only pages; it is removed from `dist/`
after every build.

When syncing from the template, preserve site-specific public assets unless a
template change explicitly requires a compatible asset update.

See [Repo Ownership](../docs/repo-ownership.md) for the full policy.
