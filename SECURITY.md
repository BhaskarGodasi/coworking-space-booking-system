# Security

## Historical Secret Exposure (resolved 2026-08-06)

During the Final Release Certification Audit, the following test/development
credentials were found to be permanently retrievable from this repository's
Git history, even though the corresponding files are no longer tracked on any
branch:

| Secret | Value exposed | Commits | File |
|---|---|---|---|
| Test database password | `password123` | `efddca2`, `e8b888b` | `backend/.env.test` |
| Test JWT signing secret | `test-jwt-secret-please-change-me-32chars` | `efddca2`, `e8b888b` | `backend/.env.test` |
| Test refresh-token secret | `test-refresh-secret-please-change-32ch` | `efddca2`, `e8b888b` | `backend/.env.test` |
| Postgres superuser password (pre-hardening) | `password123` | multiple commits up to the parent of `eb08273` | `docker-compose.yml` |

**Scope and impact.** All exposed values are test-tier or local-development
credentials only:

- The Postgres password protected only a local/CI-ephemeral database, never
  reachable from outside a developer's machine or a CI runner.
- The JWT/refresh secrets signed tokens for the `test` environment only
  (`NODE_ENV=test`); they were never used to sign a token accepted by any
  deployed environment.

No production credential, API key, or externally reachable secret was ever
committed to this repository.

**Remediation taken:**

1. `backend/.env.test` was removed from tracking (superseded by
   `backend/.env.test.example`, which contains only placeholders) prior to
   this audit.
2. `docker-compose.yml` now sources all Postgres credentials from `.env` via
   `env_file` + `${VAR}` substitution — no literal password appears in any
   tracked file.
3. All local credentials matching the leaked values (this developer's
   `backend/.env.test` and `.env`, both gitignored and never committed) have
   been rotated to new, randomly generated values.
4. The example/documentation files that echoed the leaked literal values —
   `backend/.env.test.example` and `4_Docker_DevOps.md`'s environment
   variable specification — have been updated to use the same
   `generate-a-secure-*-here` placeholder convention as `.env.example`,
   rather than a real-looking (and, in this case, previously-leaked) value.

**Git history was intentionally NOT rewritten** as part of this remediation,
per explicit instruction. History rewriting is a destructive, high-blast-radius
operation (it invalidates every clone and fork, and force-pushes are required
on every branch) and was judged not to be justified here given the exposed
values are test-tier only. If the project maintainers later decide the
exposure still warrants removal from history, the exact steps are:

### Steps to purge these values from history (not yet performed)

```bash
# 1. Install git-filter-repo (do not use the deprecated `git filter-branch`)
pip install git-filter-repo

# 2. From a fresh clone (never run filter-repo against your only copy):
git clone --mirror <repo-url> repo-mirror.git
cd repo-mirror.git

# 3. Strip backend/.env.test entirely from every commit that ever contained it
git filter-repo --path backend/.env.test --invert-paths

# 4. Additionally scrub the literal leaked strings from any remaining
#    commit content (e.g. the old docker-compose.yml diffs), using a
#    replacements file:
cat > replacements.txt <<'EOF'
password123==>REDACTED
test-jwt-secret-please-change-me-32chars==>REDACTED
test-refresh-secret-please-change-32ch==>REDACTED
EOF
git filter-repo --replace-text replacements.txt

# 5. Force-push the rewritten history to every remote branch
#    (coordinate with all contributors first -- this invalidates all
#    existing clones and requires everyone to re-clone):
git push --force --all
git push --force --tags

# 6. Have every contributor delete and re-clone their local copy rather
#    than pulling/rebasing onto the rewritten history.
```

Regardless of whether history is ever rewritten, the credentials themselves
are already rotated and no longer valid, so the historical commits retain
only dead values.

## Reporting a Vulnerability

If you discover a security issue in this project, please open an issue or
contact the maintainers directly rather than filing a public report until a
fix is available.
