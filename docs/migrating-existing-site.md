# Migrating An Existing Site

Use this workflow when an existing website repository already has history and
you want to replace its implementation with this template while keeping the old
site available on an archive branch.

This is the cleanest route when you are comfortable replacing the default branch
with the template lineage.

## Archive The Old Site

In the existing website repository:

```bash
git checkout main
git pull origin main
git branch archive/old-site-YYYY-MM-DD
git push origin archive/old-site-YYYY-MM-DD
```

The archive branch preserves the old implementation and history.

## Replace Main With Template History

Add the template as a remote and reset `main` to the template branch:

```bash
git remote add template git@github.com:OWNER/academic-map-template.git
git fetch template
git checkout -B main template/main
git push --force-with-lease origin main
```

This makes future template syncing straightforward because the website now
shares history with the template.

## Port Content

Use a worktree or a second checkout to read from the archived site while editing
the new template-based site:

```bash
git worktree add ../old-site archive/old-site-YYYY-MM-DD
git checkout -b migrate/site-content
```

Move content into the new structure:

```txt
Old durable pages      -> src/content/pages/
Old posts/notes        -> src/content/writing/
Old publication data   -> src/data/publications.yaml (npm run publications:from-bib converts a .bib)
Old news/updates       -> src/data/news.yaml
Old profile/CV/assets  -> public/
Personal config        -> src/site/config.ts
```

Do not preserve old URLs unless the site requires it. If stable old URLs matter,
add redirects or compatibility pages as part of the migration branch.

## Validate The Migration

Run:

```bash
npm install
npm run validate
npm run build
npm run test
```

Then open a pull request from `migrate/site-content` into `main`.

## Future Sync

After migration, use the routine upstream sync workflow:

```bash
git fetch template
git checkout -b sync/template-YYYY-MM-DD
git merge template/main
npm run validate
npm run build
npm run test
```

See [Syncing With The Template](syncing-with-template.md).
