# Migration Immutability

Prisma tracks applied migrations by a checksum of each `migration.sql` file's
exact byte content, recorded in the `_prisma_migrations` table. Once a
migration has been applied anywhere (a developer's machine, CI, staging,
production), its `migration.sql` file must never be edited again — doing so
changes the checksum and causes `prisma migrate deploy` / `migrate status` to
report drift (`P3005`) on any environment that already applied the original
version.

## Known violation: `20260806063730_add_space_capacity_check`

This migration was first committed in `199b94d` with a comment that
inaccurately claimed a `Booking.start_time < end_time` CHECK constraint was
"documented to be enforced" (no such constraint exists; that validation is
application-layer only). A later commit (`eb08273`) corrected the comment
in place, editing an already-applied migration file — a violation of the
immutability rule above. The `ALTER TABLE` statement itself was never
changed, only a comment, so the schema effect is identical either way, but
the file's checksum did change.

**Why this was not reverted or re-edited again as part of this
remediation:** doing so would not undo the drift risk for any environment
that already applied the `eb08273` version — it would just reintroduce
the inaccurate comment while still leaving a second checksum change in
history. The corrected comment is accurate and harmless going forward, so
it has been left as-is. This entry exists so the one-time violation is
documented rather than silently repeated or hidden.

**If `prisma migrate deploy` / `migrate status` reports drift on this
migration** on any environment (typically: "migration X was modified after
it was applied"), resolve it with:

```bash
# Confirm the current schema already matches what the migration produces
# (it does, in this case -- the CHECK constraint was never changed):
npx prisma migrate status

# Mark the migration as applied/resolved without re-running it, since the
# actual schema is already correct:
npx prisma migrate resolve --applied 20260806063730_add_space_capacity_check
```

## Going forward

Any future correction to an **already-applied** migration's file (comment
fixes included) must instead be made via one of:

- A new, additive migration if a schema or data change is actually needed.
- A plain doc/comment note left in this directory (as here) if only the
  historical record needs correcting, leaving the original file untouched.

Never edit the SQL file of a migration that has already been applied
anywhere.
