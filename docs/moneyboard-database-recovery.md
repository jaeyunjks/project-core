# Moneyboard database recovery runbook

This runbook is intentionally split into an isolated rehearsal and a later,
separately approved original-database change. Never substitute the configured
original `DATABASE_URL` for an isolated target.

## Safety gates

1. Record the original Neon project, branch ID, endpoint hostname, database
   name, and current schema version without printing credentials.
2. Create a named Neon branch from the original and record the new branch ID
   and endpoint hostname. Confirm that its credential-free identity differs
   from the original before any write-capable command.
3. Create an independent custom-format PostgreSQL dump of the original with
   `pg_dump --format=custom --no-owner --no-acl`. Store it outside the
   repository with owner-only permissions and record its SHA-256 digest.
4. Restore that dump into a second isolated PostgreSQL database, run
   `pg_restore --list`, capture the recovery manifest, and confirm it matches
   the read-only manifest captured from the original. A Neon branch alone is
   not the backup.
5. Stop if the backup cannot be restored, the target identity is ambiguous, or
   any manifest count/hash/totals differ.

The manifest command reads data but emits only counts, aggregate values, and
hashes. Set `RECOVERY_DATABASE_URL` for the intended source or isolated target
in the command process; do not edit the application's `.env` file:

```sh
RECOVERY_DATABASE_URL="$ORIGINAL_DATABASE_URL" \
npm run db:recovery:manifest -- --out /secure/path/baseline.json
```

## Isolated branch rehearsal

The historical schema on the cloned branch must first be compared with the
state represented by the initial migration plus
`20261028000000_pre_expansion_bridge`. Verify tables, columns, defaults,
indexes, foreign keys, and row relationships before resolving either migration.
Do not resolve a migration merely because its objects appear similar.

After that comparison succeeds, target only the confirmed branch URL in the
current shell and run:

```sh
DATABASE_URL="$ISOLATED_BRANCH_URL" npx prisma migrate resolve --applied 20260625062306_init
DATABASE_URL="$ISOLATED_BRANCH_URL" npx prisma migrate resolve --applied 20261028000000_pre_expansion_bridge
DATABASE_URL="$ISOLATED_BRANCH_URL" npx prisma migrate deploy
npx prisma generate
```

Capture the post-migration manifest and run the guarded database suite. The
suite refuses a target whose credential-free identity matches `DATABASE_URL`:

```sh
MONEYBOARD_ISOLATED_DATABASE=CONFIRMED \
TEST_DATABASE_URL="$ISOLATED_BRANCH_URL" \
RECOVERY_BASELINE_MANIFEST=/secure/path/baseline.json \
npm run test:db
```

Then run a Prisma drift comparison from the isolated branch to
`prisma/schema.prisma`. Expected output is an empty migration. Also exercise an
authenticated browser session for dashboard loading, transaction edit/delete,
fortnight navigation, budget calculations, accounts/transfers/bills/savings,
and HoursBoard. The automated suite validates the underlying dashboard,
fortnight, history, and transaction-edit database paths, but does not replace
that browser check.

## Later original-database execution (requires explicit approval)

1. Announce a maintenance window and stop application writes.
2. Capture a fresh manifest and fresh independently restorable dump; verify the
   restore and digest again.
3. Repeat the structural comparison for the exact original target.
4. Resolve only the initial and bridge migrations after their structures are
   proven present.
5. Run `prisma migrate deploy`; the expansion migration is additive and wrapped
   in a PostgreSQL transaction.
6. Regenerate the client and release only the application version matching the
   expanded schema.
7. Capture and compare the post-migration manifest before reopening writes.
8. Run the database suite, drift check, and authenticated smoke tests.

If deployment fails before commit, PostgreSQL rolls the expansion back. If any
post-commit data comparison fails, keep writes stopped, preserve the failed
database for diagnosis, restore the verified dump to a new isolated database,
verify its manifest, and repoint only after an explicit recovery decision. The
old application remains schema-compatible with the additive expansion, but the
new application must not run against the old schema.
