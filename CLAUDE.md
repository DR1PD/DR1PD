# Project rules — DR1PD.com

## HARD RULE: no destructive shell commands. Ever.
Never give the user a command that deletes, wipes, resets, or force-overwrites files or folders.
That includes (non-exhaustive): `rm -rf`, `rm -r`, `find … -exec rm`, `find … -delete`, `git clean`,
`git reset --hard`, `git checkout -- .`, `git push --force`, `rmdir`, `mv` over existing paths, `> file` truncation,
`sudo` anything, `diskutil`, `tmutil delete`.

- Never chain a `cd` (or any path-dependent step) to a delete on the same line or in the same block.
- Never give placeholder paths (`~/path/to/repo`) in any command block — only literal, real paths or none.
- If a cleanup is truly needed, tell the user to do it by hand in Finder (drag to Trash) — never via Terminal.
- Deploys: instruct copy-over only (`cp -R src/. dest/` into a clean folder the user created), then `git add -A`, `git commit`, `git push`. Git handles removals of stale files on its own.

## Deploy folder
- `gh-pages-export/` is the deployable site (`.nojekyll`, `CNAME`, `index.html`, `q/ c/ r/`).
- Every edit to a `.dc.html` page must be mirrored into its export copy in the same turn.
